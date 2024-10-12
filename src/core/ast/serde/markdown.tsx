import { JSXElement, JSXExpressionContainer, JSXFragment, JSXIdentifier, JSXMemberExpression, JSXNamespacedName, JSXText } from "../jsx/nodes"
import { MapLike } from "@livedoc/core/common"
import * as Astring from 'astring'
import * as AstringJsx from "../jsx/generator"
import { acornJsx } from "../jsx/parser"
import * as AST from "../nodes"

const documentLayoutType = "markdown"

const DocParser = AST.Parser.extend(acornJsx({
   allowNamespacedObjects: true,
   allowNamespaces: true,
}))

const DocGenerator = AstringJsx.Generator({
   ecmaVersion: 2024,
   sourceType: 'module',
})

export function stringify_node_jsx(n: AST.Any): string {
   return Astring.generate(n, DocGenerator)
}

export function stringify_node_json(n: AST.Any) {
   return JSON.stringify(n, (key, value) => {
      if ((key === "position" || key === "loc") && value?.start && value?.end) {
         return undefined
      }
      if ((key === "start" || key === "end") && typeof value === "number") {
         return undefined
      }
      if ((key === "raw") && typeof value === "string") {
         return undefined
      }
      return value
   }, 2)
}

export function serialize_jsx_document(model: AST.LDXProgram): string {
   const layout = model.layout as AST.LDXDocument
   if (layout.type === "LiveDocument") {
      const code = Astring.generate({
         type: "JSXDocument",
         children: layout.items,
      } as any, DocGenerator)
      return code
   }
}

export function deserialize_jsx_document(code: string): AST.LDXProgram {
   try {
      const program = DocParser.parse(`export default <>\n${code}\n</>`, {
         ecmaVersion: 2024,
         sourceType: 'module',
      })

      let layout: AST.LDXDocument = null
      for (const c of program.body) {
         if (c.type === "ExportDefaultDeclaration") {
            const exported = c.declaration as any as AST.JSXFragment
            if (exported.type === "JSXFragment") {
               layout = {
                  type: "LiveDocument",
                  items: exported.children.map(x => {
                     if (x.type === "JSXText") return x.value
                     else return x
                  })
               } as AST.LDXDocument
               if (layout) break
            }
         }
      }

      return {
         type: "LiveRoutine",
         layout,
      } as AST.LDXProgram
   }
   catch (error) {
      if (error.loc) {
         printErrorWithContext(code, error)
      } else {
         console.error('Unknown error:', error)
      }
   }
}

function printErrorWithContext(code: string, error: any) {
   const errorLine = error.loc.line
   const errorColumn = error.loc.column

   // Split the code into lines for easier handling
   const codeLines = code.split('\n')

   // Display two lines before and after the error line for better context (if available)
   const startLine = Math.max(0, errorLine - 3)
   const endLine = Math.min(codeLines.length, errorLine + 2)

   for (let i = startLine; i < endLine; i++) {
      const lineNumber = i + 1
      const linePrefix = lineNumber === errorLine ? '>' : ' '
      console.log(`${linePrefix} ${lineNumber.toString().padStart(3)} | ${codeLines[i]}`)

      // If it's the error line, add an indicator arrow at the column position
      if (lineNumber === errorLine) {
         const indicator = ' '.repeat(errorColumn + 6) + '^'
         console.log(indicator)
      }
   }

   // Print the actual error message from Acorn
   console.log(`\nError:`, error)
}
