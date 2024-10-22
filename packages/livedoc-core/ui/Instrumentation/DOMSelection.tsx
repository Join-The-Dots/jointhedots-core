import ReactDOM from "react-dom"
import ReactDOMClient from 'react-dom/client'
import ReactTools, { ReactFiberNode } from "@livedoc/core/common/react-tools"
import { ElementTooling, ElementInstrumentation, ElementBoundingBox, InstrumentationKind } from "."

export class DOMSelection {
   overlay: HTMLElement = null
   parent: DOMSelection = null
   next: DOMSelection = null
   isLeaf: boolean = false
   isExiting: boolean = false

   // Rendering state
   element: HTMLElement = null
   root: ReactDOMClient.Root = null

   // Instrumentation location
   node: ReactFiberNode = null
   zone: ElementInstrumentation = null

   constructor(overlay: HTMLElement) {
      this.overlay = overlay
   }
   getRect() {
      const controller = this.zone.getController()
      if (controller.stretch === ElementBoundingBox.Inner) {
         for (let parent = this.node; parent; parent = ReactTools.getNodeParent(parent)) {
            if (parent.stateNode instanceof HTMLElement) {
               return ReactTools.getHTMLClientRect(parent, this.overlay)
            }
         }
      }
      return ReactTools.getHTMLClientRect(this.node, this.overlay)
   }
   getRoot() {
      if (!this.root) this.root = ReactDOMClient.createRoot(this.element)
      return this.root
   }
   renderOverlay(renderer: (sel: DOMSelection) => void, rendererParent?: (sel: DOMSelection) => void) {
      const rect = this.getRect()
      if (!rect) return
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
         if (renderer) renderer(this)
         this.overlay.appendChild(this.element)
      }
      if (this.parent && rendererParent) {
         this.parent.renderOverlay(rendererParent, rendererParent)
      }
      if (this.next) {
         this.next.renderOverlay(renderer, rendererParent)
      }
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
      if (this.next) {
         this.next.cleanOverlay()
      }
   }
   static computeElementSelection(element: HTMLElement, overlay: HTMLElement): DOMSelection {
      const node = ReactTools.findNodeFromHTMLElement(element)
      return DOMSelection.computeNodeSelection(node, overlay)
   }
   static computeNodeSelection(node: ReactFiberNode, overlay: HTMLElement): DOMSelection {
      let firstselection: DOMSelection = null
      let lastSelection: DOMSelection = null
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
               const sel = new DOMSelection(overlay)
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
}

function findDOMNode(instance: React.Component): HTMLElement | null {
   let fiberNode = (instance as any)._reactInternals || (instance as any)._reactInternalFiber;
   while (fiberNode) {
      if (fiberNode.stateNode instanceof HTMLElement) {
         return fiberNode.stateNode;
      }
      fiberNode = fiberNode.child;
   }
   return null;
}
