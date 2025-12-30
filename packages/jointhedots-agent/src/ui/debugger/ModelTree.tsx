import React from 'react'
import type { NodeKey } from '../../system/scripting/ast/primitives.ts'
import type { GraphNode, GraphData } from './types.ts'
import { getNodeLabel, getNodeColor } from './utils.ts'

interface ModelTreeProps {
   graphData: GraphData
   selectedNodeId: NodeKey | null
   expandedNodes: Set<NodeKey>
   onSelectNode: (nodeId: NodeKey) => void
   onToggleExpand: (nodeId: NodeKey) => void
   filterType?: string | null
   searchQuery?: string
}

export function ModelTree({
   graphData,
   selectedNodeId,
   expandedNodes,
   onSelectNode,
   onToggleExpand,
   filterType,
   searchQuery
}: ModelTreeProps) {
   if (!graphData.root) {
      return (
         <div className="model-tree empty">
            <p>No graph data loaded</p>
         </div>
      )
   }
   
   const renderNode = (node: GraphNode, depth: number = 0): React.ReactNode => {
      const isExpanded = expandedNodes.has(node.id)
      const isSelected = selectedNodeId === node.id
      const hasChildren = node.children.length > 0
      
      // Filter by type if specified
      if (filterType && node.type !== filterType) {
         return null
      }
      
      // Filter by search query
      if (searchQuery) {
         const nodeText = JSON.stringify(node.data).toLowerCase()
         if (!nodeText.includes(searchQuery.toLowerCase())) {
            return null
         }
      }
      
      const label = getNodeLabel(node)
      const color = getNodeColor(node.type)
      
      return (
         <div key={node.id} className="tree-node-wrapper">
            <div 
               className={`tree-node ${isSelected ? 'selected' : ''}`}
               style={{ paddingLeft: `${depth * 20}px` }}
            >
               <button
                  className={`expand-btn ${!hasChildren ? 'disabled' : ''}`}
                  onClick={() => hasChildren && onToggleExpand(node.id)}
                  disabled={!hasChildren}
               >
                  {hasChildren ? (isExpanded ? '▼' : '▶') : '·'}
               </button>
               
               <div 
                  className="node-content"
                  onClick={() => onSelectNode(node.id)}
               >
                  <span 
                     className="node-type-indicator"
                     style={{ backgroundColor: color }}
                  />
                  <span className="node-label">{label}</span>
                  <span className="node-id">#{node.id}</span>
                  {hasChildren && (
                     <span className="children-count">({node.children.length})</span>
                  )}
               </div>
            </div>
            
            {isExpanded && hasChildren && (
               <div className="tree-children">
                  {node.children.map(child => renderNode(child, depth + 1))}
               </div>
            )}
         </div>
      )
   }
   
   return (
      <div className="model-tree">
         {renderNode(graphData.root)}
      </div>
   )
}
