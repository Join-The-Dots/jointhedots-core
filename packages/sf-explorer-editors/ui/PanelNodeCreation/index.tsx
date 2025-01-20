import {
   AST, CommonTypes, ElementJSON, JSONSchema, TemplateSchema,
   ComponentPublication, ComponentEntry, ComponentManifest, ComponentsRegistry
} from "@sf-explorer/core"
import { useCallback, useEffect, useState } from "react"
import { ComponentBrowser } from "@sf-explorer/core/ui/components/ComponentsBrowser"
import Stack from "@sf-explorer/editors/ui/Stack"
import Icon from "@sf-explorer/core/ui/Icon"
import Button from "@sf-explorer/editors/ui/Button"

type Selected = {
   component: ComponentEntry
   manifest: ComponentManifest
   templates: TemplateSchema[]
   schema: JSONSchema
}

export function PanelSelectTemplate(props: {
   templates: TemplateSchema[]
   onValidate: (data: any) => void
   onCancel: () => void
}) {
   const { templates, onValidate, onCancel } = props
   return <Stack padding={10} vertical>
      {templates.map((template) => {
         const { title, icon, description } = template
         return <Stack title={description} padding={10} onClick={() => {
            onValidate(template.content)
         }}>
            <Stack.FixedDock><Icon name={icon} /></Stack.FixedDock>
            <Stack.FlexDock> <b style={{ textTransform: "capitalize" }}>{title}</b></Stack.FlexDock>
         </Stack>
      })}
      <Stack.FixedDock>
         <Button onClick={() => onCancel()}>Cancel</Button>
      </Stack.FixedDock>
   </Stack >
}

export function PanelNodeCreation(props: {
   component?: ComponentEntry,
   service: string
   onComplete: (component?: ComponentEntry, params?: ElementJSON) => void
   onCancel?: () => void
}): JSX.Element {
   const { service, onComplete, onCancel } = props
   const [component, setComponent] = useState<ComponentEntry>(props.component)
   const [selected, setSelected] = useState<Selected>(null)

   useEffect(() => {
      component && component.fetch().then(manifest => {
         const schema = manifest[service] || CommonTypes.any as JSONSchema
         const { templates } = manifest
         if (templates) {
            setSelected({
               component,
               manifest,
               schema,
               templates,
            })
         }
         else {
            onComplete(component)
         }
      })
   }, [component])

   const select = useCallback(async (pub?: ComponentPublication) => {
      setComponent(ComponentsRegistry.acquireComponent(pub.component_id))
   }, [])

   const complete = useCallback(async (params?: ElementJSON) => {
      onComplete(selected.component, params)
   }, [selected])

   if (!selected) {
      return <ComponentBrowser
         services={[service]}
         onSelect={select}
      />
   }
   else if (selected) {
      return <PanelSelectTemplate
         templates={selected.templates}
         onValidate={complete}
         onCancel={onCancel ? onCancel : () => setSelected(null)}
      />
   }
}
