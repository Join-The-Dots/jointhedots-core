import { useMemo, useRef, useState } from "react"
import { toast } from 'react-toastify'
import {
   ComponentManifest, JSONSchema, ComponentEntry, acquireComponent, ComponentController,
   ComponentControllerKey, ComponentEditor, ComponentEditorProps, ComponentChecking,
   EditorKey, unregisterComponent, saveComponent,
   saveComponentManifest
} from "@jointhedots/core"
import { ModalContent, Button } from "react-lightning-design-system"
import Form from "@rjsf/core"
import validator from '@rjsf/validator-ajv8'
import { CodeEditorHOC, StandardLanguageProvider } from "../CodeEditor"
import { createPanel } from "../Layouts"
import { ButtonIcon } from "../Inputs"

const JSONEditor = CodeEditorHOC(new StandardLanguageProvider("json"))

function generateGUID() {
   const buf = new Uint8Array(16) // create a 16-byte array
   crypto.getRandomValues(buf) // fill buffer with random values
   return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function initComponentManifest(driver: ComponentManifest): ComponentManifest {
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

export async function createComponent(driver: ComponentEntry, service?: string): Promise<ComponentEntry> {
   const driver_manifest = await driver.fetch()
   const controller = await ComponentControllerKey.fetch(driver)

   let manifest = initComponentManifest(driver_manifest)
   const result = await controller.checkDescriptor(manifest)
   manifest = result?.fixed || manifest

   const component = acquireComponent(manifest.$id)
   component.manifest = manifest

   const newManifest = await new Promise<ComponentManifest>(async (resolve) => {
      let done = false
      const panel = createPanel()
      const editor = await EditorKey.fetch(component)
      panel.display({
         title: `New: ${driver_manifest.title}`,
         icon: `${driver_manifest.icon}|bi:plus-circle-fill[RB,info]`,
         content: <ComponentManifestEditor
            created={true}
            driver={driver}
            controller={controller}
            editor={editor}
            manifest={manifest}
            onValidate={(x) => { done = true; resolve(x); panel.close() }}
            onCancel={() => { panel.close() }}
         />,
         onClose: () => {
            if (!done) {
               done = true
               resolve(undefined)
            }
         },
      })
      panel.open("side")
   })

   if (newManifest) {
      if (!service || newManifest.services?.[service]) {
         await saveComponentManifest(newManifest)
         return component
      }
      else {
         toast.error(`Component creation invalid for service '${service}'`)
      }
   }
   unregisterComponent(component.id)
   return null
}

export async function editComponentManifest(manifest: ComponentManifest) {
   const component = acquireComponent(manifest.$id)
   component.manifest = manifest
   return editComponent(component)
}

export async function editComponent(component: ComponentEntry) {
   const manifest = await component.fetch()
   const driver = acquireComponent(manifest.type)
   const driver_manifest = await driver.fetch()
   const handler = await ComponentControllerKey.fetch(driver)
   const editor = await EditorKey.fetch(component)
   const newManifest = await new Promise<typeof manifest>(resolve => {
      const icon = manifest.icon || `avatar:${manifest.title}`
      const panel = createPanel()
      let done = false
      panel.display({
         title: `Edit: ${manifest.title || driver_manifest.title}`,
         icon: `${icon}|bi:pencil-fill[RB,info]`,
         content: <ComponentManifestEditor
            created={false}
            driver={driver}
            controller={handler}
            editor={editor}
            manifest={manifest}
            onValidate={(x) => { done = true; resolve(x); panel.close() }}
            onCancel={() => { panel.close() }}
         />,
         onClose: () => {
            if (!done) {
               done = true
               resolve(null)
            }
         },
      })
      panel.open("side")
   })

   if (newManifest) {
      await saveComponentManifest(newManifest)
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
      <div style={{ position: "relative", minHeight: "2.5em" }}>
         {/*<h1 style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, paddingTop: 12, fontSize: "200%" }}>
            <Icon name={driver_manifest.icon || "blank"} style={{ fontSize: "150%" }} />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
               <div style={{ fontSize: "80%" }}>{driver_manifest.title || driver_manifest.$id} </div>
               <div style={{ fontSize: "50%" }}>{manifest.title || "(no title)"}</div>
            </div>
         </h1>*/}
         <div style={lightReliefStyle}>{manifest.$id}</div>
         <div style={{ position: "absolute", top: 0, right: 10 }}>
            <ButtonIcon icon="bi:code" onClick={() => setCodeMode(!codeMode)} />
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
   </div>
}
const lightReliefStyle = {
   position: "absolute",
   float: "right",
   color: "white",
   textShadow: '1px 1px 0 rgba(0, 0, 0, 0.5)',
   fontSize: "80%",
} as any