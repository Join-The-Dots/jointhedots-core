import React from 'react'
import TextInput from "@sf-explorer/editors/ui/InputText"
import { ValueProps, EditorDescriptor } from "@sf-explorer/editors/ui/editor-context"
import { Schema } from '@sf-explorer/core'
import { JSONSchema } from '@sf-explorer/core'
import { EditorValueMatch } from '@sf-explorer/editors/ui/editor-context'
import { ElementsEditors } from '..'
import { convertTextToExpression } from '@sf-explorer/core'
import { LiteralExpr, ObjectExpr } from '@sf-explorer/core/interpreter/exprs'

function LiteralInput(props: ValueProps<LiteralExpr>) {
   const { value, typing, onChange } = props
   const onValidate = onChange && React.useCallback((text) => {
      onChange(convertTextToExpression(text, typing))
   }, [typing, onChange])
   const text = value?.value !== undefined ? `${value.value}` : ""
   const placeholder = typing.examples && typing.examples.toString()
   return (<>
      <TextInput value={text} placeholder={placeholder} onChange={onValidate} />
   </>)
}

const editor: EditorDescriptor = {
   input: LiteralInput,
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
