import { EditorDescriptor, EditorValueMatch, ValueProps } from "@sf-explorer/editors/ui/editor-context"
import { Schema } from '@sf-explorer/core'
import { JSONSchema } from '@sf-explorer/core'
import { PropertyTable } from '@sf-explorer/editors/ui/TableProperties'
import { ElementsEditors } from '..'
import { ExpandableInputHOC } from '@sf-explorer/editors/ui/InputExpandable'
import { LDXElementExpr } from '@sf-explorer/core/interpreter/exprs'
import { ObjectEditor } from '../ObjectExpr'

function LDXElementEditor(props: ValueProps<LDXElementExpr>) {
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
   input: ExpandableInputHOC("Element", LDXElementEditor),
   panels: {
      "main": {
         view: LDXElementEditor,
      }
   }
}

ElementsEditors.registerController({
   name: "Object",
   icon: "bi:columns",
   cls: LDXElementExpr,
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      if (Schema.isType(schema, "display")) return EditorValueMatch.Valid
      return EditorValueMatch.None
   }
})
