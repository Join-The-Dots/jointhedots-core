import React, { useRef } from 'react'
import { useGraphData, useViewState, useSampleData } from './hooks.ts'
import { ModelTree } from './ModelTree.tsx'
import { GraphVisualizer } from './GraphVisualizer.tsx'
import { NodeInspector } from './NodeInspector.tsx'
import { ContextViewer } from './ContextViewer.tsx'
import { getNodeTypes } from './utils.ts'
import type { DebuggerProps } from './types.ts'
import './styles.scss'

export function GraphDebugger({ graphData: initialData, onLoadFile }: DebuggerProps) {
   const fileInputRef = useRef<HTMLInputElement>(null)
   const samples = useSampleData()
   
   const {
      graphData,
      isLoading,
      error,
      loadFromFile,
      loadFromUrl
   } = useGraphData(initialData)
   
   const {
      state: viewState,
      selectNode,
      toggleExpanded,
      expandAll,
      collapseAll,
      setFilterType,
      setSearchQuery,
      setViewMode
   } = useViewState()
   
   const selectedNode = viewState.selectedNodeId !== null 
      ? graphData?.nodes.get(viewState.selectedNodeId) || null
      : null
   
   const nodeTypes = graphData ? getNodeTypes(graphData) : []
   
   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
         await loadFromFile(file)
         if (onLoadFile) onLoadFile(file)
      }
   }
   
   const handleLoadSample = async (samplePath: string) => {
      await loadFromUrl(samplePath)
   }
   
   const handleExpandAll = () => {
      if (graphData) {
         const allNodeIds = Array.from(graphData.nodes.keys())
         expandAll(allNodeIds)
      }
   }
   
   return (
      <div className="graph-debugger">
         {/* Header / Toolbar */}
         <header className="debugger-header">
            <h1>Script Graph Debugger</h1>
            
            <div className="toolbar">
               <div className="toolbar-section">
                  <button 
                     className="btn btn-primary"
                     onClick={() => fileInputRef.current?.click()}
                  >
                     📁 Load JSX/MDX File
                  </button>
                  <input
                     ref={fileInputRef}
                     type="file"
                     accept=".jsx,.mdx,.tsx"
                     onChange={handleFileUpload}
                     style={{ display: 'none' }}
                  />
                  
                  <select 
                     className="sample-select"
                     onChange={(e) => e.target.value && handleLoadSample(e.target.value)}
                     defaultValue=""
                  >
                     <option value="">Load Sample...</option>
                     {samples.map(sample => (
                        <option key={sample.path} value={sample.path}>
                           {sample.name}
                        </option>
                     ))}
                  </select>
               </div>
               
               {graphData && (
                  <>
                     <div className="toolbar-section">
                        <select
                           value={viewState.filterType || ''}
                           onChange={(e) => setFilterType(e.target.value || null)}
                           className="filter-select"
                        >
                           <option value="">All Types</option>
                           {nodeTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                           ))}
                        </select>
                        
                        <input
                           type="text"
                           placeholder="Search..."
                           value={viewState.searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="search-input"
                        />
                     </div>
                     
                     <div className="toolbar-section">
                        <button onClick={handleExpandAll} className="btn btn-sm">
                           Expand All
                        </button>
                        <button onClick={collapseAll} className="btn btn-sm">
                           Collapse All
                        </button>
                     </div>
                     
                     <div className="toolbar-section view-mode-selector">
                        <button
                           className={`btn btn-sm ${viewState.viewMode === 'tree' ? 'active' : ''}`}
                           onClick={() => setViewMode('tree')}
                        >
                           🌳 Tree
                        </button>
                        <button
                           className={`btn btn-sm ${viewState.viewMode === 'graph' ? 'active' : ''}`}
                           onClick={() => setViewMode('graph')}
                        >
                           🔀 Graph
                        </button>
                        <button
                           className={`btn btn-sm ${viewState.viewMode === 'split' ? 'active' : ''}`}
                           onClick={() => setViewMode('split')}
                        >
                           ⚡ Split
                        </button>
                     </div>
                  </>
               )}
            </div>
         </header>
         
         {/* Main Content */}
         <main className="debugger-content">
            {isLoading && (
               <div className="loading-overlay">
                  <div className="spinner" />
                  <p>Loading graph data...</p>
               </div>
            )}
            
            {error && (
               <div className="error-message">
                  <h3>Error Loading Graph</h3>
                  <p>{error.message}</p>
               </div>
            )}
            
            {!isLoading && !error && !graphData && (
               <div className="welcome-screen">
                  <div className="welcome-content">
                     <h2>Welcome to Script Graph Debugger</h2>
                     <p>Load a JSX/MDX flow file to visualize the graph</p>
                     <div className="welcome-actions">
                        <button 
                           className="btn btn-large btn-primary"
                           onClick={() => fileInputRef.current?.click()}
                        >
                           📁 Choose JSX/MDX File
                        </button>
                        <div className="or-divider">or</div>
                        <div className="sample-buttons">
                           {samples.map(sample => (
                              <button
                                 key={sample.path}
                                 className="btn btn-large"
                                 onClick={() => handleLoadSample(sample.path)}
                              >
                                 {sample.name}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            )}
            
            {graphData && (
               <div className={`workspace workspace-${viewState.viewMode}`}>
                  {/* Left Panel - Tree View */}
                  {(viewState.viewMode === 'tree' || viewState.viewMode === 'split') && (
                     <div className="panel panel-tree">
                        <div className="panel-header">
                           <h3>Model Tree</h3>
                           <span className="node-count">
                              {graphData.nodes.size} nodes
                           </span>
                        </div>
                        <div className="panel-content">
                           <ModelTree
                              graphData={graphData}
                              selectedNodeId={viewState.selectedNodeId}
                              expandedNodes={viewState.expandedNodes}
                              onSelectNode={selectNode}
                              onToggleExpand={toggleExpanded}
                              filterType={viewState.filterType}
                              searchQuery={viewState.searchQuery}
                           />
                        </div>
                     </div>
                  )}
                  
                  {/* Center Panel - Graph Visualizer */}
                  {(viewState.viewMode === 'graph' || viewState.viewMode === 'split') && (
                     <div className="panel panel-graph">
                        <div className="panel-header">
                           <h3>Graph View</h3>
                        </div>
                        <div className="panel-content">
                           <GraphVisualizer
                              graphData={graphData}
                              selectedNodeId={viewState.selectedNodeId}
                              onSelectNode={selectNode}
                           />
                        </div>
                     </div>
                  )}
                  
                  {/* Right Panel - Inspector & Context */}
                  <div className="panel panel-inspector">
                     <div className="panel-tabs">
                        <button className="tab-btn active">Inspector</button>
                        <button className="tab-btn">Context</button>
                     </div>
                     
                     <div className="panel-content">
                        <NodeInspector
                           node={selectedNode}
                           onClose={() => selectNode(null)}
                        />
                        
                        {/* Context viewer - could be toggled via tabs */}
                        {/* <ContextViewer graphData={graphData} /> */}
                     </div>
                  </div>
               </div>
            )}
         </main>
      </div>
   )
}
