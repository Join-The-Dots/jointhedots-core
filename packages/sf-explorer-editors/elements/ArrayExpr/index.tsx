import React, { useContext } from 'react'
import { ValueProps, EditorDescriptor, EditorValueMatch, EditionContext } from "../interfaces"
import { AST, Schema, CommonTypes } from '@sf-explorer/core'
import { ArrayTable } from '@sf-explorer/editors/ui/TableArray'
import { ElementsEditors } from '..'
import { ExpandableInputHOC } from '@sf-explorer/editors/ui/InputExpandable'
import { createValueFromTyping } from '@sf-explorer/core'
import { JSONSchema } from '@sf-explorer/core'
import { ArrayExpr } from '@sf-explorer/core/interpreter/elements'

function ArrayEditor(props: ValueProps<ArrayExpr>) {
   const { value, typing } = props
   const itemTyping = typing?.items as JSONSchema || CommonTypes.any
   const env = useContext(EditionContext)
   return (<ArrayTable
      items={value.elements.map(x => x.value)}
      itemTyping={typing?.items as JSONSchema || CommonTypes.any}
      onChange={(elements, cset) => {
         /*    const node = getAST(value)
            node.elements = elements
            cset.updates[value.$key] = node
            value.model.commit(cset) */
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
