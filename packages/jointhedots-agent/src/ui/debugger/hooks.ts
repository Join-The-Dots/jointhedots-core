import { useState, useEffect, useMemo } from 'react'
import type { NodeKey } from '../../system/scripting/ast/primitives.ts'
import type { SerializedGraph, GraphData, ViewState } from './types.ts'
import { parseGraphData } from './utils.ts'
import { createFlowFromMdx } from '../../system/scripting/builder.ts'

/**
 * Hook to manage graph data state
 */
export function useGraphData(initialData?: SerializedGraph) {
   const [serializedData, setSerializedData] = useState<SerializedGraph | null>(initialData || null)
   const [isLoading, setIsLoading] = useState(false)
   const [error, setError] = useState<Error | null>(null)

   const graphData = useMemo<GraphData | null>(() => {
      if (!serializedData) return null
      try {
         return parseGraphData(serializedData)
      } catch (err) {
         setError(err instanceof Error ? err : new Error(String(err)))
         return null
      }
   }, [serializedData])

   const loadFromFile = async (file: File) => {
      setIsLoading(true)
      setError(null)

      try {
         const text = await file.text()

         // Parse JSX/MDX to graph
         const model = await createFlowFromMdx(text)
         const data = model.data.serialize()
         setSerializedData(data)
      } catch (err) {
         setError(err instanceof Error ? err : new Error('Failed to load file'))
      } finally {
         setIsLoading(false)
      }
   }

   const loadFromUrl = async (url: string) => {
      setIsLoading(true)
      setError(null)

      try {
         const response = await fetch(url)
         if (!response.ok) throw new Error(`HTTP ${response.status}`)
         const text = await response.text()

         // Parse JSX/MDX to graph
         const model = await createFlowFromMdx(text)
         const data = model.data.serialize()
         setSerializedData(data)
      } catch (err) {
         setError(err instanceof Error ? err : new Error('Failed to load from URL'))
      } finally {
         setIsLoading(false)
      }
   }

   return {
      graphData,
      serializedData,
      isLoading,
      error,
      loadFromFile,
      loadFromUrl,
      setData: setSerializedData
   }
}

/**
 * Hook to manage view state (selection, expansion, filters)
 */
export function useViewState(initialNodeId?: NodeKey) {
   const [state, setState] = useState<ViewState>({
      selectedNodeId: initialNodeId || null,
      expandedNodes: new Set<NodeKey>(),
      filterType: null,
      searchQuery: '',
      viewMode: 'split'
   })

   const selectNode = (nodeId: NodeKey | null) => {
      setState(prev => ({ ...prev, selectedNodeId: nodeId }))
   }

   const toggleExpanded = (nodeId: NodeKey) => {
      setState(prev => {
         const expandedNodes = new Set(prev.expandedNodes)
         if (expandedNodes.has(nodeId)) {
            expandedNodes.delete(nodeId)
         } else {
            expandedNodes.add(nodeId)
         }
         return { ...prev, expandedNodes }
      })
   }

   const expandNode = (nodeId: NodeKey) => {
      setState(prev => {
         const expandedNodes = new Set(prev.expandedNodes)
         expandedNodes.add(nodeId)
         return { ...prev, expandedNodes }
      })
   }

   const collapseNode = (nodeId: NodeKey) => {
      setState(prev => {
         const expandedNodes = new Set(prev.expandedNodes)
         expandedNodes.delete(nodeId)
         return { ...prev, expandedNodes }
      })
   }

   const expandAll = (nodeIds: NodeKey[]) => {
      setState(prev => ({
         ...prev,
         expandedNodes: new Set([...prev.expandedNodes, ...nodeIds])
      }))
   }

   const collapseAll = () => {
      setState(prev => ({ ...prev, expandedNodes: new Set() }))
   }

   const setFilterType = (type: string | null) => {
      setState(prev => ({ ...prev, filterType: type }))
   }

   const setSearchQuery = (query: string) => {
      setState(prev => ({ ...prev, searchQuery: query }))
   }

   const setViewMode = (mode: ViewState['viewMode']) => {
      setState(prev => ({ ...prev, viewMode: mode }))
   }

   return {
      state,
      selectNode,
      toggleExpanded,
      expandNode,
      collapseNode,
      expandAll,
      collapseAll,
      setFilterType,
      setSearchQuery,
      setViewMode
   }
}

/**
 * Hook to load sample graph data
 */
export function useSampleData() {
   const [samples, setSamples] = useState<Array<{ name: string; path: string }>>([])

   useEffect(() => {
      // Define available sample JSX/MDX files
      setSamples([
         { name: 'Flow 1 - Simple States', path: '/samples/flow/flow-1.txt' },
         { name: 'Flow 2 - Functions', path: '/samples/flow/flow-2.txt' },
         { name: 'Flow 3 - Counter', path: '/samples/flow/flow-3-counter.txt' },
         { name: 'Flow 4 - Expressions', path: '/samples/flow/flow-4-expressions.txt' },
         { name: 'Flow 5 - Complex', path: '/samples/flow/flow-5-complex.txt' }
      ])
   }, [])

   return samples
}
