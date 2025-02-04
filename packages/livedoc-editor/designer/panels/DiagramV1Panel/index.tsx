import React from 'react'
import { ViewEditor } from '../../editor'
import { PanelComponent, PanelDescriptor } from '@livedoc/editor/ui/FeaturesLayout'
import { DocumentModel, DocumentLayer, DXElement, getElementConsumers } from '@livedoc/core'
import { MutGraphNode } from 'd3-dag'
import * as DAGLayout from 'd3-dag'
import Icon from '@livedoc/ui/Icon'
import './index.scss'

const block_base_height = 30
const block_base_width = 100
const port_gap = 20

class DiagramPort {
   name: string = ""
   block: DiagramBlock
   links: DiagramLink[] = []

   X: number = 0
   Y: number = 0
}

class DiagramBlock {
   name: string = ""
   operator: DXElement

   ports_in: DiagramPort[] = []
   ports_out: DiagramPort[] = []
   ports_side: DiagramPort[] = []

   X: number = 0
   Y: number = 0
   W: number = 0
   H: number = 0
}

class DiagramLink {
   constructor(
      public kind: string,
      public from: DiagramPort,
      public to: DiagramPort,
   ) {
      from.links.push(this)
      to.links.push(this)
   }
}

class DiagramDisplayer {
   blocks: DiagramBlock[] = []
   links: DiagramLink[] = []

   width: number = 0
   height: number = 0
}

function getPortHost(item: DXElement): readonly [DXElement, string] {
   let names = []
   let parent: DXElement
   while (parent = item.getSupport()) {
      names.push(item.name)
      item = parent
   }
   return [item as DXElement, names.join("/")]
}

function createDiagramFromModel(layer: DocumentLayer): DiagramDisplayer {
   const blocks_map = new Map<DXElement, DiagramBlock>()
   const ports_in_map = new Map<DXElement, DiagramPort>()
   const ports_out_map = new Map<DXElement, DiagramPort>()
   const links: DiagramLink[] = []

   function addPortIn(value: DXElement): DiagramPort {
      let port = ports_in_map.get(value)
      if (!port) {
         const [host, name] = getPortHost(value)
         const blk = addBlock(host)
         port = new DiagramPort()
         port.name = name
         port.block = blk
         blk.ports_in.push(port)
         ports_in_map.set(value, port)
      }
      return port
   }

   function addPortOut(value: DXElement): DiagramPort {
      let port = ports_out_map.get(value)
      if (!port) {
         const [host, name] = getPortHost(value)
         const blk = addBlock(host)
         port = new DiagramPort()
         port.name = name
         port.block = blk
         blk.ports_out.push(port)
         ports_out_map.set(value, port)
      }
      return port
   }

   function addLink(from: DXElement, to: DXElement, kind: string): DiagramLink {
      const pout = addPortOut(from)
      const pin = addPortIn(to)
      const lnk = new DiagramLink(kind, pout, pin)
      links.push(lnk)
      return lnk
   }

   function addBlock(op: DXElement): DiagramBlock {
      let blk = blocks_map.get(op)
      if (!blk) {
         blk = new DiagramBlock()
         blk.name = op.name
         blk.operator = op
         blocks_map.set(op, blk)
      }
      return blk
   }

   for (let op of layer.operators) {
      if (!op.getSupport()) {
         addBlock(op)
         for (const pout of op.getMembers()) {
            for (const consumer of getElementConsumers(pout)) {
               const operator = consumer.getSupport()
               if (operator) addLink(pout, operator, "#36c")
            }
         }
         for (const consumer of getElementConsumers(op)) {
            const operator = consumer.getSupport()
            if (operator) addLink(op, operator, "#36c")
         }
      }
   }

   const diag = new DiagramDisplayer()
   diag.blocks = Array.from(blocks_map.values())
   diag.links = links

   for (const blk of diag.blocks) {
      blk.W = block_base_width
      blk.H = Math.max(block_base_height, block_base_height + Math.max(1, blk.ports_in.length, blk.ports_out.length) * port_gap)
   }

   layoutDiagram(diag)

   let width = 0, height = 0
   for (const blk of diag.blocks) {
      const py0 = blk.Y + block_base_height + port_gap / 2

      if (blk.ports_in.length) {
         let py = py0
         for (const pin of blk.ports_in) {
            pin.X = blk.X
            pin.Y = py
            py += port_gap
         }
      }

      if (blk.ports_out.length) {
         let py = py0
         for (const pout of blk.ports_out) {
            pout.X = blk.X + blk.W
            pout.Y = py
            py += port_gap
         }
      }

      width = Math.max(width, blk.X + blk.W)
      height = Math.max(height, blk.Y + blk.H)
   }
   diag.width = width
   diag.height = height

   return diag
}

