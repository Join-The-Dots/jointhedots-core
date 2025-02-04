import React from 'react'
import { AttributEditorProps, registerAttributeEditor } from "."
import { WorkbenchAttribut } from "../../ContentPanel/InnerDevice"
import { getComponentViewSync, JSONSchema, ComponentsRegistry } from '@livedoc/core'
import { PropertyTable } from '@livedoc/editor/elements/ui/TableProperties'

export function WorkbenchAttributEditor(props: AttributEditorProps<WorkbenchAttribut>) {
   const { content, onChange } = props
   const module = ComponentsRegistry.acquireComponent(content.componentId)
   const model = getComponentViewSync(module)

   const onProperties = (value) => {
      onChange({
         ...props.content,
         componentProps: value,
      })
   }

   const propertiesValue = content.componentProps
   const propertiesType: JSONSchema = { type: "object", properties: model?.main.getTyping()?.properties }

   return <PropertyTable>
      {"TODO: Create a system with a temporary model dedicate to wrap edited model"}
      {/*  <PropertyTitle title="Component" />
      <ValueEditor
         typing={CommonTypes.view}
         value={{
            type: "import",
            id: content.componentId,
         }}
         provider={ExpressionEditors}
      />
      <PropertyTitle title="Properties" />
      <ValueEditor
         typing={propertiesType}
         value={propertiesValue}
         provider={DataEditors}
         onChange={onProperties}
      /> */}
   </PropertyTable>
}

registerAttributeEditor({
   norm: "workbench",
   editor: WorkbenchAttributEditor,
})
