import React from "react"
import ReactDOMClient from 'react-dom/client'
import ReactDOM from 'react-dom'
import { computeEdgeBoxDOM, PositionType } from "../computeEdgeBox"
import Icon from "@jointhedots/ui/Icon"
import "./style.scss"
import { ItemProps, ItemRowRich, ItemRowShort } from "../Items"

export type MenuIcon = string

type MenuItemProps = ItemProps & {
   children?: React.ReactNode
   onClick?: (event: React.SyntheticEvent) => void
   onMouseEnter?: (event: React.SyntheticEvent) => void
   onElementRef?: (element: HTMLElement) => void
}

type AnchorProps = {
   children?: React.ReactNode
   onClick?: (event: React.SyntheticEvent) => void
}

type StyleType = { [key: string]: string }

export interface StackedOverlay {
   node: HTMLElement
   close()
}

export const overlays_stack: StackedOverlay[] = []

const stopableEvents = ["click", "dbclick", "contextmenu"]

let defaultClassName = "jtd-openContextualMenu"
let defaultStyle: StyleType = {}

export function getStackZIndex(stackIndex: number): string {
   return ((stackIndex + 1) * 1000 + 10000000).toString()
}

export const Menu = {
   Anchor(props: AnchorProps) {
      const { children, onClick } = props
      return <div className="jtd-menu-anchor" onClick={onClick}>{children}</div>
   },
   Item(props: MenuItemProps) {
      let { children, onClick } = props
      let onMouseEnter, onMouseLeave
      if (children) {
         let closeCallback
         onMouseEnter = (e) => {
            openContextualMenu(e.currentTarget, (f) => {
               closeCallback = f
               return children
            })
         }
         onMouseLeave = () => {
            closeCallback && closeCallback()
         }
         if (!onClick) {
            onClick = (e) => {
               openContextualMenu(e.currentTarget as HTMLElement, () => children)
            }
         }
      }
      return <li className="jtd-menu-item" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
         <ItemRowShort {...props}></ItemRowShort>
      </li>
   },
   LargeItem(props: MenuItemProps) {
      let { children, onClick, onElementRef } = props
      let onMouseEnter = props.onMouseEnter, onMouseLeave
      if (children) {
         let closeCallback
         onMouseEnter = (e) => {
            openContextualMenu(e.currentTarget, (f) => {
               closeCallback = f
               return children
            })
         }
         onMouseLeave = () => {
            closeCallback && closeCallback()
         }
         if (!onClick) {
            onClick = (e) => {
               openContextualMenu(e.currentTarget as HTMLElement, () => children)
            }
         }
      }
      return <div
         className={"jtd-menu-item-large"}
         onClick={onClick}
         onMouseEnter={onMouseEnter}
         onMouseLeave={onMouseLeave}
         ref={onElementRef}
      >
         <ItemRowRich {...props}></ItemRowRich>
      </div>
   },
   Separator() {
      return <div className="jtd-menu-separator" />
   },
   Section(props: { title?: string, children?: React.ReactNode }) {
      return <>
         <div className="jtd-menu-separator">
            {props.title}
         </div>
         {props.children}
      </>
   },
}

export function setDefaultMenuStyle(className?: string, style?: StyleType) {
   defaultStyle = style || defaultStyle
   defaultClassName = `${className || ""} jtd-openContextualMenu`
}

export default function openContextualMenu<T>(
   target: Element | UIEvent | React.Component,
   renderer: (close: (value?: T) => void) => React.ReactNode | Promise<React.ReactNode>,
   position?: PositionType,
   className?: string,
   style?: StyleType
): Promise<T> {
   console.assert(renderer instanceof Function)
   var resolve = null

   // Determine tracked element
   var tracked: Element
   if (target instanceof Object) {
      if (target instanceof Element) {
         tracked = target
      }
      else if (target["currentTarget"] instanceof Element) {
         if (stopableEvents.indexOf(target["type"]) >= 0) {
            if (target["stopPropagation"] instanceof Function) target["stopPropagation"]()
            if (target["preventDefault"] instanceof Function) target["preventDefault"]()
         }
         tracked = target["currentTarget"]
      }
      else {
         tracked = ReactDOM.findDOMNode(target as any) as Element
      }
   }
   else {
      throw new Error("target is required")
   }

   // Purge top of stack popup
   var stackIndex = 0
   while (stackIndex < overlays_stack.length) {
      if (!overlays_stack[stackIndex].node.contains(tracked)) {
         overlays_stack[stackIndex].close()
         break
      }
      stackIndex++
   }

   // Create popup node
   var node = document.createElement("ul")
   node.className = className ? `${className} ${defaultClassName}` : defaultClassName
   Object.assign(node.style, style || defaultStyle)
   node.style.visibility = "hidden"
   node.style.position = "fixed"
   node.style.zIndex = getStackZIndex(stackIndex)

   function clickOutside(e) {
      if (node && !tracked.contains(e.target)) {
         for (let i = stackIndex; i < overlays_stack.length; i++) {
            if (overlays_stack[i].node.contains(e.target)) return
         }
         close()
      }
   }

   function updatePosition() {
      if (node) {
         if (tracked.isConnected) {
            computeEdgeBoxDOM(position, node, tracked)
            node.style.visibility = "visible"
            setTimeout(updatePosition, 25)
         }
         else {
            close()
         }
      }
   }

   function close(value?: any) {
      if (node) {

         // Remove popup
         window.removeEventListener("mousedown", clickOutside)
         document.body.removeChild(node)
         root.unmount()
         node = null

         // Close sub popup when not the top of stack
         if (stackIndex < overlays_stack.length - 1) {
            overlays_stack[stackIndex + 1].close()
         }
         overlays_stack.pop()

         // Resolve promise
         resolve && resolve(value)
      }
   }

   // Append popup in document on top of stack
   document.body.appendChild(node)
   window.addEventListener("mousedown", clickOutside, { capture: true })
   computeEdgeBoxDOM(position, node, tracked, document.body)
   overlays_stack.push({ node, close })

   // Render popup on node
   const root = ReactDOMClient.createRoot(node)
   const rendered = renderer(close)
   if (rendered instanceof Promise) {
      rendered.then(rendered => {
         root.render(rendered)
         setTimeout(updatePosition, 25)
      })
   }
   else {
      root.render(rendered)
      setTimeout(updatePosition, 25)
   }

   // Make the promise
   const promise = new Promise<T>((_resolve) => {
      if (node) resolve = _resolve
      else resolve()
   })
   promise["close"] = close
   return promise
}

