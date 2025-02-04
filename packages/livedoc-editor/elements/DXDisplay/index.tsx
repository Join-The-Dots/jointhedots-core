import React from "react"
import { EditorDescriptor, EditorValueMatch, ValueProps } from "../interfaces"
import { Schema, JSONSchema, DXDisplay } from '@livedoc/core'
import { PropertyTable } from '@livedoc/editor/elements/ui/TableProperties'
import { ElementsEditors } from '..'
import { ObjectEditor } from '../DXObject'
import { ExpandableInputHOC } from "../ui/ExpandableInput"

function LDXDisplayEditor(props: ValueProps<DXDisplay>) {
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
   cls: DXDisplay,
   editor,
   matchType(schema: JSONSchema): EditorValueMatch {
      if (Schema.isType(schema, "display")) return EditorValueMatch.Valid
      return EditorValueMatch.None
   }
})
