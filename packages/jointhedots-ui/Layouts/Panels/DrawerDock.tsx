import ReactDOM from 'react-dom/client'
import React, { useState, useEffect } from 'react'
import { getStackZIndex, StackedDock } from './StackedDock'
import { ItemRowRich } from '@jointhedots/ui/Items'
import "./style.scss"

const ResizableDrawer = (props: {
   open: boolean
   width: number
   defaultWidth: number
   minWidth: number
   maxWidth: number
   anchor: 'right' | 'left'
   children: React.ReactNode
   setWidth: (width: number) => void
}) => {
   const { open, anchor, width, defaultWidth, minWidth, maxWidth, children, setWidth } = props
   const [resizing, setResizing] = useState<boolean>(false)
   const [hover, setHover] = useState<boolean>(false)

   const handleMouseDown = () => setResizing(true)
   const handleMouseUp = () => setResizing(false)

   const handleMouseMove = (e: MouseEvent) => {
      if (resizing) {
         let newWidth = width

         if (anchor === 'left') {
            newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth)
         } else if (anchor === 'right') {
            newWidth = Math.min(Math.max(window.innerWidth - e.clientX, minWidth), maxWidth)
         }

         setWidth(newWidth)
      }
   }

   useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
         window.removeEventListener('mousemove', handleMouseMove)
         window.removeEventListener('mouseup', handleMouseUp)
      }
   }, [resizing, anchor, minWidth, maxWidth])

   const handleDoubleClick = () => {
      setWidth(defaultWidth)
   }

   return <div style={{
      height: '100%',
      position: 'relative',
      width: open ? width : 0,
      transition: resizing ? "" : 'width 0.3s ease',
      border: "solid thin grey",
      overflow: "hidden"
   }}>
      {children}

      {/* Resize handle */}
      <div
         style={{
            width: '8px',
            cursor: 'col-resize',
            position: 'absolute',
            zIndex: 1000,
            top: 0,
            ...(anchor === 'left' ? { right: 0 } : { left: 0 }),
            bottom: 0,
            backgroundColor: hover ? '#e0e0e0' : 'transparent',
            transition: 'background-color 0.3s ease',
         }}
         onMouseDown={handleMouseDown}
         onMouseEnter={() => setHover(true)}
         onMouseLeave={() => setHover(false)}
         onDoubleClick={handleDoubleClick}
      />
   </div>
}

type Side = 'right' | 'left'

export class DrawerDock extends StackedDock {
   node: HTMLDivElement
   root: ReactDOM.Root
   width: number = 300
   constructor(readonly side: Side) {
      super()
      this.node = window.document.createElement("div")
      this.node.className = `jtd-panel-drawer-dock side-${side}`
      this.node.setAttribute("style", `z-index: ${getStackZIndex(-1)};`)
      this.root = ReactDOM.createRoot(this.node)
      window.document.body.appendChild(this.node)
      this.updateStack()
   }
   setWidth = (width: number) => {
      this.width = width
      this.updateStack()
   }
   updateStack() {
      const displayed = this.main?.displayed
      this.root.render(<ResizableDrawer
         open={!!this.main}
         anchor={this.side}
         width={this.width}
         defaultWidth={300}
         minWidth={200}
         maxWidth={window.document.body.clientWidth * 0.7}
         setWidth={this.setWidth}
      >
         {this.stack.map((panel, key) => {
            const { displayed } = panel
            if (displayed) {
               return <ItemRowRich
                  key={key}
                  icon={displayed.icon}
                  name={displayed.title}
                  tooling={displayed.tooling}
                  onSelect={() => this.appendPanel(panel)}
               />
            }
            return null
         })}
         {displayed && <ItemRowRich
            icon={displayed.icon}
            name={displayed.title}
            tooling={[
               ...(displayed.tooling || []),
               {
                  name: "close",
                  icon: "bi:x-lg",
                  onActivate: (label, dock) => {
                     this.main?.close?.()
                  },
               }
            ]}
         />}
         <div style={{
            overflow: "auto"
         }}>
            {displayed?.content}
         </div>
      </ResizableDrawer >)
   }
}

export default ResizableDrawer
