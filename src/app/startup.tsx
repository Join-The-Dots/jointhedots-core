import React from "react"
import ReactDOM from 'react-dom/client'
import { ToastContainer } from "react-toastify"
import { ThemeContext } from "components/Theme"
import { AstMarkdown, deserialize_model_markdown, MarkdownModelDisplayer, serialize_model_markdown } from "./markdown-serial";
import { MarkdownPreviewExample } from "./markdown-editor";
import { ComponentsRegistry } from "core/components/registry";
import { CoreInstance } from "core";
import { LocalComponentStore } from "core/providers/component-local-provider";
import { CommonModuleProvider } from "core/providers/module-provider";
import 'react-toastify/dist/ReactToastify.css'
import "./style.scss"

const markdownText2 = serialize_model_markdown({
   "type": "flow",
   "flow": {
      "pp": {
         type: "property"
      }
   },
   "layout": {
      "type": "std:markdown",
      "blocks": [
         "# title\nbigblarebla",
         {
            "type": "std:mermaid",
            "code": "graph TD;\n    A-->B;\n    A-->C;\n    B-->D;\n    C-->D;\n"
         },
         `
# Heading 1

Some **bold** text and some _italic_ text.

- Item 1
- Item 2

> A blockquote

\`\`\`typescript
console.log('Hello, world!');
\`\`\`
`
      ]
   }
})

const markdownModel = deserialize_model_markdown(markdownText2)


const provider = new LocalComponentStore()
CoreInstance.edition = true
CoreInstance.simulation = true
CoreInstance.storage = provider
CoreInstance.component_provider = provider
ComponentsRegistry.storage_provider = provider
ComponentsRegistry.modules_provider = new CommonModuleProvider()

async function run() {
   const mermaid = await ComponentsRegistry.resolveResource("std:mermaid", "view").fetch()
   console.log(mermaid)
}
run()

function App() {
   const theme = React.useContext(ThemeContext)

   return (<>
      <MarkdownPreviewExample root={markdownModel.layout as AstMarkdown} />
      <pre>{markdownText2}</pre>
      <MarkdownModelDisplayer>
         {markdownText2}
      </MarkdownModelDisplayer>
      <ToastContainer theme={theme.isDark ? "dark" : "light"} position="bottom-right" autoClose={2000} hideProgressBar />
   </>)
}

const root = window.document.createElement("div")
root.id = "root"
window.document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
