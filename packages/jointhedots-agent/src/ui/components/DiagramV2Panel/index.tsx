import * as DAGLayout from 'd3-dag'
import './index.scss'
import { GraphOrderingAlgorithm } from '../../utils/graphOrdering'
import { Fragment, useCallback, useMemo, useState } from 'react'
import { createPortal } from "react-dom"
import { addGlobalStylesToShadowRoot } from '../../utils/stylesheet'
import Icon from '@jointhedots/ui/Icon'

const node_radius = 20
const node_gap = 10

enum LinkKind {
   Trigger,
   Consumed,
   Loopback,

   // Flag for incremental update
   Deleted,
}

export enum EdgeKind {
   Strong,
   Weak,
   Shallow,
}

export interface DiagramHandler<Node, Edge> {
   getEdges(n: Node, visitor: (target: Node, edge: Edge, kind: EdgeKind) => void)
   getNodes(visitor: (target: Node, version: string) => void)
   getNodeOrder(n: Node): number
   getNodeName(n: Node): string
   getNodeIcon(n: Node): string
   getScope(n: Node): Node
}

type Version = string | number | symbol | null

const NoVersion = Symbol("none")

let DiagramIDs = 0

export class DiagramEdge {
   id = `#${DiagramIDs++}`
   name: string = ""
   kind = EdgeKind.Strong

   constructor(
      public target: DiagramBlock,
   ) {
   }
}

export class DiagramBlock<Node = any, Edge = any> {
   id = `#${DiagramIDs++}`
   order: number = -1
   column: number = 0
   height: number = 1
   name: string = ""
   icon: string = ""
   version: Version = NoVersion
   uses: DiagramEdge[] = []

   constructor(
      public node: Node,
   ) {
   }
}

class DiagramDisplayer<Node = any, Edge = any> {
   blocks_map = new Map<Node, DiagramBlock>();
   blocks: DiagramBlock[] = []
   rows: number = 0
   columns: number = 0
   selection: DiagramBlock = null
   widget: JTDDiagramGraph = null
   version: Version = NoVersion

   constructor(
      readonly graph: DiagramHandler<Node, Edge>,
   ) {

   }
   get width(): number {
      return this.columns * (node_radius * 2 + node_gap) + node_gap * 2
   }
   get height(): number {
      return (this.rows + 1) * (node_radius * 2 + node_gap)
   }
}


class JTDDiagramGraph extends HTMLElement {
   elm_graph_svg: SVGElement = null
   elm_graph_html: HTMLDivElement = null
   elm_minimap: HTMLDivElement = null
   elm_views: HTMLDivElement = null
   elm_views_map = new Map<DiagramBlock, HTMLDivElement>()
   elm_nodes_map = new Map<DiagramBlock, HTMLDivElement>()
   elm_edges_map = new Map<DiagramEdge, SVGPathElement>()
   diag: DiagramDisplayer

   constructor() {
      super()

      this.elm_graph_svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")

      this.elm_graph_html = document.createElement("div")
      this.elm_graph_html.className = ""

      this.elm_minimap = document.createElement("div")
      this.elm_minimap.className = "DiagramMinimap"
      this.elm_minimap.append(this.elm_graph_svg, this.elm_graph_html)

      this.elm_views = document.createElement("div")
      this.elm_views.className = "DiagramList"

      const elm_area = document.createElement("div")
      elm_area.className = "DiagramArea"
      elm_area.style.setProperty("--diag-block-size", `${node_radius}px`)
      elm_area.append(this.elm_minimap, this.elm_views)

      const root = this.attachShadow({ mode: "open" })
      addGlobalStylesToShadowRoot(root)
      root.append(elm_area)
   }

