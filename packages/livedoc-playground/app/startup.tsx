import React, { useMemo } from "react"
import ReactDOM from 'react-dom/client'
import { ToastContainer } from "react-toastify"
import { Builder } from "@livedoc/editor/designer"
import { Interpreter } from "@livedoc/core/interpreter/config"
import { useLocationQuery } from "@livedoc/editor/hooks/useLocationQuery"
import "@livedoc/ui/theme"
import "@livedoc/core"
import "../library/register"
import "./style.scss"

Interpreter.addEventListener("install", () => {
   Interpreter.edition = true
   Interpreter.simulation = true
})

function App() {
   const component_id = useLocationQuery()?.id || ":samples_view2"
   return (<>
      <Builder component_id={component_id} />
      <ToastContainer position="bottom-right" autoClose={2000} hideProgressBar />
   </>)
}

Interpreter.addEventListener("ready", () => {
   const root = window.document.createElement("div")
   root.id = "root"
   window.document.body.appendChild(root)
   ReactDOM.createRoot(root).render(<App />)
})

Interpreter.use()
