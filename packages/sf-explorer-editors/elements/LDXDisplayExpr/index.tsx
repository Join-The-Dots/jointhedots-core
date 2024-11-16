import { EditorDescriptor, EditorValueMatch, ValueProps } from "../interfaces"
import { Schema } from '@sf-explorer/core'
import { JSONSchema } from '@sf-explorer/core'
import { PropertyTable } from '@sf-explorer/editors/ui/TableProperties'
import { ElementsEditors } from '..'
import { ExpandableInputHOC } from '@sf-explorer/editors/ui/InputExpandable'
import { LDXDisplayExpr } from '@sf-explorer/core/interpreter/elements'
import { ObjectEditor } from '../ObjectExpr'

function LDXDisplayEditor(props: ValueProps<LDXDisplayExpr>) {
   const { value, typing, onChange } = props
   return <PropertyTable>
      <ObjectEditor
         value={value.props}
         typing={value.props.typing}
         onChange={null}
      />
   </PropertyTable>
}

const editor: EditorDescriptor = {
   input: ExpandableInputHOC("Display", LDXDisplayEditor),
   panels: {
      "main": {
         view: LDXDisplayEditor,
      }
   }
}

ElementsEditors.registerController({
   name: "Display",
   icon: "bi:columns",
   cls: LDXDisplayExpr,
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      if (Schema.isType(schema, "display")) return EditorValueMatch.Valid
      return EditorValueMatch.None
   }
})
