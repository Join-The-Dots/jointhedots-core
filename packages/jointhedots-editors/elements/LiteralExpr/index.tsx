import React, { useContext } from 'react'
import TextInput from "@jointhedots/editors/ui/InputText"
import { ValueProps, EditorDescriptor, EditorValueMatch } from "../interfaces"
import { ElementsEditors } from '..'
import { LiteralExpr, Schema, JSONSchema } from '@jointhedots/core'
import { MonacoEditorHOC, StandardLanguageProvider } from '@jointhedots/editors/ui/MonacoEditorHOC'

export const EditorSOQL = MonacoEditorHOC(new StandardLanguageProvider<void>("apex"))

export function LiteralInputHOC(defaultPlaceholder?: string) {
   return function LiteralInput(props: ValueProps<LiteralExpr>) {
      const { value, typing, onChange } = props
      const onValidate = onChange && React.useCallback((text) => {
         if (value) {
            value.update({ $type: "LiteralExpr", value: text })
         }
         else {
            onChange({ $type: "LiteralExpr", value: text })
         }
      }, [typing, onChange])
      const text = value?.value !== undefined ? `${value.value}` : ""
      const placeholder = typing.examples && typing.examples.toString() || defaultPlaceholder
      return (<>
         <TextInput value={text} placeholder={placeholder} onChange={onValidate} />
      </>)
   }
}

const editor: EditorDescriptor = {
   input: LiteralInputHOC(""),
}

ElementsEditors.registerController({
   name: "Literal",
   icon: "bi:123",
   cls: LiteralExpr,
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      if (Schema.isType(schema, "string")) return EditorValueMatch.Valid
      if (Schema.isType(schema, "number")) return EditorValueMatch.Valid
      if (Schema.isType(schema, "boolean")) return EditorValueMatch.Valid
      return EditorValueMatch.None
   },
   createValue(schema: JSONSchema, prevValue: any): any {
      return ""
   }
})
