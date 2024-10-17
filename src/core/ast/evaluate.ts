import { ComponentsRegistry } from "@livedoc/core/library"
import * as AST from "@livedoc/core/ast/nodes"
import { MapLike } from "@livedoc/core/common"
import { emitASTFromValue } from "./producer"
import { EmptyScope, evaluateExpression } from "./interpreter"

export function getExpressionHandler(type: string) {
   const mod = ComponentsRegistry.acquireComponent(type)
   if (mod.valid) {
      const mod_type = mod.manifest?.type
      if (mod_type === "expression") {
         return mod.getResource("expression").get()
      }
      else if (mod_type === "view") {
         return mod.getResource("view").get()
      }
   }
}

export type JSXElementData = {
   tag: string
   props: MapLike<any>
   additionnals?: any[]
   children?: any[]
   [ns: string]: any
}

export function emitJSXMarkdownText(text: string): AST.JSXText {
   return {
      type: "JSXText",
      value: text,
   } as AST.JSXText
}

export function emitJSXElementFromData(data: JSXElementData): AST.JSXElement {
   const attributes: AST.JSXAttribute[] = []
   for (const ns in data) {
      const attrs = data[ns]
      if (attrs instanceof Object) {

         if (Array.isArray(attrs)) {

         }
         else {
            for (const key in attrs) {
               const value = attrs[key]
               if (value === undefined) {
                  continue
               }
               attributes.push({
                  type: "JSXAttribute",
                  name: (ns === "props") ? {
                     type: "JSXIdentifier",
                     name: key,
                  } : {
                     type: "JSXNamespacedName",
                     namespace: {
                        type: "JSXIdentifier",
                        name: ns,
                     },
                     name: {
                        type: "JSXIdentifier",
                        name: key,
                     }
                  },
                  value: {
                     type: "JSXExpressionContainer",
                     expression: emitASTFromValue(value),
                  }
               } as AST.JSXAttribute)
            }
         }
      }
   }
   const tag = {
      type: "JSXIdentifier",
      name: data.tag,
   }
   const children = data.children?.map(c => emitASTFromValue(c) as any) || []
   return {
      type: 'JSXElement',
      openingElement: {
         type: "JSXOpeningElement",
         name: tag,
         attributes,
      },
      closingElement: children.length > 0 && {
         type: "JSXClosingElement",
         name: tag,
      },
      children,
   } as AST.JSXElement
}

export function evaluateJSXElementData(n: AST.JSXElement): JSXElementData {
   const { name, attributes } = n.openingElement
   const result: any = {
      type: "element",
      tag: getSymbolFromNode(name),
      chilren: n.children,
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
         props[key] = evaluateExpression(attr.value, EmptyScope)
      }
      else {
         let items = result.additionnals
         if (!items) result.additionnals = items = []
         items.push(evaluateExpression(attr.argument as any, EmptyScope))
      }
   }
   return result
}

export function getSymbolFromNode(n: AST.JSXIdentifier | AST.JSXNamespacedName | AST.JSXMemberExpression): string {
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
