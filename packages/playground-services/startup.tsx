import React, { useState } from "react"
import ReactDOM from 'react-dom/client'
import "./components/icons-fontawesome"
import "./components/icons-bootstrap"
import "@jointhedots/ui/theme"
import 'react-toastify/dist/ReactToastify.css'
import "./style.scss"
import { createServiceGroup, ComponentsRegistry, createNewComponent, StorageService } from "@jointhedots/core"
import { Tab, Tabs } from "react-lightning-design-system"
import { ServicePointStatus, ServicePointsConfigurator } from "@jointhedots/ui/ServicePoint"
import '@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.css'
import { ComponentsConfigurator } from "@jointhedots/ui/ComponentsLibrary"
import { LocalComponentProvider } from "@jointhedots/core/library/providers/LocalComponentProvider"
import { MountServicePoints, useService } from "@jointhedots/core/react"


const MockStorageServicePoint = createServiceGroup<StorageService>("Delivery Orgs", "storage")
const MockStorageService2Point = createServiceGroup<StorageService>("Source Orgs", "storage")

const local = new LocalComponentProvider()
ComponentsRegistry.components_provider.add_provider(local)

function addComponent(manifest) {
   createNewComponent(manifest)
}

addComponent({
   "$id": "config:main-repo",
   "type": "jtd:github.service",
   "name": "github main repo",
   "icon": "fa:git",
   "settings": {
      "url": "https://github.com/jointhedots/jointhedots-app",
      "password": "******",
      "org": "jointhedots",
      "branch": "main",
   }
})

addComponent({
   "$id": "config:test-org-fln-1253",
   "name": "test-org-fln-1253",
   "type": "jtd:salesforce.service",
   "icon": "fa:home",
   "settings": {
      "name": "my app",
      "clientId": "",
      "clientSecret": "",
      "endPoint": "https://xxx.my.salesforce.com"
   }
})

addComponent({
   "$id": "config:org-x",
   "name": "org-x",
   "type": "jtd:salesforce.service",
   "settings": {
      "clientId": "",
      "clientSecret": "",
      "endPoint": "https://xxx.my.salesforce.com"
   }
})

addComponent({
   "$id": "config:org-y",
   "name": "org-y",
   "type": "jtd:salesforce.service",
   "settings": {
      "clientId": "",
      "clientSecret": "",
      "endPoint": "https://xxx.my.salesforce.com"
   }
})

addComponent({
   "$id": "config:org-z",
   "name": "org-z",
   "type": "jtd:salesforce.service",
   "settings": {
      "clientId": "",
      "clientSecret": "",
      "endPoint": "https://xxx.my.salesforce.com"
   }
})

addComponent({
   "$id": "config:openAI",
   "name": "openAI",
   "type": "jtd:open-ai.service",
   "settings": {
      "accessKey": "qds5qgqzs-vdg-6hbrz5hr54bgvs544d",
   }
})

addComponent({
   "$id": "config:einstein",
   "name": "einstein",
   "type": "jtd:einstein-service-factory",
   "icon": "fa:link",
   "settings": {
      "accessKey": "qds5qgqzs-vdg-6hbrz5hr54bgvs544d",
   }
})

function App(): React.ReactElement {
   const org = useService(MockStorageServicePoint)
   const org2 = useService(MockStorageService2Point)

   return <div style={{ margin: 10, display: "grid" }}>
      <span>
         <ServicePointStatus servicePoint={MockStorageServicePoint} />
         {org ? org.location : "<none>"}
      </span>
      <Tabs
         defaultActiveKey="1"
         onSelect={function noRefCheck() { }}
         type="default"
      >
         <Tab title="Service Points" eventKey="0" >
            <div>org1:{org ? org.location : "<none>"}</div>
            <div>org2:{org2 ? org2.location : "<none>"}</div>
            <ServicePointsConfigurator />
         </Tab>
         <Tab title="Storage services" eventKey="1" >
            <ComponentsConfigurator
               title={"Storage services"}
               /* services={["storage"]} */
            />
         </Tab>
      </Tabs>
   </div>
}

const root = window.document.createElement("div")
root.id = "root"
window.document.body.appendChild(root)
ReactDOM.createRoot(root).render(<MountServicePoints services={[MockStorageServicePoint]}>
   <App />
</MountServicePoints>)
