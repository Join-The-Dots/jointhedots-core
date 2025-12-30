import React from 'react'
import type { GraphData } from './types.ts'

interface ContextViewerProps {
   graphData: GraphData
}

export function ContextViewer({ graphData }: ContextViewerProps) {
   // Extract context-related nodes
   const contextNodes = Array.from(graphData.nodes.values()).filter(
      node => node.type.includes('Context') || node.type.includes('State') || node.type.includes('Task')
   )
   
   const stateNodes = contextNodes.filter(n => n.type.includes('State'))
   const taskNodes = contextNodes.filter(n => n.type.includes('Task'))
   
   return (
      <div className="context-viewer">
         <h3>Context Model</h3>
         
         {stateNodes.length > 0 && (
            <section className="context-section">
               <h4>States ({stateNodes.length})</h4>
               <div className="context-list">
                  {stateNodes.map(node => (
                     <div key={node.id} className="context-item">
                        <div className="context-header">
                           <span className="context-id">#{node.id}</span>
                           <span className="context-type">{node.type}</span>
                        </div>
                        <div className="context-details">
                           {node.data.name && (
                              <div className="detail">
                                 <span className="label">Name:</span>
                                 <span className="value">{node.data.name}</span>
                              </div>
                           )}
                           {node.data.value !== undefined && (
                              <div className="detail">
                                 <span className="label">Initial Value:</span>
                                 <span className="value">{JSON.stringify(node.data.value)}</span>
                              </div>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </section>
         )}
         
         {taskNodes.length > 0 && (
            <section className="context-section">
               <h4>Tasks ({taskNodes.length})</h4>
               <div className="context-list">
                  {taskNodes.map(node => (
                     <div key={node.id} className="context-item">
                        <div className="context-header">
                           <span className="context-id">#{node.id}</span>
                           <span className="context-type">{node.type}</span>
                        </div>
                        <div className="context-details">
                           {node.data.executor && (
                              <div className="detail">
                                 <span className="label">Executor:</span>
                                 <span className="value">{node.data.executor}</span>
                              </div>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </section>
         )}
         
         {stateNodes.length === 0 && taskNodes.length === 0 && (
            <div className="empty-message">
               <p>No context information available</p>
               <p className="hint">States and tasks will appear here when present in the graph</p>
            </div>
         )}
         
         <section className="context-section">
            <h4>Statistics</h4>
            <div className="stats-grid">
               <div className="stat-item">
                  <span className="stat-label">Total Nodes:</span>
                  <span className="stat-value">{graphData.nodes.size}</span>
               </div>
               <div className="stat-item">
                  <span className="stat-label">Total Links:</span>
                  <span className="stat-value">{graphData.links.length}</span>
               </div>
               <div className="stat-item">
                  <span className="stat-label">States:</span>
                  <span className="stat-value">{stateNodes.length}</span>
               </div>
               <div className="stat-item">
                  <span className="stat-label">Tasks:</span>
                  <span className="stat-value">{taskNodes.length}</span>
               </div>
            </div>
         </section>
      </div>
   )
}
