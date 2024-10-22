import { JSONSchema } from "@livedoc/core/ast/schema"
import { PropertyRows, PropertyTable } from "../TableProperties"
import { DataEditors } from "@livedoc/editors/datas"
import { useCallback, useEffect, useState } from "react"
import { ComponentPublication } from "@livedoc/core/library/interfaces"
import { ComponentEntry, ComponentManifest, ComponentsRegistry } from "@livedoc/core/library"
import { ComponentBrowser } from "../PanelBrowser"
import { createValueFromTyping } from "@livedoc/core/ast/producer"
import Stack from "@livedoc/editors/ui/Stack"
import Icon from "@livedoc/core/ui/Icon"
import Button from "@livedoc/editors/ui/Button"
import * as AST from "@livedoc/core/ast/nodes"

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
   component?: ComponentEntry,
   service: string
   onComplete: (component?: ComponentEntry, node?: AST.Any) => void;
   onCancel?: () => void
}): JSX.Element {
   const { service, onComplete, onCancel } = props
   const [component, setComponent] = useState<ComponentEntry>(props.component)
   const [selected, setSelected] = useState<Selected>(null)

   useEffect(() => {
      component && component.fetch().then(manifest => {
         const schema = manifest[service] as JSONSchema
         setSelected({
            component,
            manifest,
            schema,
            data: createValueFromTyping(schema)
         })
      })
   }, [component])

   const select = useCallback(async (pub?: ComponentPublication) => {
      setComponent(ComponentsRegistry.acquireComponent(pub.component_id))
   }, [])

   const complete = useCallback(async (data?: AST.Any) => {
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
         onCancel={onCancel ? onCancel : () => setSelected(null)}
      />
   }
}
