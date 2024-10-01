import ReactDOM from 'react-dom/client'
import { toast, ToastContainer } from "react-toastify"
import { ASTNode } from "../core/AST"
import { JSONSchema } from "../core/AST/schema"
import { DocumentViewer } from "lexical-editor/Viewer"
import "components/icons-vscode"
import "components/icons-fontawesome"
import "components/icons-bootstrap"
import "core/theme"
import 'react-toastify/dist/ReactToastify.css'
import "./style.scss"

import doc_ast from "./samples/Livedoc1.json"
import { useState } from 'react'
import { DocumentEditable } from 'lexical-editor'
console.log(doc_ast)

const ast = {
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
}

type HandlerManifest = {
   id: string,
   expression: JSONSchema
}

const handlers: HandlerManifest[] = []

handlers.push({
   id: "flow",
   expression: {
      properties: {
         "flow": {
            type: "array",
            items: {
               type: "expression"
            }
         },
         "layout": {
            type: "expression"
         }
      }
   }
})

handlers.push({
   id: "property",
   expression: {
      properties: {
         "schema": {
            $ref: "http://json-schema.org/draft-07/schema"
         }
      }
   }
})

handlers.push({
   id: "state",
   expression: {
      properties: {
         "value": {
            type: "expression"
         },
         "schema": {
            $ref: "http://json-schema.org/draft-07/schema"
         }
      }
   }
})


function getDocumentState(id: string) {
   try {
      const result = JSON.parse(localStorage.getItem(id))
      if (result.root instanceof Object) {
         return result
      }
   }
   catch (_) {
   }
   return doc_ast.editorState
}

function setDocumentState(id: string, content: any) {
   localStorage.setItem(id, JSON.stringify(content))
   toast.success(`Document '${id}' saved`)
}

function App() {
   const id = "doc:my-test-doc"
   const [content, setContent] = useState<any>(getDocumentState(id))
   return (<>
      <ToastContainer position='bottom-right' />
      <DocumentEditable
         content={content}
         onChange={(content) => {
            setDocumentState(id, content)
            setContent(content)
         }}
      />
   </>)
}

const root = window.document.createElement("div")
root.id = "root"
window.document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
