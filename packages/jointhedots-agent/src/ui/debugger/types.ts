import type { NodeKey } from "../../system/scripting/ast/primitives.ts"

// Serialized graph data structures for UI consumption
export interface SerializedNode {
   $id: NodeKey
   $owner: NodeKey
   type: string
   [key: string]: any
}

export interface SerializedGraph {
   [key: string]: SerializedNode
}

export interface GraphNode {
   id: NodeKey
   type: string
   owner: NodeKey | null
   data: SerializedNode
   children: GraphNode[]
}

export interface GraphLink {
   source: NodeKey
   target: NodeKey
   type: 'parent' | 'reference' | 'state' | 'task'
}

export interface GraphData {
   nodes: Map<NodeKey, GraphNode>
   links: GraphLink[]
   root: GraphNode | null
}

export interface ViewState {
   selectedNodeId: NodeKey | null
   expandedNodes: Set<NodeKey>
   filterType: string | null
   searchQuery: string
   viewMode: 'tree' | 'graph' | 'split'
}

export interface DebuggerProps {
   graphData?: SerializedGraph
   onLoadFile?: (file: File) => void
}
