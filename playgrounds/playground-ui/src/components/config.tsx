import React from "react"
import ReactDOM from 'react-dom/client'
import "@jointhedots/theme"
import "@jointhedots/icon/bootstrap"
import "@jointhedots/icon/font-awesome"
import "@jointhedots/icon/salesforce"
import { registerMissingServiceDisplayer } from "@jointhedots/ui/ServicePoint"

registerMissingServiceDisplayer()

export function renderRoot(content: React.ReactNode) {
   const root = window.document.createElement("div")
   root.id = "root"
   window.document.body.appendChild(root)
   ReactDOM.createRoot(root).render(content)
}
