import { MapLike } from "../common/types"
import { JSONSchema } from "./schema/schema"
import { Schema } from "./schema/helpers"
import * as AST from './nodes'

function parseJson(text: string): any {
   try { return JSON.parse(text) }
   catch (e) { return undefined }
}

export function emitASTFromValue(value: any): AST.Literal | AST.ArrayExpression | AST.ObjectExpression {
   if (value instanceof Object) {
      if (Array.isArray(value)) {
         return {
            type: "ArrayExpression",
            elements: value.map(x => emitASTFromValue(x)),
         } as AST.ArrayExpression
      }
      else {
         return {
            type: "ObjectExpression",
            properties: Object.keys(value).map((key, i) => {
               return {
                  type: "Property",
                  kind: "init",
                  key: {
                     type: "Identifier",
                     name: key,
                  },
                  value: emitASTFromValue(value[key]),
               } as AST.Property
            })
         } as AST.ObjectExpression
      }
   }
   else {
      return {
         type: "Literal",
         value,
      } as AST.Literal
   }
}

export function emitASTProps(properties: MapLike<JSONSchema>): any {
   const result = {}
   for (const name in properties) {
      result[name] = emitASTFromTyping(properties[name])
   }
   return result
}

export function emitASTTuple(items: JSONSchema[]): any {
   const result = []
   for (const item of items) {
      result.push(emitASTFromTyping(item))
   }
   return result
}

export function emitASTFromTyping(typing: JSONSchema): AST.Any {

   if (typing.default) {
      return emitASTFromValue(typing.default)
   }

   const { properties } = typing
   if (properties) {
      return {
         type: "ObjectExpression",
         properties: Object.keys(properties).map(key => {
            return {
               type: "Property",
               key: {
                  type: "Identifier",
                  name: key,
               },
               value: emitASTFromTyping(properties[key])
            }
         })
      } as AST.ObjectExpression
   }

   const { items } = typing
   if (Array.isArray(items)) {
      return {
         type: "ArrayExpression",
         elements: emitASTTuple(items),
      } as AST.ArrayExpression
   }
   else if (items) {
      return {
         type: "ArrayExpression",
         elements: [],
      } as AST.ArrayExpression
   }
}

export function convertValueToLiteral(value: AST.Literal["value"]): AST.Literal {
   return {
      type: "Literal",
      value: value,
   } as AST.Literal
}

export function convertTextToAST(text: string, schema: JSONSchema, canBeAST?: boolean): AST.Any {
   const data = parseJson(text)
   const canBeAny = Schema.isType(schema, "any") || !schema.type
   if (canBeAST && typeof data?.type === "string") {
      return data
   }
   else if (isNaN(data)) {
      if (Schema.isType(schema, "boolean") || canBeAny) {
         if (text === "true") return convertValueToLiteral(true)
         if (text === "false") return convertValueToLiteral(false)
      }
      if (Schema.isType(schema, "string") || canBeAny) {
         return convertValueToLiteral(text)
      }
      if (Schema.isType(schema, "number")) {
         return convertValueToLiteral(0)
      }
   }
   else {
      if (Schema.isType(schema, "number") || canBeAny) {
         return convertValueToLiteral(data)
      }
      if (Schema.isType(schema, "string")) {
         return convertValueToLiteral(text)
      }
      if (Schema.isType(schema, "boolean")) {
         return convertValueToLiteral(data !== 0)
      }
   }
   if (data !== undefined) {
      return convertValueToLiteral(data)
   }
   return convertValueToLiteral(text)
}

export function createValueProps(properties: MapLike<JSONSchema>): any {
   const result = {}
   for (const name in properties) {
      result[name] = createValueFromTyping(properties[name])
   }
   return result
}

export function createValueTuple(items: JSONSchema[]): any {
   const result = []
   for (const item of items) {
      result.push(createValueFromTyping(item))
   }
   return result
}

export function createValueFromTyping(typing: JSONSchema): any {

   if (typing.default !== undefined) {
      return typing.default
   }

   const { properties } = typing
   if (properties) {
      return createValueProps(properties)
   }

   const { items } = typing
   if (Array.isArray(items)) {
      return createValueTuple(items)
   }
   else if (items) {
      return []
   }
}
