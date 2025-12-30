import React, { useRef, useEffect } from 'react'
import type { GraphData, GraphNode } from './types.ts'
import { getNodeLabel, getNodeColor } from './utils.ts'

interface GraphVisualizerProps {
   graphData: GraphData
   selectedNodeId: number | null
   onSelectNode: (nodeId: number) => void
   width?: number
   height?: number
}

export function GraphVisualizer({
   graphData,
   selectedNodeId,
   onSelectNode,
   width = 800,
   height = 600
}: GraphVisualizerProps) {
   const canvasRef = useRef<HTMLCanvasElement>(null)
   const containerRef = useRef<HTMLDivElement>(null)
   const [dimensions, setDimensions] = React.useState({ width, height })
   
   // Layout state
   const [positions, setPositions] = React.useState<Map<number, { x: number; y: number }>>(new Map())
   const [isDragging, setIsDragging] = React.useState(false)
   const [draggedNode, setDraggedNode] = React.useState<number | null>(null)
   const [offset, setOffset] = React.useState({ x: 0, y: 0 })
   const [scale, setScale] = React.useState(1)
   
   // Calculate layout using simple tree layout
   useEffect(() => {
      if (!graphData.root) return
      
      const newPositions = new Map<number, { x: number; y: number }>()
      const levelHeight = 80
      const nodeSpacing = 150
      
      // Calculate positions recursively
      function layoutNode(node: GraphNode, level: number, xOffset: number, siblings: number): number {
         const x = xOffset + (siblings * nodeSpacing)
         const y = level * levelHeight + 50
         
         newPositions.set(node.id, { x, y })
         
         let childOffset = 0
         node.children.forEach((child, idx) => {
            childOffset = layoutNode(child, level + 1, x - (node.children.length - 1) * nodeSpacing / 2, idx)
         })
         
         return x
      }
      
      layoutNode(graphData.root, 0, dimensions.width / 2, 0)
      setPositions(newPositions)
   }, [graphData, dimensions.width])
   
   // Resize observer
   useEffect(() => {
      if (!containerRef.current) return
      
      const resizeObserver = new ResizeObserver(entries => {
         for (const entry of entries) {
            setDimensions({
               width: entry.contentRect.width,
               height: entry.contentRect.height
            })
         }
      })
      
      resizeObserver.observe(containerRef.current)
      return () => resizeObserver.disconnect()
   }, [])
   
   // Render canvas
   useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height)
      
      // Apply transformations
      ctx.save()
      ctx.translate(offset.x, offset.y)
      ctx.scale(scale, scale)
      
      // Draw links
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 1
      
      for (const link of graphData.links) {
         if (link.type !== 'parent') continue
         
         const sourcePos = positions.get(link.source)
         const targetPos = positions.get(link.target)
         
         if (!sourcePos || !targetPos) continue
         
         ctx.beginPath()
         ctx.moveTo(sourcePos.x, sourcePos.y)
         ctx.lineTo(targetPos.x, targetPos.y)
         ctx.stroke()
      }
      
      // Draw nodes
      for (const [nodeId, pos] of positions.entries()) {
         const node = graphData.nodes.get(nodeId)
         if (!node) continue
         
         const isSelected = selectedNodeId === nodeId
         const radius = 20
         
         // Node circle
         ctx.fillStyle = getNodeColor(node.type)
         ctx.beginPath()
         ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI)
         ctx.fill()
         
         // Selection ring
         if (isSelected) {
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = 3
            ctx.stroke()
         }
         
         // Border
         ctx.strokeStyle = '#333'
         ctx.lineWidth = 1
         ctx.stroke()
         
         // Label
         const label = getNodeLabel(node)
         ctx.fillStyle = '#333'
         ctx.font = '12px sans-serif'
         ctx.textAlign = 'center'
         ctx.fillText(label, pos.x, pos.y + radius + 15)
      }
      
      ctx.restore()
   }, [graphData, positions, selectedNodeId, offset, scale, dimensions])
   
   // Mouse event handlers
   const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left - offset.x) / scale
      const y = (e.clientY - rect.top - offset.y) / scale
      
      // Check if clicking on a node
      for (const [nodeId, pos] of positions.entries()) {
         const dx = x - pos.x
         const dy = y - pos.y
         const distance = Math.sqrt(dx * dx + dy * dy)
         
         if (distance <= 20) {
            onSelectNode(nodeId)
            setDraggedNode(nodeId)
            setIsDragging(true)
            return
         }
      }
      
      // Start panning
      setIsDragging(true)
   }
   
   const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging) return
      
      if (draggedNode !== null) {
         // Move node
         const canvas = canvasRef.current
         if (!canvas) return
         
         const rect = canvas.getBoundingClientRect()
         const x = (e.clientX - rect.left - offset.x) / scale
         const y = (e.clientY - rect.top - offset.y) / scale
         
         setPositions(prev => {
            const next = new Map(prev)
            next.set(draggedNode, { x, y })
            return next
         })
      } else {
         // Pan canvas
         setOffset(prev => ({
            x: prev.x + e.movementX,
            y: prev.y + e.movementY
         }))
      }
   }
   
   const handleMouseUp = () => {
      setIsDragging(false)
      setDraggedNode(null)
   }
   
   const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setScale(prev => Math.max(0.1, Math.min(5, prev * delta)))
   }
   
   if (!graphData.root) {
      return (
         <div className="graph-visualizer empty">
            <p>No graph data to visualize</p>
         </div>
      )
   }
   
   return (
      <div 
         ref={containerRef} 
         className="graph-visualizer"
         style={{ width: '100%', height: '100%' }}
      >
         <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
         />
         
         <div className="graph-controls">
            <button onClick={() => setScale(prev => prev * 1.2)}>+</button>
            <button onClick={() => setScale(prev => prev * 0.8)}>−</button>
            <button onClick={() => { setOffset({ x: 0, y: 0 }); setScale(1) }}>Reset</button>
         </div>
      </div>
   )
}
