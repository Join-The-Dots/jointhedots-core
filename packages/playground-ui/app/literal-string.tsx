
import { MonacoEditorHOC } from "@jointhedots/editors/ui/MonacoEditorHOC"
import { StandardLanguageProvider } from "@jointhedots/ui/CodeEditor"
import { EmbedSyntax, parseTextTemplate } from "@jointhedots/core/ast"
import { renderRoot } from "../config"
import { useState } from "react"

const JsonEditor = MonacoEditorHOC(new StandardLanguageProvider("json"))

function ApplicationRoot() {
   const [text, setText] = useState("My \\$(val1) = $( val1 )")
   const [data, setData] = useState(`{"val1":42}`)
   let result = ""
   try {
      const tmpl = parseTextTemplate(text, EmbedSyntax.DollarBracket)
      const ctx = {
         vars: JSON.parse(data)
      }
      result = tmpl.evaluate(ctx)
   }
   catch (e) {
      result = e.toString()
   }
   return <>
      <JsonEditor value={text} onChange={(model) => setText(model.getValue())} />
      <JsonEditor value={data} onChange={(model) => setData(model.getValue())} />
      <pre>{result}</pre>
   </>
}

renderRoot(<ApplicationRoot />)
