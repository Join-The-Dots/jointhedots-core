import React from "react"
import { CommonTypes } from "@livedoc/core/ast/schema/helpers"
import { EditorDescriptor, ValueProps } from "@livedoc/editor/elements/interfaces"
import { PropertyTable } from "@livedoc/editor/elements/ui/TableProperties"
import ValueEditor from "@livedoc/editor/elements/ui/ElementEditor"
import { ExpandableInputHOC } from "@livedoc/editor/elements/ui/ExpandableInput"
import { ElementsEditors } from "@livedoc/editor/elements"
import { DXDisplay } from "@livedoc/core"

function MermaidEditor(props: ValueProps<any>) {
   const { value, onChange } = props
   return (<PropertyTable>
      <div style={{ marginTop: 10 }}>{"Code"}</div>
      <ValueEditor
         value={value.code}
         typing={CommonTypes.string}
         onChange={(code) => onChange({ ...value, code })}
      />
   </PropertyTable>)
}

const editor: EditorDescriptor = {
   input: ExpandableInputHOC("Mermaid", MermaidEditor),
   panels: {
      "main": {
         view: MermaidEditor,
      }
   }
}

ElementsEditors.registerController({
   name: "std:mermaid",
   icon: "code:symbol/function",
   cls: DXDisplay,
   editor,
})
