import { JSONSchema } from '@sf-explorer/core/index'
import { ElementsEditors } from '..'
import { EditionDriver, EditorDescriptor, EditorValueMatch } from '../interfaces'
import { LiteralInputHOC } from '../LiteralExpr'

const editor: EditorDescriptor = {
   input: LiteralInputHOC("none"),
}

ElementsEditors.registerController({
   name: "none",
   icon: "bi:x-circle",
   cls: null,
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      return EditorValueMatch.Valid
   },
   matchValue(value: any): EditorValueMatch {
      if (value === undefined) return EditorValueMatch.Valid
      return EditorValueMatch.None
   },
   createValue(schema: JSONSchema, prevValue: any): any {
      return undefined
   }
}, true)

