import React from 'react'
import { EditorDescriptor, EditorValueMatch, IEditorProvider, ValueProps } from "@sf-explorer/editors/ui/editor-context"
import { CommonTypes, DocumentationSchema, MapLike, Schema } from '@sf-explorer/core'
import { JSONSchema } from '@sf-explorer/core'
import { PropertyDecoration, PropertyRow, PropertyTable } from '@sf-explorer/editors/ui/TableProperties'
import { ElementsEditors } from '..'
import { ExpandableInputHOC } from '@sf-explorer/editors/ui/InputExpandable'
import { ObjectExpr, ObjectProperty } from '@sf-explorer/core/interpreter/exprs'

export function ObjectPropertyRows(props: {
   heading?: React.ReactNode
   fields: ObjectProperty[]
   typings: MapLike<JSONSchema>
   additionals?: JSONSchema
   documentation?: DocumentationSchema
   provider: IEditorProvider
   decorator?: (prop: string, value: any) => PropertyDecoration
   onChange?: (values: { [name: string]: any }) => void
}) {
   let { heading, fields, additionals: additional, typings, provider, decorator } = props

   const values = fields?.reduce((obj, field) => {
      const { name } = field
      if (name !== null) obj[name] = field.value
      return obj
   }, {})

   const onChange = React.useCallback((name) => (value) => {
      /* props.onChange?.({
         ...props.values,
         [name]: value,
      }) */
   }, null)

   const rows = []
   for (const name in typings) {
      rows.push(<PropertyRow
         key={rows.length}
         name={name}
         typing={typings[name]}
         value={values[name]}
         provider={provider}
         decoration={decorator && decorator(name, values[name])}
         onChange={onChange(name)}
      />)
   }
   for (const name in values) {
      if (typings?.[name] === undefined) {
         rows.push(<PropertyRow
            key={rows.length}
            name={name}
            typing={additional || CommonTypes.any}
            value={values[name]}
            provider={provider}
            decoration={decorator && decorator(name, values[name])}
            onChange={onChange(name)}
         />)
      }
   }
   //const sections = createSectionMap(Object.keys(values), typings, props.documentation)
   return (<>
      {rows.length > 0 && heading}
      {rows}
   </>)
}
export function ObjectEditor(props: ValueProps<ObjectExpr>) {
   const { value, typing, onChange } = props
   return <PropertyTable>
      <ObjectPropertyRows
         fields={value.properties}
         typings={typing?.properties}
         provider={ElementsEditors}
      />
   </PropertyTable>
}

const editor: EditorDescriptor = {
   input: ExpandableInputHOC("Object", ObjectEditor),
   panels: {
      "main": {
         view: ObjectEditor,
      }
   }
}

ElementsEditors.registerController({
   name: "Object",
   icon: "bi:braces",
   cls: ObjectExpr,
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      if (Schema.isType(schema, "object")) return EditorValueMatch.Valid
      if (!schema.type && schema.properties) return EditorValueMatch.Valid
      return EditorValueMatch.None
   }
})
