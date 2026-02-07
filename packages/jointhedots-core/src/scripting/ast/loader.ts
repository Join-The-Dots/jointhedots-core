/***********
 * Flow Document: Editable/readable flow representation
**********/

import type { AST } from "./api.ts"
//import { file } from "@polycuber/script.cli"
import { parseDocumentFromMDX } from "./serde/parser.ts"
import { BlockFormat, type BlockContent, type BlockPrimitive, type ElementPrimitive, type ExpressiveValue, type Primitive, type SourceLink, type SourceLocation } from "./primitives.ts"

export type FlowAny =
   ElementPrimitive

const keepSourceMap = false

class SourceFile {
   locations = new Map<string | number, SourceLink | SourceLink[]>()
}

function addSourceLink<T extends Primitive>(src: SourceFile, target: T, link: SourceLink): T {
   if (link) {
      if (target.$id) {
         let loc = src.locations.get(target.$id)
         if (Array.isArray(loc)) loc.push(link)
         else if (loc) loc = [loc, link]
         else loc = link
         src.locations.set(target.$id, loc)
      }
      else {
         console.log(`Cannot attach location to node without $id`)
      }
   }
   return target
}

function transformToSourceLink(src: SourceFile, n: AST.Any, part?: string): SourceLink {
   if (n.start) {
      return {
         fragment: part,
         start: n.start,
         end: n.end,
      }
   }
   else if (n.loc) {
      return {
         // TODO: resolve line+col to pos
         fragment: part,
         start: n.loc.start.line,
         end: n.loc.end.line,
         src: n.loc.source,
      }
   }
}
function addSourceLocation<T extends Primitive = ElementPrimitive>(src: SourceFile, target: T, linked: AST.Any | Record<string, AST.Any | AST.Any[]>, part?: string): T {
   if (keepSourceMap) {
      if (Array.isArray(linked)) {
         for (const n of linked) {
            addSourceLocation(src, target, n, part)
         }
      }
      else {
         for (const part in linked) {
            addSourceLocation(src, target, linked[part], part)
         }
      }
   }
   return target
}

function transformToValue(src: SourceFile, n: boolean | number | string | AST.Any | AST.Any[]): ExpressiveValue {
   switch (typeof n) {
      case "number":
      case "string":
      case "boolean":
         return n
      case "object":
         if (Array.isArray(n)) {
            return n.map(x => transformToElement(src, x))
         }
         else if (n) {
            let elm = transformToElement(src, n)
            if (elm.type === "ArrayExpression") {
               return elm.elements
            }
            return elm
         }
         return undefined
      default:
         return undefined
   }
}

function transformToLiteral(src: SourceFile, n: boolean | number | string | bigint | AST.Any | AST.Any[]): boolean | number | string {
   switch (typeof n) {
      case "number":
      case "string":
      case "boolean":
         return n
      case "object": {
         if (Array.isArray(n)) {
            if (n.length > 1) {
               return n.map(x => transformToLiteral(src, x))
                  .filter(x => x !== undefined)
                  .join("")
            }
            else return transformToLiteral(src, n)
         }
         else if (n) {
            if (n.type === "ArrayExpression") {
               return transformToLiteral(src, n.elements)
            }
            if (n.type === "Literal") {
               return transformToLiteral(src, (n.value) as any)
            }
         }
         return undefined
      }
      default:
         return undefined
   }
}

function transformToContent(src: SourceFile, n: boolean | number | string | AST.Any | AST.Any[]): BlockContent {
   switch (typeof n) {
      case "number":
      case "string":
      case "boolean":
         return [{
            type: "Text",
            text: n.toString(),
         }]
      case "object":
         if (Array.isArray(n)) {
            return n.reduce((prev, x) => {
               prev.push(...transformToContent(src, x))
               return prev
            }, [])
         }
         else if (n) {
            if (n.type === "ArrayExpression") {
               return transformToContent(src, n.elements)
            }
            return [transformToElement(src, n) as any]
         }
         return undefined
      default:
         return undefined
   }
}

function transformToElement(src: SourceFile, n: AST.Any): AST.Any {
   switch (n.type) {
      case "Block": {
         return addSourceLocation<BlockPrimitive>(src, {
            type: "Block",
            format: n.format,
            lang: n.lang,
            metadata: n.metadata,
            content: transformToContent(src, n.content),
         }, n)
      }
      default: {
         const result: AST.Primitive = {
            type: n.type,
         }
         for (const key in n) {
            switch (key) {
               case "type":
               case "end":
               case "loc":
               case "start":
                  break
               case "raw":
                  if (n.type === "Literal" && Object.hasOwn(n, "value")) {
                     break
                  }
               default:
                  result[key] = transformToValue(src, n[key])
            }
         }
         return addSourceLocation(src, result, n) as AST.Any
      }
   }
}

export function loadScriptASTFromText(text: string): AST.DocumentPrimitive {
   const ast = parseDocumentFromMDX(text)
   const src = new SourceFile()
   const doc = transformToElement(src, ast)
   /*file.write.json("test-results/flow/text.mdx", text)
   file.write.json("test-results/flow/ast.json", ast)
   file.write.json("test-results/flow/elements.json", doc)*/
   return doc as any
}
