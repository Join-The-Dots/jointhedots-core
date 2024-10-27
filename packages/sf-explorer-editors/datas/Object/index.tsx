import React from 'react'
import { EditorDescriptor, EditorValueMatch, ValueProps } from "@sf-explorer/editors/ui/editor-context"
import { Schema } from '@sf-explorer/core'
import { JSONSchema } from '@sf-explorer/core'
import { PropertyRows, PropertyTable } from '@sf-explorer/editors/ui/TableProperties'
import { DataEditors } from '..'
import { ExpandableInputHOC } from '@sf-explorer/editors/ui/InputExpandable'

function ObjectEditor(props: ValueProps) {
   const { value, typing, onChange } = props
   return <PropertyTable>
      <PropertyRows
         values={value}
         typings={typing.properties}
         provider={DataEditors}
         onChange={(value) => onChange(value)}
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

DataEditors.registerController({
   type: "object",
   icon: "code:symbol/object",
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      if (Schema.isType(schema, "object")) return EditorValueMatch.Valid
      if (!schema.type && schema.properties) return EditorValueMatch.Valid
      return EditorValueMatch.None
   },
   matchValue(value: any): EditorValueMatch {
      if (value instanceof Object && !Array.isArray(value)) return EditorValueMatch.Valid
      return EditorValueMatch.None
   },
   createValue(schema: JSONSchema, prevValue: any): any {
      return {}
   }
})
