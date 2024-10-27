import { MapLike } from "../common/types"
import { JSONSchema } from "./schema/schema"
import { Schema } from "./schema/helpers"
import * as AST from './nodes'

function parseJson(text: string): any {
   try { return JSON.parse(text) }
   catch (e) { return undefined }
}

export function emitASTFromValue(value: any): AST.Expression {
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

export function convertTextToExpression(text: string, schema: JSONSchema, canBeExpression?: boolean): any {
   const data = parseJson(text)
   const canBeAny = Schema.isType(schema, "any") || !schema.type
   if (canBeExpression && typeof data?.type === "string") {
      return data
   }
   else if (isNaN(data)) {
      if (Schema.isType(schema, "boolean") || canBeAny) {
         if (text === "true") return true
         if (text === "false") return false
      }
      if (Schema.isType(schema, "string") || canBeAny) {
         return text
      }
      if (Schema.isType(schema, "number")) {
         return 0
      }
   }
   else {
      if (Schema.isType(schema, "number") || canBeAny) {
         return data
      }
      if (Schema.isType(schema, "string")) {
         return text
      }
      if (Schema.isType(schema, "boolean")) {
         return data !== 0
      }
   }
   if (data !== undefined) {
      return {
         type: "const",
         value: data,
      }
   }
   return text
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
