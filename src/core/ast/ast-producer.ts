import { MapLike } from "core/common"
import { JSONSchema } from "./schema"
import { Schema } from "./schema-helpers"

function parseJson(text: string): any {
   try { return JSON.parse(text) }
   catch (e) { return undefined }
}

export function createExpressionProps(properties: MapLike<JSONSchema>): any {
   const result = {}
   for (const name in properties) {
      result[name] = createExpressionFromTyping(properties[name])
   }
   return result
}

export function createExpressionTuple(items: JSONSchema[]): any {
   const result = []
   for (const item of items) {
      result.push(createExpressionFromTyping(item))
   }
   return result
}

export function createExpressionFromTyping(typing: JSONSchema): any {

   if (typing.default) {
      return typing.default
   }

   const { properties } = typing
   if (properties) {
      return {
         type: "record",
         fields: createExpressionProps(properties)
      }
   }

   const { items } = typing
   if (Array.isArray(items)) {
      return {
         type: "list",
         items: createExpressionTuple(items),
      }
   }
   else if (items) {
      return {
         type: "list",
         items: [],
      }
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
