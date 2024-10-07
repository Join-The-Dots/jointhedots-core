import { ASTNode, ASTProgram } from "core/AST"
import { Parser } from 'acorn'
import { LooseParser } from 'acorn-loose'
import acornJsx from './acornJsx'
import { astringJsx } from "./astringJsx"

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
      const code = astringJsx({
         type: "JSXDocument",
         children: layout.content,
      }, {
         ecmaVersion: 2024,
         sourceType: 'module',
      });
      return code
   }
}
export function deserialize_jsx_document(code: string): ASTProgram {
   const parser = Parser.extend(acornJsx({
      allowNamespacedObjects: true,
      allowNamespaces: true,
   }))
   try {
      const program = parser.parse(`export default <>\n${code}\n</>`, {
         ecmaVersion: 2024,
         sourceType: 'module',
         locations: false,
      }) as any
      console.log(program)

      const content = program.body[0]?.declaration?.children

      const layout = {
         type: "document",
         content,
      } as AstDocument

      return {
         type: "flow",
         layout,
      }
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
