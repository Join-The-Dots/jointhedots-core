import { JSONSchema } from '@livedoc/core'
import { ElementsEditors } from '..'
import { EditionDriver, EditorDescriptor, EditorValueMatch } from '../interfaces'
import { LiteralInputHOC } from '../DXLiteral'

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
   createValue(schema: JSONSchema, prevValue: any): any {
      return undefined
   }
}, true)

