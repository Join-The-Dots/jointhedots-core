import React, { Suspense } from "react"
import ReactDOM from 'react-dom/client'
import { ErrorBoundary, InvokeURLView } from "@jointhedots/core/react"
import { ToastContainer } from "react-toastify"
import 'react-toastify/dist/ReactToastify.css'
import '@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.css'
import "@jointhedots/ui/theme"
import "./components/icons-sf-symbols"
import "./components/icons-fontawesome"
import "./components/icons-bootstrap"
import "./components/register-local-components"
import { ApplicationSelector } from "@jointhedots/ui/ApplicationBoard"
import "./components/services"

function ApplicationRoot(props: { children: React.ReactNode }) {
   return <React.StrictMode>
      <Suspense fallback={<>
         loading...
      </>}>
         <ErrorBoundary>
            {props.children}
         </ErrorBoundary>
      </Suspense>
      <ToastContainer
         position="bottom-left"
         autoClose={2000}
         hideProgressBar
      />
   </React.StrictMode>
}

const root = window.document.createElement("div")
root.id = "root"
window.document.body.appendChild(root)
ReactDOM.createRoot(root).render(<ApplicationRoot>
   <InvokeURLView fallback={<ApplicationSelector />} />
</ApplicationRoot>)
