import ReactDOM from 'react-dom/client'
import { toast, ToastContainer } from "react-toastify"
import { JSONSchema } from "../core/ast/schema"
import "components/icons-vscode"
import "components/icons-fontawesome"
import "components/icons-bootstrap"
import "core/theme"
import 'react-toastify/dist/ReactToastify.css'
import "./style.scss"

import doc_mdx from "../samples/Livedoc4.txt"
import { useState } from 'react'
import { DocumentEditable } from 'lexical-editor'

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
      return localStorage.getItem(id).toString()
   }
   catch (_) {
   }
}

function setDocumentState(id: string, content: any) {
   localStorage.setItem(id, JSON.stringify(content))
   toast.success(`Document '${id}' saved`)
}

function App() {
   const id = "doc:my-test-doc"
   const [content, setContent] = useState<any>(doc_mdx)
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
