import React from "react"
import { EventHandlers } from "."

export class InstrumentationSupport extends React.Component<{
   children?: React.ReactNode
}> {
   support: HTMLElement = null

   componentDidMount() {
      const { support } = this
      support.tabIndex = -1
      support.draggable = true
      support.addEventListener("keydown", EventHandlers.onZoneKeyDown, true)
      support.addEventListener("mousedown", EventHandlers.onZoneSelect, true)
      support.addEventListener("mousemove", EventHandlers.onZoneHover, true)
      support.addEventListener("mouseleave", EventHandlers.onZoneExit, true)
      support.addEventListener("mouseup", EventHandlers.onZoneClick, true)
      support.addEventListener("click", EventHandlers.onZoneClick, true)
      support.addEventListener("dragstart", EventHandlers.onZoneDragStart, true)
      support.addEventListener("dragover", EventHandlers.onZoneDragOver, true)
      support.addEventListener("dragleave", EventHandlers.onZoneDragLeave, true)
      support.addEventListener("drop", EventHandlers.onZoneDrop, true)
      support.addEventListener("contextmenu", this.onContextMenu, true)
   }
   componentWillUnmount() {
      const { support } = this
      support.removeEventListener("keydown", EventHandlers.onZoneKeyDown, true)
      support.removeEventListener("mousedown", EventHandlers.onZoneSelect, true)
      support.removeEventListener("mousemove", EventHandlers.onZoneHover, true)
      support.removeEventListener("mouseleave", EventHandlers.onZoneExit, true)
      support.removeEventListener("mouseup", EventHandlers.onZoneClick, true)
      support.removeEventListener("click", EventHandlers.onZoneClick, true)
      support.removeEventListener("dragstart", EventHandlers.onZoneDragStart, true)
      support.removeEventListener("dragover", EventHandlers.onZoneDragOver, true)
      support.removeEventListener("dragleave", EventHandlers.onZoneDragLeave, true)
      support.removeEventListener("drop", EventHandlers.onZoneDrop, true)
      support.removeEventListener("contextmenu", this.onContextMenu, true)
   }
   onContextMenu = (e: KeyboardEvent) => {
      e.preventDefault()
   }
   useSupport = (element: HTMLElement) => {
      this.support = element
   }
   render() {
      const { children } = this.props
      return (<div ref={this.useSupport} className="LDX-Instrumentation-Support">
         {children}
      </div>)
   }
}
