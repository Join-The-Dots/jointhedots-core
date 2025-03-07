import React from "react"
import ReactDOMClient from 'react-dom/client'
import { getStackZIndex, overlays_stack } from "../openContextualMenu"
import "./style.scss"

export class PopupCancel extends Error {
}

export function openDialog<T>(renderer: (resolve: (data: T) => void) => React.ReactNode, height?: string): Promise<T> {
   return new Promise((resolve, reject) => {
      const node = document.createElement("div")
      node.style.position = "absolute"
      node.style.left = "0px"
      node.style.top = "0px"
      node.style.zIndex = getStackZIndex(overlays_stack.length)
      if (height) {
         node.style.setProperty("--jtd-Popup-min-height", height)
         node.style.setProperty("--jtd-Popup-max-height", height)
      }
      else {
         node.style.setProperty("--jtd-Popup-min-height", "0")
         node.style.setProperty("--jtd-Popup-max-height", "90%")
      }
      document.body.appendChild(node)

      function handleResolve(data) {
         root.unmount()
         document.body.removeChild(node)
         resolve(data)
      }
      function handleReject(data) {
         handleResolve(undefined)
      }
      function handleStopPropagation(evt) {
         evt.stopPropagation()
      }
      function Component() {
         return renderer(handleResolve)
      }

      // Render popup on node
      const root = ReactDOMClient.createRoot(node)
      root.render(<div className="jtd-Popup-modal-group">
         <div />
         <div onMouseDown={handleReject}>
            <div onMouseDown={handleStopPropagation}>
               <Component />
            </div>
         </div>
      </div>)
   })
}