import React from "react"
import ReactDOM from 'react-dom/client'
import { IconFontCollection, registerIconCollection } from '@jointhedots/ui/Icon'
import { App } from "./app"
import "bootstrap-icons/font/bootstrap-icons.css"
import "font-awesome/css/font-awesome.min.css"
import './index.css'

registerIconCollection("bi", new IconFontCollection("bi bi-"))
registerIconCollection("fa", new IconFontCollection("fa fa-"))

// Switch between apps by uncommenting the desired one
// renderRoot(<AgentApp />)
renderRoot(<App />)

export function renderRoot(content: React.ReactNode) {
   const root = window.document.createElement("div")
   root.id = "root"
   window.document.body.appendChild(root)
   ReactDOM.createRoot(root).render(content)
}
