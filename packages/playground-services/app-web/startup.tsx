import React, { Suspense } from "react"
import ReactDOM from 'react-dom/client'
import { ErrorBoundary, InvokeURLView, useAsyncMemo } from "@jointhedots/core/react"
import { ToastContainer } from "react-toastify"
import 'react-toastify/dist/ReactToastify.css'
import '@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.css'
import "@jointhedots/ui/theme"
import "../components/icons-sf-symbols"
import "../components/icons-fontawesome"
import "../components/icons-bootstrap"
import "../components/register-local-components"
import { ApplicationSelector } from "@jointhedots/ui/ApplicationBoard"
import "../components/services"

import { acquireComponent, createComponentFilter, createComponentPublication, searchComponentsPublications, ServicePoint } from "@jointhedots/core/index"
import { SourceOrgsPoint } from "../components/services"
import { createComponentManifest } from "@jointhedots/ui/ComponentsLibrary/ComponentsEditor"


async function connectGitServiceUrl(servicePoint: ServicePoint, driver_id: string, url: string) {
   const filter = createComponentFilter({
      services: ["storage"],
      keywords: [url],
   })
   for (const found of await searchComponentsPublications(filter)) {
      const manifest = await acquireComponent(found.component_id).fetch()
      if (manifest.url === url) {
         servicePoint.override([found.component_id])
         return found
      }
   }
   servicePoint.override([])

   const driver = acquireComponent(driver_id)
   const manif = await createComponentManifest(driver, servicePoint.service)
   if (manif) {
      const found = createComponentPublication(manif)
      servicePoint.override([found.component_id])
      return found
   }

}


function AutoConnect(props: { children: React.ReactNode }) {
   const auto_setup = useAsyncMemo(() => connectGitServiceUrl(SourceOrgsPoint, "", "aze"), null, [])
   return <>{auto_setup ? null : props.children}</>
}

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

if (location.hash.includes("aze")) {
   ReactDOM.createRoot(root).render(<ApplicationRoot>
      <AutoConnect>
         <InvokeURLView fallback={<ApplicationSelector />} />
      </AutoConnect>
   </ApplicationRoot>)
}
else {
   ReactDOM.createRoot(root).render(<ApplicationRoot>
      <InvokeURLView fallback={<ApplicationSelector />} />
   </ApplicationRoot>)
}
