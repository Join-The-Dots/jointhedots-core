import React from "react"
import { EventHandlers, Instrumentation } from "./instrumentation"

export class InstrumentationSupport extends React.Component<{
   draggable?: boolean
   children?: React.ReactNode
}> {
   support: HTMLElement = null

   componentDidMount() {
      const { support } = this
      support.tabIndex = -1
      support.addEventListener("contextmenu", this.onContextMenu, true)
      support.addEventListener("keydown", EventHandlers.onZoneKeyDown, true)
      support.addEventListener("mousedown", EventHandlers.onZoneSelect, true)
      support.addEventListener("mousemove", EventHandlers.onZoneHover, true)
      support.addEventListener("mouseleave", EventHandlers.onZoneExit, true)
      support.addEventListener("mouseup", EventHandlers.onZoneClick, true)
      support.addEventListener("click", EventHandlers.onZoneClick, true)
      if (this.props.draggable) {
         support.addEventListener("dragstart", EventHandlers.onZoneDragStart, true)
         support.addEventListener("dragover", EventHandlers.onZoneDragOver, true)
         support.addEventListener("dragleave", EventHandlers.onZoneDragLeave, true)
         support.addEventListener("drop", EventHandlers.onZoneDrop, true)
      }
   }
   componentWillUnmount() {
      const { support } = this
      support.removeEventListener("contextmenu", this.onContextMenu, true)
      support.removeEventListener("keydown", EventHandlers.onZoneKeyDown, true)
      support.removeEventListener("mousedown", EventHandlers.onZoneSelect, true)
      support.removeEventListener("mousemove", EventHandlers.onZoneHover, true)
      support.removeEventListener("mouseleave", EventHandlers.onZoneExit, true)
      support.removeEventListener("mouseup", EventHandlers.onZoneClick, true)
      support.removeEventListener("click", EventHandlers.onZoneClick, true)
      if (this.props.draggable) {
         support.removeEventListener("dragstart", EventHandlers.onZoneDragStart, true)
         support.removeEventListener("dragover", EventHandlers.onZoneDragOver, true)
         support.removeEventListener("dragleave", EventHandlers.onZoneDragLeave, true)
         support.removeEventListener("drop", EventHandlers.onZoneDrop, true)
      }
   }
   onContextMenu = (e: KeyboardEvent) => {
      e.preventDefault()
   }
   useSupport = (element: HTMLElement) => {
      if (element) {
         element.appendChild(Instrumentation.overlay)
      }
      else if (Instrumentation.overlay.parentElement === this.support) {
         this.support.removeChild(Instrumentation.overlay)
      }
      this.support = element
   }
   render() {
      const { children } = this.props
      return (<div ref={this.useSupport} className="LDX-Instrumentation-Support">
         <div className="LDX-Instrumentation-Content">
            {children}
         </div>
      </div>)
   }
}
