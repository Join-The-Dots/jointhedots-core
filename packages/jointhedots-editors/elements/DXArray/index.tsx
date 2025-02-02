import React, { useContext } from 'react'
import { ValueProps, EditorDescriptor, EditorValueMatch, EditionContext } from "../interfaces"
import { Schema, CommonTypes, JSONSchema, DXArray, createValueFromTyping } from '@jointhedots/core'
import { ElementsEditors } from '..'
import { ExpandableInputHOC } from "../ui/ExpandableInput"
import { ArrayTable } from '../ui/TableArray'

function ArrayEditor(props: ValueProps<DXArray>) {
   const { value, typing } = props
   const itemTyping = typing?.items as JSONSchema || CommonTypes.any
   const env = useContext(EditionContext)
   return (<ArrayTable
      items={value.elements.map(x => x.value)}
      itemTyping={typing?.items as JSONSchema || CommonTypes.any}
      onChange={(elements) => {
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
   cls: DXArray,
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      if (Schema.isType(schema, "array")) return EditorValueMatch.Valid
      if (!schema.type && schema.items) return EditorValueMatch.Valid
      return EditorValueMatch.None
   }
})
