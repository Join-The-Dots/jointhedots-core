import React, { useEffect, useState } from "react"
import ReactDOM from 'react-dom/client'
import { ToastContainer } from "react-toastify"
import 'react-toastify/dist/ReactToastify.css'
import "./style.scss"
import { ASTNode } from "../core/AST"
import { JSONSchema } from "../core/AST/JSONSchema"
import { DocumentEditor } from "lexical-editor"

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

function decompose_ast(ast: ASTNode) {

}

function App() {
   return (<>
      <ToastContainer />
      <DocumentEditor />
      hello
   </>)
}

const root = window.document.createElement("div")
root.id = "root"
window.document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
