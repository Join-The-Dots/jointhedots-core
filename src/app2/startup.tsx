import ReactDOM from 'react-dom/client'
import doc_mdx from "../samples/Livedoc3.txt"
import "./style.scss"
import { deserialize_jsx_document, serialize_jsx_document, stringify_node_json } from '@livedoc/core/ast/serde/markdown'

const doc_mdx_ast = deserialize_jsx_document(doc_mdx)
//console.log(serialize_jsx_document(doc_mdx_ast))

function App() {
   return (<>
      <pre>{stringify_node_json(doc_mdx_ast)}</pre>
      <pre>{doc_mdx}</pre>
   </>)
}

const root = window.document.createElement("div")
root.id = "root"
window.document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
