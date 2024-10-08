import { ASTNode, ASTProgram } from "core/AST"
import * as Acorn from 'acorn'
import * as Astring from 'astring'
import { acornJsx, JSXElement, JSXExpressionContainer, JSXFragment, JSXIdentifier, JSXMemberExpression, JSXNamespacedName, JSXText } from './jsx/acorn-jsx'
import * as astringJsx from "./jsx/astring-jsx"
import * as AcornWalk from 'acorn-walk'

import "./jsx/awalk-jsx"
import { MapLike } from "core/common"

const documentLayoutType = "markdown"

const DocParser = Acorn.Parser.extend(acornJsx({
   allowNamespacedObjects: true,
   allowNamespaces: true,
}))

const DocGenerator = astringJsx.Generator({
   ecmaVersion: 2024,
   sourceType: 'module',
})

function getSymbolFromNode(n: JSXIdentifier | JSXNamespacedName | JSXMemberExpression): string {
   switch (n.type) {
      case "JSXIdentifier":
         return n.name
      case "JSXNamespacedName":
         return n.namespace.name
      case "JSXMemberExpression":
         return getSymbolFromNode(n.object) + "." + getSymbolFromNode(n.property)
      default:
         console.log("?", n)
         return "?"
   }
}

type DocumentTransformer = MapLike<(n: ASTNode, context: DocumentAnalyzer) => ASTNode>

class DocumentAnalyzer {
   nodes: MapLike<ASTNode> = {}
   ids: number = 0

   constructor(
      readonly transformers: DocumentTransformer
   ) {
   }

   createRoot(n: ASTNode): ASTNode {
      n.nodes = this.nodes
      return n
   }

   createNode(n: ASTNode): ASTNode {
      if (n) {
         const key = "#" + (this.ids++)
         this.nodes[key] = n
         return { type: "bind", key }
      }
      else {
         return n
      }
   }

   transformContent(children: ASTNode[]): ASTNode {
      let result = null
      if (children) {
         let isDocument = false
         for (const c of children) {
            if (c.type === "JSXText") {
               if (!result) result = []
               result.push(c.value)
               isDocument = true
            }
            else {
               const n = this.transformNode(c)
               if (n) {
                  if (!result) result = []
                  result.push(n)
               }
            }
         }
         if (isDocument) {
            result = [this.createNode({
               type: documentLayoutType,
               items: result,
            })]
         }
         else {
            result = [this.createNode({
               type: "group",
               items: result,
            })]
         }
      }
      return result
   }

   transformChildren(children: ASTNode[]): ASTNode[] {
      let result = null
      if (children) {
         let isDocument = false
         for (const c of children) {
            if (c.type === "JSXText") {
               if (!result) result = []
               result.push(c.value)
               isDocument = true
            }
            else {
               const n = this.transformNode(c)
               if (n) {
                  if (!result) result = []
                  result.push(n)
               }
            }
         }
         if (isDocument) {
            result = [this.createNode({
               type: documentLayoutType,
               content: result,
            })]
         }
      }
      return result
   }

   transformDefaultNode(n: ASTNode): ASTNode {
      const code = Astring.generate(n, DocGenerator);
      return this.createNode({
         type: "evaluate",
         code,
      })
   }

   transformNode(n: ASTNode): ASTNode {
      const producer = this.transformers[n?.type]
      if (producer) {
         return producer(n, this)
      }
      else {
         console.warn(`unkown node '${n.type}':`, n)
         return this.transformDefaultNode(n)
      }
   }
}

const JSXTransformer: MapLike<(n: ASTNode, context: DocumentAnalyzer) => ASTNode> = {
   "Program": (n: Acorn.Program, context: DocumentAnalyzer) => {
      let layout = null
      for (const c of n.body) {
         if (c.type === "ExportDefaultDeclaration") {
            layout = context.transformNode(c.declaration)
            if (layout) break
         }
      }
      return context.createRoot({
         type: "document",
         layout,
      })
   },
   "Literal": (n: Acorn.Literal, context: DocumentAnalyzer) => {
      return context.createNode({
         type: "const",
         value: n.value,
      })
   },
   "JSXFragment": (n: JSXFragment, context: DocumentAnalyzer) => {
      return context.transformContent(n.children)
   },
   "JSXExpressionContainer": (n: JSXExpressionContainer, context: DocumentAnalyzer) => {
      return context.transformNode(n.expression)
   },
   "JSXElement": (n: JSXElement, context: DocumentAnalyzer) => {
      const { name, attributes } = n.openingElement
      const result: ASTNode = {
         type: "element",
         tag: getSymbolFromNode(name),
      }
      for (const attr of attributes) {
         if (attr.type === "JSXAttribute") {
            const { name } = attr
            let key: string, ns: string
            if (name.type === "JSXIdentifier") {
               ns = "props"
               key = name.name
            }
            else {
               ns = name.namespace.name
               key = name.name.name
            }
            let props = result[ns]
            if (!props) result[ns] = props = {}
            props[key] = context.transformNode(attr.value)
         }
         else {
            let items = result.additionnals
            if (!items) result.additionnals = items = []
            items.push(context.transformNode(attr.argument))
         }
      }
      return context.createNode(result)
   },
   "JSXText": (n: JSXText, context: DocumentAnalyzer) => {
      return context.createNode({
         type: "const",
         value: n.value,
      })
   },
}

export interface AstDocument extends ASTNode {
   type: "document"
   content: (ASTNode | ASTNode)[]
}

export function short_stringify(model: ASTProgram) {
   return JSON.stringify(model, (key, value) => {
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

export function serialize_jsx_document(model: ASTProgram): string {
   const layout = model.layout as AstDocument
   if (layout.type === "document") {
      const code = Astring.generate({
         type: "JSXDocument",
         children: layout.content,
      } as any, DocGenerator);
      return code
   }
}

export function deserialize_jsx_document(code: string): ASTProgram {
   try {
      const program = DocParser.parse(`export default <>\n${code}\n</>`, {
         ecmaVersion: 2024,
         sourceType: 'module',
      })

      const analyzer = new DocumentAnalyzer(JSXTransformer)
      const root = analyzer.transformNode(program)

      return root as ASTProgram
   }
   catch (error) {
      if (error.loc) {
         printErrorWithContext(code, error);
      } else {
         console.error('Unknown error:', error);
      }
   }
}

function printErrorWithContext(code: string, error: any) {
   const errorLine = error.loc.line;
   const errorColumn = error.loc.column;

   // Split the code into lines for easier handling
   const codeLines = code.split('\n');

   // Display two lines before and after the error line for better context (if available)
   const startLine = Math.max(0, errorLine - 3);
   const endLine = Math.min(codeLines.length, errorLine + 2);

   for (let i = startLine; i < endLine; i++) {
      const lineNumber = i + 1;
      const linePrefix = lineNumber === errorLine ? '>' : ' ';
      console.log(`${linePrefix} ${lineNumber.toString().padStart(3)} | ${codeLines[i]}`);

      // If it's the error line, add an indicator arrow at the column position
      if (lineNumber === errorLine) {
         const indicator = ' '.repeat(errorColumn + 6) + '^';
         console.log(indicator);
      }
   }

   // Print the actual error message from Acorn
   console.log(`\nError:`, error);
}
