import React from 'react'
import type { NodeKey } from '../../system/scripting/ast/primitives.ts'
import type { GraphNode } from './types.ts'
import { getNodeLabel, getNodeColor, formatNodeData } from './utils.ts'

interface NodeInspectorProps {
   node: GraphNode | null
   onClose: () => void
}

export function NodeInspector({ node, onClose }: NodeInspectorProps) {
   if (!node) {
      return (
         <div className="node-inspector empty">
            <div className="inspector-header">
               <h3>Node Inspector</h3>
            </div>
            <div className="inspector-content">
               <p className="empty-message">Select a node to inspect</p>
            </div>
         </div>
      )
   }
   
   const { id, type, owner, data } = node
   
   // Extract attributes if it's an Element
   const attributes = type === 'Element' && data.attributes ? data.attributes : null
   
   // Get references
   const references: NodeKey[] = []
   const extractRefs = (obj: any) => {
      if (!obj || typeof obj !== 'object') return
      if (obj.$ref !== undefined) references.push(obj.$ref)
      for (const value of Object.values(obj)) {
         if (Array.isArray(value)) {
            value.forEach(extractRefs)
         } else if (value && typeof value === 'object') {
            extractRefs(value)
         }
      }
   }
   extractRefs(data)
   
   return (
      <div className="node-inspector">
         <div className="inspector-header">
            <h3>Node Inspector</h3>
            <button className="close-btn" onClick={onClose} aria-label="Close">
               ×
            </button>
         </div>
         
         <div className="inspector-content">
            <section className="inspector-section">
               <h4>Overview</h4>
               <div className="info-grid">
                  <div className="info-item">
                     <span className="label">ID:</span>
                     <span className="value">#{id}</span>
                  </div>
                  <div className="info-item">
                     <span className="label">Type:</span>
                     <span 
                        className="value type-badge" 
                        style={{ backgroundColor: getNodeColor(type) }}
                     >
                        {type}
                     </span>
                  </div>
                  <div className="info-item">
                     <span className="label">Owner:</span>
                     <span className="value">{owner !== null ? `#${owner}` : 'None (Root)'}</span>
                  </div>
                  <div className="info-item">
                     <span className="label">Children:</span>
                     <span className="value">{node.children.length}</span>
                  </div>
               </div>
            </section>
            
            {type === 'Element' && data.tag && (
               <section className="inspector-section">
                  <h4>Element Info</h4>
                  <div className="info-item">
                     <span className="label">Tag:</span>
                     <span className="value code">&lt;{data.tag}&gt;</span>
                  </div>
               </section>
            )}
            
            {attributes && attributes.length > 0 && (
               <section className="inspector-section">
                  <h4>Attributes</h4>
                  <div className="attributes-list">
                     {attributes.map((attr: any, idx: number) => (
                        <div key={idx} className="attribute-item">
                           <span className="attr-name">
                              {attr.ns ? `${attr.ns}:` : ''}{attr.name}
                           </span>
                           <span className="attr-value">
                              {attr.value?.$ref !== undefined 
                                 ? `→ #${attr.value.$ref}`
                                 : JSON.stringify(attr.value)}
                           </span>
                        </div>
                     ))}
                  </div>
               </section>
            )}
            
            {type === 'Literal' && data.value !== undefined && (
               <section className="inspector-section">
                  <h4>Value</h4>
                  <div className="literal-value">
                     {JSON.stringify(data.value)}
                  </div>
               </section>
            )}
            
            {references.length > 0 && (
               <section className="inspector-section">
                  <h4>References ({references.length})</h4>
                  <div className="references-list">
                     {references.map(ref => (
                        <div key={ref} className="reference-item">
                           → Node #{ref}
                        </div>
                     ))}
                  </div>
               </section>
            )}
            
            <section className="inspector-section">
               <h4>Raw Data</h4>
               <pre className="raw-data">
                  {formatNodeData(data)}
               </pre>
            </section>
         </div>
      </div>
   )
}
