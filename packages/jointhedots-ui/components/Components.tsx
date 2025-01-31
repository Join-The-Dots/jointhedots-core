import { ComponentsRegistry, createNewComponent } from "@jointhedots/core/library/components"
import { ComponentBrowser, ComponentsFilteredList } from "./ComponentsBrowser"
import { LabelButton } from "../items"
import { askData } from "../ask"
import { ComponentManifest } from "@jointhedots/core/library/interfaces"

export function generateGUID() {
   const buf = new Uint8Array(16) // create a 16-byte array
   crypto.getRandomValues(buf) // fill buffer with random values
   buf[6] = (buf[6] & 0x0f) | 0x40 // set bits 4-7 of the 7th byte to 0100
   buf[8] = (buf[8] & 0x3f) | 0x80 // set bits 6-7 of the 9th byte to 10
   const guid = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
   return `${guid.substring(0, 8)}-${guid.substring(8, 12)}-${guid.substring(12, 16)}-${guid.substring(16, 20)}-${guid.substring(20)}`
}

function createInitialeManifest(driver: ComponentManifest): ComponentManifest {
   const component_id = "config:" + generateGUID()
   const services = (driver["component"].services || []).reduce((prev, key) => {
      prev[key] = true
      return prev
   }, {})
   return {
      $id: component_id,
      type: driver.$id,
      services,
   }
}

export function AddComponentButton() {
   return <LabelButton
      icon="bi:plus"
      name="Add Connexion"
      content={function () {
         return <ComponentsFilteredList
            display={{ grouped: false, small: true }}
            services={["component"]}
            onSelect={async function (def) {
               const driver = await ComponentsRegistry.acquireComponent(def.component_id).fetch()
               const manifest = createInitialeManifest(driver)

               const newManifest = await askData(`${driver.title}`, {
                  type: "object",
                  properties: {
                     name: { type: "string" },
                     settings: driver["component"].data,
                  }
               }, manifest)

               if (newManifest) {
                  createNewComponent(newManifest)
               }
            }}
         />
      }}
   />
}
export function ComponentsConfigurator(props: {
   title: string
   services?: string[]
}) {
   const { title, services } = props
   return <>
      <h2 className="slds-tile">
         {title}
         <AddComponentButton />
      </h2>
      <ComponentBrowser services={services} />
   </>
}
