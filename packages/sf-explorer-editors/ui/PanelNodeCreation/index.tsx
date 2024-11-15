import { JSONSchema } from "@sf-explorer/core"
import { PropertyRows, PropertyTable } from "../TableProperties"
import { useCallback, useEffect, useState } from "react"
import { ComponentPublication } from "@sf-explorer/core"
import { ComponentEntry, ComponentManifest, ComponentsRegistry } from "@sf-explorer/core"
import { ComponentBrowser } from "../PanelBrowser"
import { createValueFromTyping } from "@sf-explorer/core"
import Stack from "@sf-explorer/editors/ui/Stack"
import Icon from "@sf-explorer/core/ui/Icon"
import Button from "@sf-explorer/editors/ui/Button"
import * as AST from "@sf-explorer/core"

type Selected = {
   component: ComponentEntry
   manifest: ComponentManifest
   templates: AST.TemplateSchema[]
   schema: JSONSchema
}

export function PanelSelectTemplate(props: {
   templates: AST.TemplateSchema[]
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
   onComplete: (component?: ComponentEntry, node?: AST.Any) => void;
   onCancel?: () => void
}): JSX.Element {
   const { service, onComplete, onCancel } = props
   const [component, setComponent] = useState<ComponentEntry>(props.component)
   const [selected, setSelected] = useState<Selected>(null)

   useEffect(() => {
      component && component.fetch().then(manifest => {
         const schema = manifest[service] || AST.CommonTypes.any as JSONSchema
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

   const complete = useCallback(async (data?: AST.Any) => {
      onComplete(selected.component, data)
   }, [selected])

   if (!selected) {
      return <ComponentBrowser
         service={service}
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
