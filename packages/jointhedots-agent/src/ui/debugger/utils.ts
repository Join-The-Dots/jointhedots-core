import type { NodeKey } from "../../system/scripting/ast/primitives.ts"
import type { SerializedGraph, SerializedNode, GraphNode, GraphLink, GraphData } from "./types.ts"

/**
 * Parse serialized graph data into structured format
 */
export function parseGraphData(serialized: SerializedGraph): GraphData {
   const nodes = new Map<NodeKey, GraphNode>()
   const links: GraphLink[] = []
   
   // First pass: create all nodes
   for (const [key, data] of Object.entries(serialized)) {
      const id = parseInt(key)
      nodes.set(id, {
         id,
         type: data.type,
         owner: data.$owner >= 0 ? data.$owner : null,
         data,
         children: []
      })
   }
   
   // Second pass: build parent-child relationships and links
   for (const node of nodes.values()) {
      if (node.owner !== null) {
         const parent = nodes.get(node.owner)
         if (parent) {
            parent.children.push(node)
            links.push({
               source: node.owner,
               target: node.id,
               type: 'parent'
            })
         }
      }
      
      // Extract references from node data
      extractReferences(node.data, node.id, links)
   }
   
   // Find root node
   const root = Array.from(nodes.values()).find(n => n.owner === null) || null
   
   return { nodes, links, root }
}

/**
 * Recursively extract $ref references from node data
 */
function extractReferences(obj: any, sourceId: NodeKey, links: GraphLink[]): void {
   if (!obj || typeof obj !== 'object') return
   
   if (obj.$ref !== undefined) {
      links.push({
         source: sourceId,
         target: obj.$ref,
         type: 'reference'
      })
   }
   
   for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
         value.forEach(item => extractReferences(item, sourceId, links))
      } else if (value && typeof value === 'object') {
         extractReferences(value, sourceId, links)
      }
   }
}

/**
 * Get breadcrumb path from root to node
 */
export function getNodePath(nodeId: NodeKey, graphData: GraphData): GraphNode[] {
   const path: GraphNode[] = []
   let current = graphData.nodes.get(nodeId)
   
   while (current) {
      path.unshift(current)
      current = current.owner !== null ? graphData.nodes.get(current.owner) : null
   }
   
   return path
}

/**
 * Get all descendants of a node
 */
export function getDescendants(nodeId: NodeKey, graphData: GraphData): GraphNode[] {
   const descendants: GraphNode[] = []
   const node = graphData.nodes.get(nodeId)
   
   if (!node) return descendants
   
   function collect(n: GraphNode) {
      descendants.push(n)
      n.children.forEach(collect)
   }
   
   node.children.forEach(collect)
   return descendants
}

/**
 * Filter nodes by type
 */
export function filterNodesByType(graphData: GraphData, type: string | null): GraphNode[] {
   if (!type) return Array.from(graphData.nodes.values())
   return Array.from(graphData.nodes.values()).filter(n => n.type === type)
}

/**
 * Search nodes by content
 */
export function searchNodes(graphData: GraphData, query: string): GraphNode[] {
   if (!query) return Array.from(graphData.nodes.values())
   
   const lowerQuery = query.toLowerCase()
   return Array.from(graphData.nodes.values()).filter(node => {
      return JSON.stringify(node.data).toLowerCase().includes(lowerQuery)
   })
}

/**
 * Get unique node types in graph
 */
export function getNodeTypes(graphData: GraphData): string[] {
   const types = new Set<string>()
   for (const node of graphData.nodes.values()) {
      types.add(node.type)
   }
   return Array.from(types).sort()
}

/**
 * Format node data for display
 */
export function formatNodeData(data: SerializedNode): string {
   const cleaned = { ...data }
   delete cleaned.$id
   delete cleaned.$owner
   return JSON.stringify(cleaned, null, 2)
}

/**
 * Get node label for display
 */
export function getNodeLabel(node: GraphNode): string {
   const { type, data } = node
   
   // Special cases for better labels
   if (type === 'Element' && data.tag) {
      return `<${data.tag}>`
   }
   
   if (type === 'Literal' && data.value !== undefined) {
      return `${type}: ${JSON.stringify(data.value)}`
   }
   
   if (data.name) {
      return `${type} (${data.name})`
   }
   
   return `${type} #${node.id}`
}

/**
 * Get color for node type
 */
export function getNodeColor(type: string): string {
   const colorMap: Record<string, string> = {
      'Document': '#4a90e2',
      'Block': '#7b68ee',
      'Element': '#50c878',
      'Literal': '#ffa500',
      'Identifier': '#ff6b6b',
      'BinaryExpression': '#9370db',
      'UnaryExpression': '#da70d6',
      'CallExpression': '#20b2aa',
      'MemberExpression': '#48d1cc'
   }
   
   return colorMap[type] || '#888888'
}
