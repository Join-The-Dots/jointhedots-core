import React from 'react'
import { ValueProps, EditorDescriptor, EditorValueMatch } from "@sf-explorer/editors/ui/editor-context"
import { Schema, CommonTypes } from '@sf-explorer/core'
import { ArrayTable } from '@sf-explorer/editors/ui/TableArray'
import { ElementsEditors } from '..'
import { ExpandableInputHOC } from '@sf-explorer/editors/ui/InputExpandable'
import { createValueFromTyping } from '@sf-explorer/core'
import { JSONSchema } from '@sf-explorer/core'
import { ArrayExpr } from '@sf-explorer/core/interpreter/exprs'

function ArrayEditor(props: ValueProps<ArrayExpr>) {
   const { value, typing } = props
   const itemTyping = typing?.items as JSONSchema || CommonTypes.any
   return (<ArrayTable
      items={value.elements}
      itemTyping={typing?.items as JSONSchema || CommonTypes.any}
      provider={ElementsEditors}
      onChange={(elements) => {
         value.elements = elements
      }}
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

ElementsEditors.registerController({
   name: "Array",
   icon: "bi:list-task",
   cls: ArrayExpr,
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      if (Schema.isType(schema, "array")) return EditorValueMatch.Valid
      if (!schema.type && schema.items) return EditorValueMatch.Valid
      return EditorValueMatch.None
   }
})
