import React from 'react'
import { InputText } from "@livedoc/editor/ui/InputText"
import { ValueProps, EditorDescriptor, EditorValueMatch } from "../interfaces"
import { ElementsEditors } from '..'
import { DXLiteral, Schema, JSONSchema } from '@livedoc/core'
import { MonacoEditorHOC, StandardLanguageProvider } from '@livedoc/editor/ui/MonacoEditorHOC'
import { editor as Editor } from "monaco-editor"
import * as Monaco from "monaco-editor"
import ExpandedZone from '../ui/ExpandedZone'
import { registerMermaidLang } from './lang.mermaid'
import "./style.scss"

export const EditorSOQL = MonacoEditorHOC(new StandardLanguageProvider<void>("apex"))

const FormatEditors = {
   "text/apex": EditorSOQL,
   "text/css": MonacoEditorHOC(new StandardLanguageProvider<void>("css")),
   "text/mermaid": MonacoEditorHOC(new StandardLanguageProvider<void>("mermaid")),
   "text/javascript": MonacoEditorHOC(new StandardLanguageProvider<void>("javascript")),
   "text/typescript": MonacoEditorHOC(new StandardLanguageProvider<void>("typescript")),
   "text/html": MonacoEditorHOC(new StandardLanguageProvider<void>("html")),
   "text/json": MonacoEditorHOC(new StandardLanguageProvider<void>("json")),
   "default": MonacoEditorHOC(new StandardLanguageProvider<void>("text")),
}

registerMermaidLang(Monaco)

export function LiteralInputHOC(defaultPlaceholder?: string) {
   return function LiteralInput(props: ValueProps<DXLiteral>) {
      const { value, typing, onChange, onExpand } = props
      const text = value?.value !== undefined ? `${value.value}` : ""
      const placeholder = typing.examples && typing.examples.toString() || defaultPlaceholder
      const Editor = FormatEditors[typing.format]
      if (Editor) {
         const onValidate = onChange && React.useCallback((model: Editor.ITextModel) => {
            const text = model.getValue()
            if (value) {
               value.update({ $type: "DXLiteral", value: text })
            }
            else {
               onChange({ $type: "DXLiteral", value: text })
            }
         }, [value, typing, onChange])
         return <>
            <div className="LDX-Literal-Input">{typing.format}</div>
            <ExpandedZone onExpand={onExpand}>
               <Editor className="LDX-Literal-Editor" value={text} onChange={onValidate} adjustHeightMax={400} />
            </ExpandedZone>
         </>
      }
      else {
         const onValidate = onChange && React.useCallback((text) => {
            if (value) {
               value.update({ $type: "DXLiteral", value: text })
            }
            else {
               onChange({ $type: "DXLiteral", value: text })
            }
         }, [value, typing, onChange])
         return (<>
            <InputText value={text} placeholder={placeholder} onChange={onValidate} />
         </>)
      }
   }
}

const editor: EditorDescriptor = {
   input: LiteralInputHOC(""),
}

ElementsEditors.registerController({
   name: "Literal",
   icon: "bi:123",
   cls: DXLiteral,
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
