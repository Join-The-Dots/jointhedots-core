import React from "react"
import ReactDOMClient from 'react-dom/client'
import ReactDOM from 'react-dom'
import { createPanel, Panel, PanelDisplay, PanelDock } from "."
import { computeEdgeBoxDOM, PositionType } from "@jointhedots/ui/computeEdgeBox"
import { addOutsideEventListener, getStackZIndex, OutsideHandler, overlays_stack, removeOutsideEventListener } from "./StackedDock"
import "./style.scss"

export type StyleType = { [key: string]: string }

export type FloatingTarget = UIEvent | Element | React.Component | React.SyntheticEvent<Element, Event>

export type FloatingDockOptions = {
   position?: PositionType
   variant?: "menu" | "popup"
   className?: string
   noAutoClose?: boolean
}

class FloatingDock implements PanelDock {
   node: HTMLElement
   root: ReactDOMClient.Root = null
   tracked: Element = null
   main: Panel = null
   stackIndex: number = 0
   resolve?: (data: any) => void
   constructor(
      readonly opts: FloatingDockOptions,
   ) {
   }
   stick(target: FloatingTarget) {
      this.tracked = getTrackedElement(target)
      return this
   }
   popup(displayed: PanelDisplay) {
      const panel = createPanel(displayed)
      panel.open(this)
   }
   private show(): boolean {
      if (!this.root) {
         if (!this.tracked) {
            return false
         }

         const { opts } = this
         const variantClass = variantClasses[opts.variant] || variantClasses.default
         const position = opts.position || "down-right"

         // Purge top of stack popup
         this.stackIndex = 0
         while (this.stackIndex < overlays_stack.length) {
            if (!overlays_stack[this.stackIndex].node.contains(this.tracked)) {
               overlays_stack[this.stackIndex].close()
               break
            }
            this.stackIndex++
         }

         // Create popup node
         this.node = document.createElement("div")
         this.node.className = opts.className ? `${opts.className} ${variantClass}` : variantClass
         this.node.setAttribute("style", `--jtd-floating-zindex:${getStackZIndex(this.stackIndex)};`)
         this.root = ReactDOMClient.createRoot(this.node)
         document.body.appendChild(this.node)

         const updatePosition = () => {
            if (this.node) {
               if (this.tracked.isConnected) {
                  computeEdgeBoxDOM(position, this.node, this.tracked)
                  this.node.style.visibility = "visible"
                  setTimeout(updatePosition, 25)
               }
               else {
                  this.hide()
               }
            }
         }

         // Append popup in document on top of stack
         addOutsideEventListener(this._handleClickOutside)
         computeEdgeBoxDOM(position, this.node, this.tracked, document.body)
         overlays_stack.push({ node: this.node, close: this.hide.bind(this) })

         // Render popup on node
         setTimeout(updatePosition, 25)
         this.refresh(this.main)
      }
      return true
   }
   private _handleClickOutside: OutsideHandler = (type, target) => {
      if (type === "open" && !this.opts.noAutoClose) {
         this.close()
      }
      if (type === "mouse" && this.node && !this.tracked.contains(target)) {
         for (let i = this.stackIndex; i < overlays_stack.length; i++) {
            if (overlays_stack[i].node.contains(target)) return
         }
         this.close()
      }
   }
   private hide() {
      if (this.root) {

         // Remove popup
         removeOutsideEventListener(this._handleClickOutside)
         document.body.removeChild(this.node)
         this.root.unmount()
         this.root = null
         this.node = null

         // Close sub popup when not the top of stack
         if (this.stackIndex < overlays_stack.length - 1) {
            overlays_stack[this.stackIndex + 1].close()
         }
         overlays_stack.pop()
      }
   }
   private close() {
      if (this.main) {
         this.main.close()
      }
   }
   appendPanel(panel: Panel) {
      if (panel !== this.main) {
         this.close()
         this.main = panel
         this.refresh(panel)
      }
   }
   removePanel(panel: Panel) {
      if (panel == this.main) {
         this.main = null
         this.hide()
      }
   }
   refresh(panel: Panel) {
      if (panel == this.main) {
         const displayed = this.main?.displayed
         if (displayed) {
            if (this.show()) {
               this.root.render(displayed.content)
            }
         }
         else {
            this.hide()
         }
      }
   }
}

const variantClasses = {
   "default": "jtd-panel-floating-dock menu",
   "menu": "jtd-panel-floating-dock menu",
   "popup": "jtd-panel-floating-dock popup",
}

const stopableEvents = ["click", "dbclick", "contextmenu"]

function getTrackedElement(target: FloatingTarget): Element {
   if (target instanceof Object) {
      if (target instanceof Element) {
         return target
      }
      else if (target["currentTarget"] instanceof Element) {
         if (stopableEvents.indexOf(target["type"]) >= 0) {
            if (target["stopPropagation"] instanceof Function) target["stopPropagation"]()
            if (target["preventDefault"] instanceof Function) target["preventDefault"]()
         }
         return target["currentTarget"]
      }
      else if (target["target"] instanceof Element) {
         return target["target"]
      }
      else if (target instanceof React.Component) {
         return ReactDOM.findDOMNode(target) as Element
      }
   }
   throw new Error("target is invalid")
}

export function createFloatingDock(
   target: FloatingTarget,
   options?: FloatingDockOptions
): FloatingDock {
   const dock = new FloatingDock(options || {})
   dock.stick(target)
   return dock
}
