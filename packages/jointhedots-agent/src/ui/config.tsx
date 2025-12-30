import React from "react"
import ReactDOM from 'react-dom/client'
import { IconFontCollection, IconSVGInnerCollection, registerIconCollection } from "./components/Icon"
import "bootstrap-icons/font/bootstrap-icons.css"
import "font-awesome/css/font-awesome.min.css"

registerIconCollection("bi", new IconFontCollection("bi bi-"))
registerIconCollection("fa", new IconFontCollection("fa fa-"))

export function renderRoot(content: React.ReactNode) {
   const root = window.document.createElement("div")
   root.id = "root"
   window.document.body.appendChild(root)
   ReactDOM.createRoot(root).render(content)
}
