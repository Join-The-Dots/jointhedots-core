import { useEffect, useMemo } from "react"
import { areSimilarObjects, Async } from "@jointhedots/core"
import { DrawerDock } from "./DrawerDock"
import { ModalDock } from "./ModalDock"
import { ToolingProps } from "@jointhedots/ui/Items"

export type PanelDisplay = {
   icon?: string
   title?: string
   content: React.ReactNode
   tooling?: ToolingProps[]
   closable?: boolean
   height?: number | string
   onClose?: () => void
}

export interface Panel<Data = unknown> {
   readonly isOpen: boolean
   readonly dock: PanelDock
   readonly displayed: PanelDisplay
   readonly data: Data
   open(dock: string | PanelDock)
   display(displayed: PanelDisplay)
   close()
}

export interface PanelDock {
   appendPanel(panel: Panel)
   removePanel(panel: Panel)
   refresh(panel: Panel)
}


export class PanelInstance<Data = unknown> implements Panel<Data> {
   dock: PanelDock = null
   displayed: PanelDisplay = null
   data: Data

   get isOpen(): boolean {
      return this.dock !== null
   }

   open(dock?: string | PanelDock) {
      const prev_dock = this.dock
      if (prev_dock) {
         this.dock = null
         prev_dock.removePanel(this)
      }
      this.dock = getPanelDockFrom(dock)
      if (this.displayed) {
         this.dock.appendPanel(this)
      }
   }
   close() {
      const prev_dock = this.dock
      if (prev_dock) {
         this.dock = null
         prev_dock.removePanel(this)
         this.displayed?.onClose?.()
      }
   }
   display(displayed: PanelDisplay) {
      if (displayed) {
         if (!this.displayed) {
            this.displayed = { ...displayed }
            if (this.dock) this.dock.appendPanel(this)
         }
         else if (areSimilarObjects(this.displayed, displayed) === false) {
            Object.assign(this.displayed, displayed)
            if (this.dock) this.dock.refresh(this)
         }
      }
      else {
         this.close()
      }
   }
}

const side_dock = new DrawerDock('right')
const modal_dock = new ModalDock()

const docks = {
   "default": side_dock,
   "side": side_dock,
   "modal": modal_dock,
}

export function getPanelDockFrom(dock?: string | PanelDock): PanelDock {
   if (!dock) {
      return docks.default
   }
   if (typeof dock === "string") {
      return docks[dock] || docks.default
   }
   return dock
}

export function createPanel<T = unknown>(displayed?: PanelDisplay): Panel {
   const panel = new PanelInstance<T>()
   if (displayed) panel.display(displayed)
   return panel
}

export function usePanel<T>(render: (panel: Panel<T>) => Async<PanelDisplay>, deps?: any[]): Panel {
   const panel = useMemo(() => new PanelInstance<T>(), [])
   useEffect(() => {
      const desc = render(panel)
      if (desc instanceof Promise) {
         desc.then(desc => panel.display(desc))
      }
      else {
         panel.display(desc)
      }
   }, deps || [])
   return panel
}
