import React from 'react'
import { ValueProps, EditorDescriptor, EditorValueMatch } from "@livedoc/editors/ui"
import { Schema, CommonTypes } from '@livedoc/core/ast/schema/helpers'
import { ArrayTable } from '@livedoc/editors/ui/TableArray'
import { ExpressionsEditors } from '..'
import { ExpandableInputHOC } from '@livedoc/editors/ui/InputExpandable'
import { createValueFromTyping } from '@livedoc/core/ast/producer'
import { JSONSchema } from '@livedoc/core/ast/schema'

function ArrayEditor(props: ValueProps) {
   const { value, typing, onChange } = props
   const itemTyping = typing?.items as JSONSchema || CommonTypes.any
   return (<ArrayTable
      items={value}
      itemTyping={typing?.items as JSONSchema || CommonTypes.any}
      provider={ExpressionsEditors}
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

ExpressionsEditors.registerController({
   type: "ArrayExpression",
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
