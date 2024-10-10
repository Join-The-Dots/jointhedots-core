import React from 'react'
import TextInput from "editors/ui/InputText"
import { ValueProps, EditorDescriptor } from "editors/ui"
import { Schema } from 'core/ast/schema/helpers'
import { JSONSchema } from 'core/ast/schema'
import { EditorValueMatch } from 'editors/ui'
import { ExpressionsEditors } from '..'
import { convertTextToExpression } from 'core/ast/producer'

function LiteralInput(props: ValueProps) {
   const { value, typing, onChange } = props
   const onValidate = onChange && React.useCallback((text) => {
      onChange(convertTextToExpression(text, typing))
   }, [typing, onChange])
   const text = value !== undefined ? value.toString() : ""
   const placeholder = typing.examples && typing.examples.toString()
   return (<>
      <TextInput value={text} placeholder={placeholder} onChange={onValidate} />
   </>)
}

const editor: EditorDescriptor = {
   input: LiteralInput,
}

ExpressionsEditors.registerController({
   type: "Literal",
   icon: "code:symbol/literal",
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      if (Schema.isType(schema, "string")) return EditorValueMatch.Valid
      if (Schema.isType(schema, "number")) return EditorValueMatch.Valid
      if (Schema.isType(schema, "boolean")) return EditorValueMatch.Valid
      return EditorValueMatch.None
   },
   matchValue(value: any): EditorValueMatch {
      const type = typeof value
      if (type === "string") return EditorValueMatch.Valid
      if (type === "number") return EditorValueMatch.Valid
      if (type === "boolean") return EditorValueMatch.Valid
      return EditorValueMatch.None
   },
   createValue(schema: JSONSchema, prevValue: any): any {
      return ""
   }
})
