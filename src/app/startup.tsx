import React from "react"
import ReactDOM from 'react-dom/client'
import { ToastContainer } from "react-toastify"
import { ThemeContext } from "components/Theme"
import { unified } from 'unified';
import RemarkParse from 'remark-parse';
import RemarkStringify from 'remark-stringify';
import { Root } from "remark-parse/lib"
import 'react-toastify/dist/ReactToastify.css'
import "./style.scss"



function markdownToAst(markdownText: string): Root {
   const processor = unified().use(RemarkParse)
   const tree = processor.parse(markdownText)
   return tree
}

function astToMarkdown(ast: Root): string {
   const processor = unified().use(RemarkStringify)
   const markdown = processor.stringify(ast as any)
   return markdown
}

function stringifyAst(ast: Root): string {
   return JSON.stringify(ast, (key, value) => {
     if (key === 'position') {
       return undefined; // Filter out "position" key
     }
     return value;
   }, 2); // Pretty-print with 2-space indentation
 }

const markdownText = `
# Heading 1

Some **bold** text and some _italic_ text.

- Item 1
- Item 2

> A blockquote

\`\`\`typescript
console.log('Hello, world!');
\`\`\`
`;

const ast = markdownToAst(markdownText);
const markdownText2 = astToMarkdown(ast);
console.log(ast);


function App() {
   const theme = React.useContext(ThemeContext)
   return (<>
      <pre>{markdownText2}</pre>
      <pre>{stringifyAst(ast)}</pre>
      <ToastContainer theme={theme.isDark ? "dark" : "light"} position="bottom-right" autoClose={2000} hideProgressBar />
   </>)
}

const root = window.document.createElement("div")
root.id = "root"
window.document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