function layoutDiagram(diag: DiagramDisplayer) {
   const grf = DAGLayout.graph<DiagramBlock, DiagramLink>()
   const nodes_map = new Map<DiagramBlock, MutGraphNode<DiagramBlock, DiagramLink>>()

   for (const blk of diag.blocks) {
      const nd = grf.node()
      nodes_map.set(blk, nd)
      nd.data = blk
   }

   for (const lnk of diag.links) {
      const from = nodes_map.get(lnk.from.block)
      const to = nodes_map.get(lnk.to.block)
      grf.link(from, to, lnk)
   }

   const connected = grf.connected()

   const layout = DAGLayout.grid().lane(DAGLayout.laneOpt())
   const { width, height } = layout(grf)
   const scale = block_base_width
   for (const node of grf.nodes()) {
      const blk = node.data
      blk.X = node.y * scale
      blk.Y = node.x * block_base_height
   }
}

export class DiagramV1Panel extends PanelComponent<ViewEditor, {
   model: DocumentModel
}> {
   static Descriptor: PanelDescriptor = {
      userOpenable: true,
      layouting: "boxed",
      defaultTitle: "Diagram",
      defaultIcon: "fa:share-alt",
      defaultDockId: "center",
      parameters: {
         model: true,
      }
   }
   onSelectBlock = (target: DiagramBlock) => {
      const { model } = this.props
      this.feature.selectByElement(target.operator, true)
   }
   render() {
      const { model } = this.props
      if (model) {
         const diag = createDiagramFromModel(model.main)
         return (<>
            <DiagramView diag={diag} onSelect={this.onSelectBlock} />
         </>)
      }
      else {
         return <>{"No model"}</>
      }
   }
}

function DiagramBlockView(props: {
   block: DiagramBlock,
   onSelect: (target: DiagramBlock) => void,
}) {
   const { block, onSelect } = props
   const { operator } = block
   const { type, icon } = operator.constructor as any
   return (<div
      className='DiagBlock'
      style={{ left: block.X, top: block.Y, width: block.W, height: block.H }}
      onClick={() => onSelect(block)}
   >
      <div title={type}>
         <Icon name={icon} />
         <div>{block.name}</div>
      </div>
      <div>
         {block.ports_in.map((pin, i) => {
            return <div key={i} className='In' style={{ top: i * port_gap }}>
               {pin.name || "\u2023"}
            </div>
         })}
         {block.ports_out.map((pout, i) => {
            return <div key={i} className='Out' style={{ top: i * port_gap }}>
               {pout.name || "\u2023"}
            </div>
         })}
      </div>
   </div>)
}

function DiagramView(props: {
   diag: DiagramDisplayer,
   onSelect: (target: DiagramBlock) => void,
}) {
   const { diag, onSelect } = props
   function drawLink(key: number, link: DiagramLink) {
      return (<path
         key={key}
         className="DiagLinkPath"
         d={getLinkPath(link)}
      />)
   }
   function getLinkPath(link: DiagramLink): string {
      const from = link.from
      const to = link.to

      // Calculate control points for the Bezier curve
      if (1) {
         const cp1x = from.X + (to.X - from.X) / 4
         const cp1y = from.Y
         const cp2x = cp1x
         const cp2y = to.Y
         return `M ${from.X} ${from.Y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.X} ${to.Y}`
      }
      else {
         const cp1x = from.X
         const cp1y = from.Y + (to.Y - from.Y) / 4
         const cp2x = to.X
         const cp2y = cp1y
         return `M ${from.X} ${from.Y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.X} ${to.Y}`
      }
   }
   return (<div className="DiagPlane">
      <svg width={diag.width} height={diag.height}>
         {diag.links.map((link, key) => drawLink(key, link))}
      </svg>
      {diag.blocks.map((block, key) => <DiagramBlockView key={key} block={block} onSelect={onSelect} />)}
   </div>)
}