   display(diag: DiagramDisplayer) {
      if (this.diag !== diag) {
         this.cleanup()
      }
      if (diag) {
         diag.widget = this
         this.diag = diag
         this.elm_graph_svg.setAttribute("width", `${diag.width}px`)
         this.elm_graph_svg.setAttribute("height", `${diag.height}px`)
         for (const block of diag.blocks) {
            this.showBlock(block)
         }
      }
   }
   cleanup() {
      const { diag } = this
      if (diag) {
         diag.widget = null
         function cleanupMap(map: Map<any, Element>) {
            for (const elm of map.values()) {
               elm.remove()
            }
            map.clear()
         }
         cleanupMap(this.elm_edges_map)
         cleanupMap(this.elm_nodes_map)
         cleanupMap(this.elm_views_map)
      }
   }

   public getBlockX(block: DiagramBlock): number {
      return (block.column + 1) * (node_radius * 2 + node_gap)
   }
   public getBlockY(block: DiagramBlock): number {
      let elm_view = this.elm_views_map.get(block)
      return elm_view.offsetTop + elm_view.offsetHeight * 0.5
   }
   $
   public showBlock(block: DiagramBlock) {
      let elm_node = this.elm_nodes_map.get(block)
      if (!elm_node) {
         elm_node = document.createElement("div")
         this.elm_nodes_map.set(block, elm_node)
         this.elm_graph_html.append(elm_node)
      }

      let elm_view = this.elm_views_map.get(block)
      if (!elm_view) {
         elm_view = document.createElement("div")
         this.elm_views_map.set(block, elm_view)
         this.elm_views.append(elm_view)
      }

      elm_node.setAttribute("class", "diag_block_slot")
      elm_node.style.left = `${this.getBlockX(block)}px`
      elm_node.style.top = `${this.getBlockY(block)}px`
      elm_node.style.width = `0`
      elm_node.style.height = `0`
      for (const used of block.uses) {
         this.showEdge(block, used)
      }
      return { elm_node, elm_view }
   }
   public showEdge(block: DiagramBlock, edge: DiagramEdge) {
      let elm_edge = this.elm_edges_map.get(edge)
      if (!elm_edge) {
         elm_edge = document.createElementNS("http://www.w3.org/2000/svg", "path")
         this.elm_edges_map.set(edge, elm_edge)
         this.elm_graph_svg.append(elm_edge)
      }

      const { diag } = this
      const { target } = edge
      let clsname = "diag_link"
      if (target.node == diag.selection?.node) {
         clsname = "diag_link select_out"
      }
      else if (block.node == diag.selection?.node) {
         clsname = "diag_link select_in"
      }
      elm_edge.setAttribute("class", clsname)
      elm_edge.setAttribute("d", getLinkPath(this, block, edge))
   }
}

customElements.define("jtd-diagram-graph", JTDDiagramGraph)


const DiagramLayout = DAGLayout
   .grid()
   .lane(DAGLayout.laneOpt().compressed(false))
   .gap([0, 0])
   .nodeSize([1, 1])
   .rank((blk: any) => { return blk.order })


export function reorderDiagramBlocks<Node, Edge>(blocks: DiagramBlock<Node, Edge>[]) {
   const algo = new GraphOrderingAlgorithm<DiagramBlock>((blk, visitor) => {
      for (const used of blk.uses) {
         visitor(used.target)
      }
   })
   for (const blk of blocks) {
      algo.addNode(blk)
   }
   algo.process()

   let index = 0
   for (const comp of algo.components) {
      for (let v = comp.connecteds; v; v = v.connected) {
         const blk = v.data
         blk.order = index
         blocks[index++] = blk
      }
   }
}

