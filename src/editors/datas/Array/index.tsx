import React from 'react'
import { ValueProps, EditorDescriptor, EditorValueMatch } from "editors/ui"
import { Schema, CommonTypes } from 'core/ast/schema/helpers'
import { ArrayTable } from 'editors/ui/TableArray'
import { DataEditors } from '..'
import { ExpandableInputHOC } from 'editors/ui/InputExpandable'
import { createValueFromTyping } from 'core/ast/producer'
import { JSONSchema } from 'core/ast/schema'

function ArrayEditor(props: ValueProps) {
   const { value, typing, onChange } = props
   const itemTyping = typing?.items as JSONSchema || CommonTypes.any
   return (<ArrayTable
      items={value}
      itemTyping={typing?.items as JSONSchema || CommonTypes.any}
      provider={DataEditors}
      onChange={(value) => onChange(value)}
      onCreate={() => createValueFromTyping(itemTyping)}
   />)
}

const editor: EditorDescriptor = {
   input: ExpandableInputHOC("Array", ArrayEditor),
   panels: {
      "main": {
         view: ArrayEditor,
      }
   }
}

DataEditors.registerController({
   type: "array",
   icon: "code:symbol/list",
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      if (Schema.isType(schema, "array")) return EditorValueMatch.Valid
      if (!schema.type && schema.items) return EditorValueMatch.Valid
      return EditorValueMatch.None
   },
   matchValue(value: any): EditorValueMatch {
      if (Array.isArray(value)) return EditorValueMatch.Valid
      return EditorValueMatch.None
   },
   createValue(schema: JSONSchema, prevValue: any): any {
      return []
   }
})
