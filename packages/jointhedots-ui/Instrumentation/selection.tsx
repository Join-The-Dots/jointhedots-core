import ReactDOM from "react-dom"
import ReactDOMClient from 'react-dom/client'
import { ReactTools, ReactFiberNode } from "../../jointhedots-core/common/react-tools"
import { ElementTooling, ElementInstrumentation, ElementBoundingBox, InstrumentationKind } from "./instrumentation"

export class ZoneSelection {
   overlay: HTMLElement = null
   parent: ZoneSelection = null
   isLeaf: boolean = false
   isExiting: boolean = false

   // Rendering state
   element: HTMLElement = null
   root: ReactDOMClient.Root = null
   renderer?: (sel: ZoneSelection) => void = null

   // Instrumentation location
   node: ReactFiberNode = null
   zone: ElementInstrumentation = null

   constructor(overlay: HTMLElement) {
      this.overlay = overlay
   }
   getRect() {
      const controller = this.zone.getController()
      if (controller.stretch === ElementBoundingBox.Inner) {
         return ReactTools.getHTMLClientRect(this.node, this.overlay)
      }
      else { // ElementBoundingBox.Outer
         for (let parent = this.node; parent; parent = ReactTools.getNodeParent(parent)) {
            if (parent.stateNode instanceof HTMLElement) {
               return ReactTools.getHTMLClientRect(parent, this.overlay)
            }
         }
         return null
      }
   }
   getRoot() {
      if (!this.root) this.root = ReactDOMClient.createRoot(this.element)
      return this.root
   }
   setRenderer(
      renderer?: (sel: ZoneSelection) => void,
      rendererParent?: (sel: ZoneSelection) => void,
   ) {
      this.renderer = renderer
      if (this.parent) this.parent.setRenderer(rendererParent, rendererParent)
   }
   updateOverlay(): boolean {
      const rect = this.getRect()
      if (!rect) {
         return false
      }

      let new_element: HTMLElement
      if (!this.element) {
         this.element = new_element = document.createElement("div")
         this.element.style.position = "absolute"
      }
      this.element.style.left = `${rect.left}px`
      this.element.style.top = `${rect.top}px`
      this.element.style.width = `${rect.width}px`
      this.element.style.height = `${rect.height}px`
      if (new_element) {
         if (this.renderer) this.renderer(this)
         this.overlay.appendChild(this.element)
      }
      if (this.parent && this.parent.renderer) {
         this.parent.updateOverlay()
      }
      return true
   }
   cleanOverlay() {
      if (this.element) {
         this.element.parentElement.removeChild(this.element)
         this.element = null
      }
      if (this.root) {
         this.root.unmount()
         this.root = null
      }
      if (this.parent) {
         this.parent.cleanOverlay()
      }
   }
   static computeZoneSelection(zone: ElementInstrumentation, overlay: HTMLElement): ZoneSelection {
      const node = ReactTools.findNodeFromInstance(zone.getBase())
      return computeNodeSelection(node, overlay)
   }
}

function computeNodeSelection(node: ReactFiberNode, overlay: HTMLElement): ZoneSelection {
   let firstselection: ZoneSelection = null
   let lastSelection: ZoneSelection = null
   node = node?.child || node
   while (node) {
      const { elementType } = node
      const kind = (elementType instanceof Object) && elementType.$$instrumentation as InstrumentationKind
      const zone = (kind === InstrumentationKind.Tooling) ? (node.stateNode as ElementTooling).getZone()
         : (kind === InstrumentationKind.Zone) ? (node.stateNode as ElementInstrumentation) : null
      if (zone !== null) {

         if (zone !== node.stateNode) {
            try {
               const element = ReactDOM.findDOMNode(zone.getBase())
               node = ReactTools.findNodeFromHTMLElement(element as HTMLElement)
               continue
            }
            catch (e) {
               console.error(e)
               return null
            }
         }

         // Append selection layer for the instrumentation zone
         if (zone.enabled === true) {
            const sel = new ZoneSelection(overlay)
            sel.node = node
            sel.zone = zone
            if (lastSelection) {
               sel.isLeaf = false
               lastSelection.parent = sel
            }
            else {
               sel.isLeaf = true
               firstselection = sel
            }
            lastSelection = sel
         }
      }
      node = ReactTools.getNodeParent(node)
   }
   return firstselection
}

function findDOMNode(instance: React.Component): HTMLElement | null {
   let fiberNode = (instance as any)._reactInternals || (instance as any)._reactInternalFiber
   while (fiberNode) {
      if (fiberNode.stateNode instanceof HTMLElement) {
         return fiberNode.stateNode
      }
      fiberNode = fiberNode.child
   }
   return null
}
