import { type Panel, type PanelDock } from "."

export interface StackedOverlay {
   node: HTMLElement
   close()
}

export const overlays_stack: StackedOverlay[] = []

export function getStackZIndex(stackIndex: number): string {
   return ((stackIndex + 1) * 1000 + 10000000).toString()
}

export abstract class StackedDock implements PanelDock {
   stack: Panel[] = []
   main: Panel = null
   appendPanel(panel: Panel) {
      const index = this.stack.indexOf(panel)
      if (index > 0) {
         this.stack.splice(index, 1)
         if (this.main) this.stack.push(this.main)
      }
      if (this.main !== panel) {
         const prev_main = this.main
         this.main = panel
         this.updateStack(prev_main)
      }
      else if (index > 0) {
         this.updateStack(this.main)
      }
   }
   removePanel(panel: Panel) {
      const index = this.stack.indexOf(panel)
      if (index > 0) {
         this.stack.splice(index, 1)
         this.updateStack(this.main)
      }
      else if (panel === this.main) {
         this.main = this.stack.pop()
         this.updateStack(panel)
      }
   }
   refresh(panel: Panel) {
      const index = this.stack.indexOf(panel)
      if (index > 0) {
         this.updateStack(this.main)
      }
      else if (panel === this.main) {
         this.updateStack(panel)
      }
   }
   abstract updateStack(previousMain: Panel)
}