export function updateDiagram<Node, Edge>(diag: DiagramDisplayer<Node, Edge>) {
   const { graph } = diag
   let hasChanged = false

   function acquireBlock(node: Node) {
      let blk = diag.blocks_map.get(node)
      if (!blk) {
         blk = new DiagramBlock(node)
         blk.name = graph.getNodeName(node)
         blk.icon = graph.getNodeIcon(node) || `avatar:${blk.name}`
         blk.order = graph.getNodeOrder(node)
         diag.blocks_map.set(node, blk)
         diag.blocks.push(blk)
      }
      return blk
   }

   graph.getNodes((node: Node, version: Version) => {
      let blk = acquireBlock(node)
      if (blk.version !== version) {
         hasChanged = true
         blk.version = version
         graph.getEdges(node, (used) => {
            const target = acquireBlock(used)
            if (target) {
               const edge = new DiagramEdge(target)
               blk.uses.push(edge)
            }
            else {
               console.error("bad link:", used)
            }
         })
      }
   })
   if (hasChanged) {
      //diag.blocks.sort((a, b) => graph.getNodeOrder(a.node) - graph.getNodeOrder(b.node.order))
      reorderDiagramBlocks(diag.blocks)

      const grf = DAGLayout.graph<DiagramBlock, DiagramEdge>()
      for (const blk of diag.blocks) {
         grf.node(blk)
      }
      for (const blk of diag.blocks) {
         for (const used of blk.uses) {
            grf.link(grf.node(used.target), grf.node(blk))
         }
      }

      const { width, height } = DiagramLayout(grf)
      diag.rows = diag.blocks.length
      diag.columns = Math.round(width - 0.5)
      let prev_y = 0
      for (const node of grf.nodes()) {
         const blk = node.data
         //blk.order = Math.round(node.y - 0.5)
         blk.height = node.y - prev_y
         blk.column = Math.round(node.x - 0.5)
         prev_y = node.y
         diag.rows++
      }
      console.log(diag.blocks)
   }
   return diag
}

export function createDiagram<Node, Edge>(graph: DiagramHandler<Node, Edge>): DiagramDisplayer {
   const diag = new DiagramDisplayer(graph)
   updateDiagram(diag)
   return diag
}

export type BlockViewer = (block: DiagramBlock) => React.ReactNode

function DiagramBlockView(props: {
   block: DiagramBlock
   selected: boolean
   viewer: BlockViewer
   onSelect: (target: DiagramBlock) => void
}) {
   const { block, selected, viewer, onSelect } = props
   return (<div
      style={{ border: selected ? "thin solid #aaa" : "thin dashed #aaa4" }}
      title={block.name}
      onClick={() => onSelect(block)}
   >
      {viewer(block.node)}
   </div>)
}

export function DiagramBlockMinimap(props: {
   diag: DiagramDisplayer
   selection?: DiagramBlock
   onSelect: (target: DiagramBlock) => void
}) {
}

export function DiagramView(props: {
   diag: DiagramDisplayer
   viewer: BlockViewer
   selection?: DiagramBlock
   onSelect: (target: DiagramBlock) => void
}) {
   const { diag, selection, viewer, onSelect } = props
   const [widget, setWidget] = useState<JTDDiagramGraph>(null)

   const root = useCallback((elm: JTDDiagramGraph) => {
      if (elm) {
         setWidget(elm)
      }
      else {
         setWidget(null)
      }
   }, [diag])
   const Jtd_diagram_graph = "jtd-diagram-graph" as any
   diag.selection = selection
   if (widget) {
      widget.display(diag)
   }
   return (<Jtd_diagram_graph ref={root}>
      {widget && diag.blocks.map((block) => {
         const elms = widget.showBlock(block)
         const selected = selection === block
         return <Fragment key={block.id}>
            {createPortal(
               <div
                  title={block.name}
                  className={selected ? 'diag_block selected' : 'diag_block'}
                  style={{
                  }}
                  onClick={() => onSelect(block)}
               >
                  <Icon name={block.icon} size='md' />
               </div>,
               elms.elm_node,
            )}
            {createPortal(
               <DiagramBlockView
                  key={block.id}
                  block={block}
                  viewer={viewer}
                  selected={selected}
                  onSelect={onSelect}
               />,
               elms.elm_view,
            )}
         </Fragment>
      })}
   </Jtd_diagram_graph>)
}

function getLinkPath(widget: JTDDiagramGraph, block: DiagramBlock, link: DiagramEdge): string {
   const { target } = link
   let from_X = widget.getBlockX(target)
   let from_Y = widget.getBlockY(target)
   let to_X = widget.getBlockX(block)
   let to_Y = widget.getBlockY(block)
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
