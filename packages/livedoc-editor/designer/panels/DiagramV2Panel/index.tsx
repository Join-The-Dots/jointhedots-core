import React from 'react'
import { ViewEditor } from '../../editor'
import { PanelComponent, PanelDescriptor } from '@livedoc/editor/ui/FeaturesLayout'
import { DocumentLayer, DXElement, DXPipe, DXInbound, getElementConsumers, DocumentModel } from '@livedoc/core'
import { MutGraphNode } from 'd3-dag'
import * as DAGLayout from 'd3-dag'
import Icon from '@livedoc/ui/Icon'
import { DescriptorEditionSelection } from '@livedoc/editor/designer/selection'
import './index.scss'

const node_radius = 15

enum LinkKind {
   Trigger,
   Consumed,
   Loopback,

   // Flag for incremental update
   Deleted,
}

class DiagramBlock {
   order: number = -1
   column: number = 0

   constructor(
      public name: string = "",
      public operator: DXElement,
   ) {
   }
   get X(): number {
      return (this.column + 1) * node_radius * 3
   }
   get Y(): number {
      return (this.order + 1) * node_radius * 3
   }
   *links(): Generator<DXPipe> {
      function* finds(emit: DXElement): Generator<DXPipe> {
         for (const member of emit.getMembers()) {
            yield* finds(member)
         }
         for (const consumer of getElementConsumers(emit)) {
            yield consumer
         }
      }
      yield* finds(this.operator)
   }
}

class DiagramDisplayer {
   blocks_map = new Map<DXElement, DiagramBlock>();
   blocks: DiagramBlock[] = []
   rows: number = 0
   columns: number = 0
   get X(): number {
      return node_radius * 2.5
   }
   get Y(): number {
      return node_radius * 2.5
   }
   get width(): number {
      return this.columns * node_radius * 3
   }
   get height(): number {
      return (this.rows + 1) * node_radius * 3
   }
   getReceiver(outbound: DXPipe): DiagramBlock {
      let to = outbound.getSupport()
      return this.blocks_map.get(to)
   }
}

function getMemberHost(item: DXElement): DXElement {
   let names = []
   let parent: DXElement
   while (parent = item.getSupport()) {
      names.push(item.name)
      item = parent
   }
   return item as DXElement
}

function createDiagramFromModel(layer: DocumentLayer): DiagramDisplayer {
   const diag = new DiagramDisplayer()
   const { blocks, blocks_map } = diag

   for (let op of layer.operators) {
      if (!op.getSupport()) {
         let blk = blocks_map.get(op)
         if (!blk) {
            blk = new DiagramBlock(op.name, op)
            blocks_map.set(op, blk)
            blocks.push(blk)
         }
      }
   }
   blocks.sort((a, b) => a.operator.order - b.operator.order)

   // Make layout graph
   const grf = DAGLayout.graph<DiagramBlock, DiagramBlock>()
   const nodes_map = new Map<DiagramBlock, MutGraphNode<DiagramBlock, DiagramBlock>>()
   for (const blk of blocks) {
      nodes_map.set(blk, grf.node(blk))
   }
   for (const blk_to of blocks) {
      for (const pipe of blk_to.links()) {
         const blk_from = blocks_map.get(pipe.getSupport())
         if (blk_from === blk_to) {
            console.error("bad link:", pipe, blk_to.operator.getMembers(), getElementConsumers(blk_to.operator))
         }
         else if (blk_from) {
            const from = nodes_map.get(blk_from)
            const to = nodes_map.get(blk_to)
            grf.link(to, from)
         }
         else if (pipe instanceof DXInbound) {
            console.error("bad link:", pipe)
         }
      }
   }

   const layout = DAGLayout
      .grid()
      .lane(DAGLayout.laneOpt())
      .gap([0, 0])
      .nodeSize([1, 1])

   const { width, height } = layout(grf)

   diag.rows = 0
   diag.columns = Math.round(width - 0.5)
   for (const node of grf.nodes()) {
      const blk = node.data
      blk.order = Math.round(node.y - 0.5)
      blk.column = Math.round(node.x - 0.5)
      diag.rows++
   }

   return diag
}

