import { useMemo, useRef, useState } from "react"
import { toast } from 'react-toastify'
import { createNewComponent, ComponentManifest, JSONSchema, ComponentEntry, updateComponent, acquireComponent, ComponentController, ComponentControllerKey, ComponentEditorKey, ComponentEditor, ComponentEditorProps, ComponentChecking } from "@jointhedots/core"
import { ModalContent, Button } from "react-lightning-design-system"
import Icon, { IconButton } from "../Icon"
import Form from "@rjsf/core"
import validator from '@rjsf/validator-ajv8'
import { CodeEditorHOC, StandardLanguageProvider } from "../CodeEditor"
import { openDialog } from "../Layouts"

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
   const services = (driver.specs["component"].services || []).reduce((prev, key) => {
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
   const controller = await ComponentControllerKey.fetch(driver)
   const editor = await ComponentEditorKey.fetch(driver)

   let manifest = createInitialeManifest(driver_manifest)
   const result = await controller.checkDescriptor(manifest)
   manifest = result?.fixed || manifest

   const newManifest = await openDialog<ComponentManifest>((resolve) => {
      return <ComponentManifestEditor
         created={true}
         driver={driver}
         controller={controller}
         editor={editor}
         manifest={manifest}
         onValidate={resolve}
         onCancel={() => resolve(null)}
      />
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
   const handler = await ComponentControllerKey.fetch(driver)
   const editor = await ComponentEditorKey.fetch(driver)
   await driver.fetch()

   const newManifest = await openDialog<ComponentManifest>((resolve) => {
      return <ComponentManifestEditor
         created={false}
         driver={driver}
         controller={handler}
         editor={editor}
         manifest={manifest}
         onValidate={resolve}
         onCancel={() => resolve(null)}
      />
   })

   if (newManifest) {
      updateComponent(newManifest)
   }
}

const DefaultEditor = (props: ComponentEditorProps) => {
   const { schema, manifest, onChange, onValidate, onCancel } = props
   const form_ref = useRef<Form>()
   return <><Form
      ref={form_ref}
      schema={schema as any}
      validator={validator}
      formData={manifest}
      templates={{ ButtonTemplates: { SubmitButton: () => <></> } }}
      onChange={(e) => onChange(e.formData)}
   />
      <Button type="brand" onClick={() => onValidate(manifest)}>Apply</Button>
      {onCancel && <Button type="neutral" onClick={onCancel}>Cancel</Button>}
   </>
}

const JSONManifestEditor = (props: ComponentEditorProps) => {
   const { descriptor, schema, manifest, onChange } = props
   const value = useMemo(() => JSON.stringify(manifest, null, 2), [manifest])
   return <JSONEditor value={value} adjustHeightMax={300} />
}

export function ComponentManifestEditor(props: {
   driver: ComponentEntry
   controller: ComponentController
   editor?: ComponentEditor
   manifest: ComponentManifest
   created: boolean
   onValidate: (manifest: ComponentManifest) => void
   onCancel?: () => void
}) {
   const { driver, controller, editor, created, onValidate, onCancel } = props
   const [manifest, setManifest] = useState(props.manifest)
   const descriptor = ComponentControllerKey.spec(driver)
   const driver_manifest = driver.manifest
   const [result, setResult] = useState<ComponentChecking>(null)
   const [codeMode, setCodeMode] = useState(false)

   const applyManifest = async (manifest) => {
      const result = await controller.checkDescriptor(manifest)
      if (!result || (!result.issues?.length && !result.fixed)) {
         onValidate(manifest)
      }
      else {
         setManifest(manifest)
         setResult(result)
      }
   }

   const schema = useMemo<JSONSchema>(() => ({
      type: "object",
      properties: {
         title: { type: "string" },
         ...descriptor.attributes,
      },
      required: ["name", ...Object.keys(descriptor.attributes)],
   }), [descriptor])

   let Editor = (created ? editor?.creator || editor?.editor : editor?.editor) || DefaultEditor
   if (codeMode) Editor = JSONManifestEditor

   return <div>
      <div style={{ position: "relative" }}>
         <h1 style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, paddingTop: 12, fontSize: "200%" }}>
            <Icon name={driver_manifest.icon || "blank"} style={{ fontSize: "150%" }} />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
               <div style={{ fontSize: "80%" }}>{driver_manifest.title || driver_manifest.$id} </div>
               <div style={{ fontSize: "50%" }}>{manifest.title || "(no title)"}</div>
            </div>
         </h1>
         <div style={{ position: "absolute", top: 10, right: 10 }}>
            <IconButton name="bi:code" onClick={() => setCodeMode(!codeMode)} />
         </div>
      </div>
      <ModalContent className="slds-p-horizontal_small">
         <Editor
            created={created}
            manifest={manifest}
            descriptor={descriptor}
            schema={schema}
            onChange={setManifest}
            onValidate={applyManifest}
            onCancel={onCancel}
         />
         {result?.issues?.length && <div className='JDT-ErrorBoundary'>
            {result.issues.map(issue => {
               return <div>
                  {issue.message}
               </div>
            })}
         </div>}
      </ModalContent>
      <div style={lightReliefStyle}>{manifest.$id}</div>
   </div>
}
const lightReliefStyle = {
   position: "absolute",
   float: "right",
   color: "white",
   textShadow: '1px 1px 0 rgba(0, 0, 0, 0.5)',
   fontSize: "80%",
} as any