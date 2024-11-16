import React, { useContext } from 'react'
import { EditionContext, EditorDescriptor, EditorValueMatch, ValueProps } from "../interfaces"
import { AST, CommonTypes, convertValueToLiteral, DocumentationSchema, MapLike, Schema } from '@sf-explorer/core'
import { JSONSchema } from '@sf-explorer/core'
import { PropertyDecoration, PropertyRow, PropertyTable } from '@sf-explorer/editors/ui/TableProperties'
import { ElementsEditors } from '..'
import { ExpandableInputHOC } from '@sf-explorer/editors/ui/InputExpandable'
import { ElementJSON, ObjectExpr, ObjectProperty } from '@sf-explorer/core/interpreter/elements'

export function ObjectPropertyRows(props: {
   heading?: React.ReactNode
   fields: ObjectProperty[]
   typings: MapLike<JSONSchema>
   additionals?: JSONSchema
   documentation?: DocumentationSchema
   decorator?: (prop: string, value: any) => PropertyDecoration
   onChange?: (name: string, value: any) => void
}) {
   let { heading, fields, additionals: additional, typings, decorator, onChange } = props

   const values = fields?.reduce((obj, field) => {
      const { name } = field
      if (name !== null) obj[name] = field.value
      return obj
   }, {})

   const onPropertyChange = React.useCallback((name) => (node) => {
      onChange(name, node)
   }, [onChange])

   const rows = []
   for (const name in typings) {
      rows.push(<PropertyRow
         key={rows.length}
         name={name}
         typing={typings[name]}
         value={values[name]}
         decoration={decorator && decorator(name, values[name])}
         onChange={onPropertyChange(name)}
      />)
   }
   for (const name in values) {
      if (typings?.[name] === undefined) {
         rows.push(<PropertyRow
            key={rows.length}
            name={name}
            typing={additional || CommonTypes.any}
            value={values[name]}
            decoration={decorator && decorator(name, values[name])}
            onChange={onPropertyChange(name)}
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
   const env = useContext(EditionContext)
   const onPropertyChange = React.useCallback((p_name: string, p_value: ElementJSON) => {
      const data = value.serialize()
      let found = false
      for (const prop of data.properties) {
         if (prop.key?.value === p_name) {
            prop.value = p_value
            found = true
         }
      }
      if (!found) {
         data.properties.push({
            $type: "ObjectNamedProperty",
            key: {
               $type: "LiteralExpr",
               value: p_name,
            },
            value: p_value,
         })
      }
      value.update(data)
   }, null)
   return <PropertyTable>
      <ObjectPropertyRows
         fields={value.properties}
         typings={typing?.properties}
         onChange={onPropertyChange}
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