export class DiagramV2Panel extends PanelComponent<ViewEditor, {
   model: DocumentModel
   selection: DescriptorEditionSelection
}> {
   static Descriptor: PanelDescriptor = {
      userOpenable: true,
      layouting: "boxed",
      defaultTitle: "Diagram",
      defaultIcon: "fa:share-alt",
      defaultDockId: "center",
      parameters: {
         session: true,
         selection: true,
      }
   }
   onSelectBlock = (target: DiagramBlock) => {
      this.feature.selectByElement(target.operator, true)
   }
   render() {
      const { model, selection } = this.props
      /*return <FlowTable columns={[{
         title: "C1",
         view: () => <div>X</div>
      }]} />*/
      if (model) {
         const diag = createDiagramFromModel(model.main)
         return (<>
            <DiagramView diag={diag} selection={selection} onSelect={this.onSelectBlock} />
         </>)
      }
      else {
         return <>{"No model"}</>
      }
   }
}

function DiagramBlockView(props: {
   block: DiagramBlock,
   selected: boolean,
   onSelect: (target: DiagramBlock) => void,
}) {
   const { block, selected, onSelect } = props
   const { operator } = block
   const { type } = operator.constructor as any
   return (<div
      className={selected ? 'diag_block selected' : 'diag_block'}
      style={{ left: block.X - node_radius, top: block.Y - node_radius, width: node_radius * 2, height: node_radius * 2 }}
      title={`${type}: ${block.name}`}
      onClick={() => onSelect(block)}
   >
      <Icon name={operator.constructor["icon"]} />
   </div>)
}

function DiagramGroupView(props: {
   group: DiagramDisplayer
}) {
   const { group } = props
   return <div className="diag_group"
      style={{ left: group.X - node_radius, top: group.Y - node_radius, width: group.width, height: group.height }}
   />
}

function DiagramView(props: {
   selection: DescriptorEditionSelection,
   diag: DiagramDisplayer,
   onSelect: (target: DiagramBlock) => void,
}) {
   const { diag, selection, onSelect } = props
   const lines = []
   const shapes = []
   const legends = []
   for (const from of diag.blocks) {
      for (const outbound of from.links()) {
         const to = diag.getReceiver(outbound)
         if (to) {
            let clsname = "diag_link"
            if (from.operator == selection?.operator) {
               clsname = "diag_link select_out"
            }
            else if (to.operator == selection?.operator) {
               clsname = "diag_link select_in"
            }
            lines.push(<path
               key={lines.length}
               className={clsname}
               d={getLinkPath(LinkKind.Trigger, from, to)}
            />)
         }
      }
      shapes.push(<DiagramBlockView
         key={shapes.length}
         block={from}
         selected={from.operator === selection?.operator}
         onSelect={onSelect}
      />)
   }

   return (<div className="Diagram_v2">
      <svg width={diag.width} height={diag.height}>
         {lines}
      </svg>
      <DiagramGroupView group={diag} />
      {shapes}
   </div>)
}

function getLinkPath(kind: LinkKind, from: DiagramBlock, to: DiagramBlock): string {
   let from_X = from.X
   let from_Y = from.Y
   let to_X = to.X
   let to_Y = to.Y
   const gap_X = to_X - from_X
   const threshold = node_radius
   if (gap_X > threshold) {
      from_X += node_radius
      to_Y -= node_radius
      return `M ${from_X} ${from_Y} Q ${to_X} ${from_Y}, ${to_X} ${to_Y}`
   }
   else if (gap_X < -threshold) {
      from_X -= node_radius
      to_Y -= node_radius
      return `M ${from_X} ${from_Y} Q ${to_X} ${from_Y}, ${to_X} ${to_Y}`
   }
   else {
      from_Y += node_radius
      to_Y -= node_radius
      const mid_Y = from_Y + (to_Y - from_Y) / 2
      return `M ${from_X} ${from_Y} C ${from_X} ${mid_Y}, ${to_X} ${mid_Y}, ${to_X} ${to_Y}`
   }
}
