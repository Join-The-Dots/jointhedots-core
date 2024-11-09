import React from 'react'
import { EditorDescriptor, EditorValueMatch, ValueProps } from "@sf-explorer/editors/ui/editor-context"
import { Schema } from '@sf-explorer/core'
import { JSONSchema } from '@sf-explorer/core'
import { PropertyRows, PropertyTable } from '@sf-explorer/editors/ui/TableProperties'
import { ExpressionsEditors } from '..'
import { ExpandableInputHOC } from '@sf-explorer/editors/ui/InputExpandable'
import { ObjectAssignProperty, ObjectExpr } from '@sf-explorer/core/interpreter/exprs'

function ObjectEditor(props: ValueProps<ObjectExpr>) {
   const { value, typing, onChange } = props
   const items = value.properties?.reduce((obj, field) => {
      if (field instanceof ObjectAssignProperty) {
         obj[field.key.read(null)] = field
      }
      return obj
   }, {})
   return <PropertyTable>
      <PropertyRows
         values={items}
         typings={typing.properties}
         provider={ExpressionsEditors}
         onChange={(props) => {
         }}
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

ExpressionsEditors.registerController({
   name: "Object",
   icon: "code:symbol/object",
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      if (Schema.isType(schema, "object")) return EditorValueMatch.Valid
      if (!schema.type && schema.properties) return EditorValueMatch.Valid
      return EditorValueMatch.None
   },
   matchValue(value: ObjectExpr): EditorValueMatch {
      if (value instanceof Object && !Array.isArray(value)) return EditorValueMatch.Valid
      return EditorValueMatch.None
   },
   createValue(schema: JSONSchema, prevValue: any): any {
      return {}
   }
})
