import { useMemo, useRef, useState } from "react"
import { toast } from 'react-toastify'
import { createNewComponent, ComponentManifest, ComponentDescriptor, JSONSchema, ComponentEntry, updateComponent, acquireComponent, acquireResource, ComponentService, ComponentServiceKey, ComponentEditorKey, ComponentEditor, ComponentEditorProps, ComponentChecking } from "@jointhedots/core"
import { ModalContent, ModalFooter, Tab, Tabs, Button, Alert, Modal } from "react-lightning-design-system"
import { openDialog } from "../openDialog"
import Icon from "../Icon"
import Form from "@rjsf/core"
import validator from '@rjsf/validator-ajv8'
import { CodeEditorHOC, StandardLanguageProvider } from "../CodeEditor"

const JSONEditor = CodeEditorHOC(new StandardLanguageProvider("json"))

function generateGUID() {
   const buf = new Uint8Array(16) // create a 16-byte array
   crypto.getRandomValues(buf) // fill buffer with random values
   buf[6] = (buf[6] & 0x0f) | 0x40 // set bits 4-7 of the 7th byte to 0100
   buf[8] = (buf[8] & 0x3f) | 0x80 // set bits 6-7 of the 9th byte to 10
   const guid = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
   return `${guid.substring(0, 8)}-${guid.substring(8, 12)}-${guid.substring(12, 16)}-${guid.substring(16, 20)}-${guid.substring(20)}`
}

export function createInitialeManifest(driver: ComponentManifest): ComponentManifest {
   const component_id = "config:" + generateGUID()
   const services = (driver["component"].services || []).reduce((prev, key) => {
      prev[key] = true
      return prev
   }, {})
   for (const tag of driver.tags) {
      if (tag.startsWith("component.")) {
         const key = tag.slice("component.".length)
         services[key] = true
      }
   }
   return {
      $id: component_id,
      type: driver.$id,
      services,
   }
}

export async function createComponentManifest(driver: ComponentEntry, service?: string) {
   const driver_manifest = await driver.fetch()
   const handler = await ComponentServiceKey.fetch(driver)
   const editor = await ComponentEditorKey.fetch(driver)

   let manifest = createInitialeManifest(driver_manifest)
   const result = await handler.checkDescriptor(manifest)
   manifest = result?.fixed || manifest

   const newManifest = await openDialog<ComponentManifest>((resolve) => {
      return <ComponentManifestEditor driver={driver} handler={handler} editor={editor} manifest={manifest} onValidate={resolve} />
   })

   if (newManifest) {
      if (!service || newManifest.services?.[service]) {
         return createNewComponent(newManifest)
      }
      else {
         toast.error(`Component creation invalid for service '${service}'`)
      }
   }
   return null
}

export async function editComponentManifest(manifest: ComponentManifest) {
   const driver = acquireComponent(manifest.type)
   const handler = await ComponentServiceKey.fetch(driver)
   const editor = await ComponentEditorKey.fetch(driver)
   await driver.fetch()

   const newManifest = await openDialog<ComponentManifest>((resolve) => {
      return <ComponentManifestEditor driver={driver} handler={handler} editor={editor} manifest={manifest} onValidate={resolve} />
   })

   if (newManifest) {
      updateComponent(newManifest)
   }
}

const DefaultEditor: ComponentEditor = {
   panels: {
      "Form": {
         view: (props: ComponentEditorProps) => {
            const { descriptor, schema, manifest, onChange } = props
            const form_ref = useRef<Form>()
            return <Form
               ref={form_ref}
               schema={schema}
               validator={validator}
               formData={manifest}
               templates={{ ButtonTemplates: { SubmitButton: () => <></> } }}
               //onSubmit={(e) => onChange(e.formData)}
               onChange={(e) => onChange(e.formData)}
            />
         }
      },
      "JSON": {
         view: (props: ComponentEditorProps) => {
            const { descriptor, schema, manifest, onChange } = props
            const value = useMemo(() => JSON.stringify(manifest, null, 2), [manifest])
            return <JSONEditor value={value} adjustHeightMax={300} />
         }
      }
   },
}

export function ComponentManifestEditor(props: {
   driver: ComponentEntry
   handler: ComponentService
   editor?: ComponentEditor
   manifest: ComponentManifest
   onValidate: (manifest: ComponentManifest) => void
}) {
   const { driver, handler, editor, onValidate } = props
   const [manifest, setManifest] = useState(props.manifest)
   const descriptor = ComponentServiceKey.descriptor(driver)
   const driver_manifest = driver.manifest
   const [result, setResult] = useState<ComponentChecking>(null)

   const apply = async () => {
      const result = await handler.checkDescriptor(manifest)
      if (!result || (!result.issues?.length && !result.fixed)) {
         onValidate(manifest)
      }
      else {
         setResult(result)
      }
   }

   const schema = useMemo<JSONSchema>(() => ({
      type: "object",
      properties: {
         name: { type: "string" },
         ...descriptor.attributes,
      },
      required: ["name", ...Object.keys(descriptor.attributes)],
   }), [descriptor])

   const panels: ComponentEditor["panels"] = {
      ...editor?.panels,
      ...DefaultEditor.panels,
   }

   const tabs = []
   let defaultActiveKey = null
   for (const key in panels) {
      const View = panels[key].view
      tabs.push(<Tab key={key} title={key} eventKey={key} >
         <View manifest={manifest} descriptor={descriptor} schema={schema} onChange={setManifest} />
      </Tab>)
      if (defaultActiveKey === null) defaultActiveKey = key
   }

   return <div>
      <h1 style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, paddingTop: 12, fontSize: "200%" }}>
         <Icon name={driver_manifest.icon || "blank"} style={{ fontSize: "150%" }} />
         {driver_manifest.title || driver_manifest.$id}
      </h1>
      <ModalContent className="slds-p-horizontal_small">
         <Tabs
            defaultActiveKey={defaultActiveKey}
            onSelect={function noRefCheck() { }}
            type="default"
         >
            {tabs}
         </Tabs>
      </ModalContent>
      <ModalFooter>
         {result?.issues?.length && <div className='JDT-ErrorBoundary'>
            {result.issues.map(issue => {
               return <div>
                  {issue.message}
               </div>
            })}
         </div>}
         <Button type="brand" onClick={apply}>Apply</Button>
         <Button type="neutral" onClick={() => onValidate(null)}>Cancel</Button>
      </ModalFooter>
   </div>
}
