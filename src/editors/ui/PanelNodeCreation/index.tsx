import { JSONSchema } from "core/AST/schema"
import { PropertyRows, PropertyTable } from "../PropertiesTable"
import { DataEditors } from "editors/datas"
import { useCallback, useState } from "react"
import { ComponentPublication } from "core/components/interfaces"
import { ComponentEntry, ComponentManifest, ComponentsRegistry } from "core/components"
import { ASTNode } from "core/AST"
import { ComponentBrowser } from "../PanelBrowser"
import { createValueFromTyping } from "core/AST/ast-producer"
import Stack from "components/Stack"
import Icon from "components/Icon"
import Button from "lexical-editor/ui/Button"

export function DataEditor(props: {
   data: any
   schema: JSONSchema
   onChange: (data: any) => void
}) {
   const { data, schema, onChange } = props
   return <PropertyTable>
      {schema?.properties && <PropertyRows
         typings={schema?.properties}
         values={data}
         provider={DataEditors}
         onChange={onChange}
      />}
   </PropertyTable>
}

export function DataEditorDialog(props: {
   manifest: ComponentManifest
   data: any
   schema: JSONSchema
   onValidate: (data: any) => void
   onCancel: () => void
}) {
   const { manifest, data, schema, onValidate, onCancel } = props
   const [edited, setEdited] = useState(data)
   const { title, icon } = manifest
   return <Stack padding={10} vertical>
      <Stack title={manifest.description} padding={10}>
         <Stack.FixedDock><Icon name={icon} /></Stack.FixedDock>
         <Stack.FlexDock> <b style={{ textTransform: "capitalize" }}>{title || manifest['id']}</b></Stack.FlexDock>
      </Stack>
      <DataEditor
         schema={schema}
         data={edited}
         onChange={setEdited}
      />
      <Stack gap={5} padding={10}>
         <Stack.FixedDock>
            <Button onClick={() => onValidate(edited)}>OK</Button>
         </Stack.FixedDock>
         <Stack.FixedDock>
            <Button onClick={() => onCancel()}>Cancel</Button>
         </Stack.FixedDock>
      </Stack>
   </Stack >
}

type Selected = {
   component: ComponentEntry
   manifest: ComponentManifest
   schema: JSONSchema
   data: any
}

export function PanelNodeCreation(props: {
   service: string
   onComplete: (component?: ComponentEntry, node?: ASTNode) => void;
   onCancel: () => void
}): JSX.Element {
   const { service, onComplete, onCancel } = props
   const [selected, setSelected] = useState<Selected>(null)

   const select = useCallback(async (pub: ComponentPublication) => {
      const component = ComponentsRegistry.acquireComponent(pub.component_id)
      const manifest = await component.fetch()
      const schema = manifest[service] as JSONSchema
      setSelected({
         component,
         manifest,
         schema,
         data: createValueFromTyping(schema)
      })
   }, null)

   const complete = useCallback(async (data?: ASTNode) => {
      onComplete(selected.component, data)
   }, [selected])

   if (!selected) {
      return <ComponentBrowser
         service={service}
         onSelect={select}
      />
   }
   else {
      return <DataEditorDialog
         manifest={selected.manifest}
         schema={selected.schema}
         data={selected.data}
         onValidate={complete}
         onCancel={() => setSelected(null)}
      />
   }
}
