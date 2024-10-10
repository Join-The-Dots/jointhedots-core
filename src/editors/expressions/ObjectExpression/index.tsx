import React from 'react'
import { EditorDescriptor, EditorValueMatch, ValueProps } from "editors/ui"
import { Schema } from 'core/ast/schema/helpers'
import { JSONSchema } from 'core/ast/schema'
import { PropertyRows, PropertyTable } from 'editors/ui/PropertiesTable'
import { ExpressionsEditors } from '..'
import { ExpandableInputHOC } from 'editors/ui/ExpandableInput'

function ObjectEditor(props: ValueProps) {
   const { value, typing, onChange } = props
   return <PropertyTable>
      <PropertyRows
         values={value}
         typings={typing.properties}
         provider={ExpressionsEditors}
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

ExpressionsEditors.registerController({
   type: "ObjectExpression",
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
