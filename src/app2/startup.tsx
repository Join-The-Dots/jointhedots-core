import ReactDOM from 'react-dom/client'
import doc_ast from "../samples/Livedoc1.json"
import doc_mdx from "../samples/Livedoc3.txt"
import "./style.scss"
import { deserialize_model_markdown } from 'core/serde/markdown-reamark-serde'
import { deserialize_jsx_document, serialize_jsx_document, short_stringify } from 'core/serde/markdown-acornjsx-serde'

const doc_mdx_ast = deserialize_jsx_document(doc_mdx)
//console.log(serialize_jsx_document(doc_mdx_ast))

function App() {
   return (<>
      <pre>{short_stringify(doc_mdx_ast)}</pre>
      <pre>{doc_mdx}</pre>
   </>)
}

const root = window.document.createElement("div")
root.id = "root"
window.document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
