import { MapLike } from "core/common"
import { JSONSchema } from "./JSONSchema"
import { JSONSchema7TypeName } from "json-schema"
export * from "./JSONSchema"

export const CommonTypes: MapLike<JSONSchema> = {
   boolean: {
      type: "boolean"
   },
   string: {
      type: "string"
   },
   number: {
      type: "number"
   },
   object: {
      type: "object"
   },
   view: {
      type: "view"
   },
   element: {
      type: "element"
   },
   function: {
      type: "function"
   },
   unknown: {
      type: "null"
   },
   any: {
   },
}

export const CommonMakers = {
   enums(base: JSONSchema, ...values: string[]): JSONSchema {
      return { ...base, enum: values }
   },
   array(base: JSONSchema): JSONSchema {
      return { type: "array", items: base }
   },
   record(fields: MapLike<JSONSchema>): JSONSchema {
      return { type: "object", properties: fields }
   },
   collection(items: JSONSchema): JSONSchema {
      return { type: "object", additionalProperties: items }
   },
   event_fn(event?: JSONSchema): JSONSchema {
      return { type: "function", args: [event || CommonTypes.any] }
   },
}

export const ErrorTypes: MapLike<JSONSchema> = {
   invalid: {
      $error: "Cannot determine the type"
   }
}

function getPropertyTyping(propertyName: string, schema: JSONSchema): JSONSchema {
   if (!schema) return ErrorTypes.invalid

   // Search as standard property
   let typing = schema.properties?.[propertyName]
   if (typing) return typing

   // Search as pattern property
   const { patternProperties } = schema
   for (const pattern in patternProperties) {
      if (propertyName.match(pattern)) {
         return patternProperties[pattern]
      }
   }

   // Check error
   if (schema["$error"]) {
      return ErrorTypes.invalid
   }

   return schema.additionalProperties || CommonTypes.any
}

function getItemTyping(index: number, schema: JSONSchema): JSONSchema {
   if (!schema) return ErrorTypes.invalid

   // Search as standard property
   if (Array.isArray(schema.items)) {
      return schema.items?.[index] || ErrorTypes.invalid
   }
   else if (schema.items) {
      return schema.items
   }
   else if (schema.type === "element") {
      return schema
   }

   // Check error
   if (schema["$error"]) {
      return ErrorTypes.invalid
   }

   return schema.additionalProperties || CommonTypes.any
}

function getValueTyping(value: any): JSONSchema {
   switch (typeof value) {
      case "undefined":
         return CommonTypes.null
      case "boolean":
         return CommonTypes.boolean
      case "symbol":
      case "string":
         return CommonTypes.string
      case "bigint":
      case "number":
         return CommonTypes.number
      case "function":
         return CommonTypes.function
      case "object": {
         if (Array.isArray(value)) {
            return {
               type: "array",
               items: value.map(getValueTyping)
            }
         }
         else if (value !== null) {
            const properties = {}
            for (const key in properties) {
               properties[key] = getValueTyping(properties[key])
            }
            return {
               type: "array",
               properties,
            }
         }
         return CommonTypes.null
      }
      default:
         return ErrorTypes.invalid
   }
}

function isType(typing: JSONSchema, kind: string): boolean {
   const { type } = typing
   return Array.isArray(type) ? type.includes(kind as JSONSchema7TypeName) : type === kind
}

function typeAsString(type: JSONSchema["type"]): string {
   return Array.isArray(type) ? type.join(',') : type
}

function parseJson(text: string): any {
   try {
      return JSON.parse(text)
   }
   catch (e) {
      return undefined
   }
}

function convertTextToExpression(text: string, schema: JSONSchema, canBeExpression?: boolean): any {
   const data = parseJson(text)
   const canBeAny = isType(schema, "any") || !schema.type
   if (canBeExpression && typeof data?.type === "string") {
      return data
   }
   else if (isNaN(data)) {
      if (isType(schema, "boolean") || canBeAny) {
         if (text === "true") return true
         if (text === "false") return false
      }
      if (isType(schema, "string") || canBeAny) {
         return text
      }
      if (isType(schema, "number")) {
         return 0
      }
   }
   else {
      if (isType(schema, "number") || canBeAny) {
         return data
      }
      if (isType(schema, "string")) {
         return text
      }
      if (isType(schema, "boolean")) {
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

function generateTypescript(schema: JSONSchema): string {
   if (schema.type === "object") {
      const ln = []
      for (const key in schema.properties) {
         ln.push(`${key}: ${generateTypescript(schema.properties[key])}`)
      }
      for (const key in schema.additionalProperties) {
         ln.push(`${key}?: ${generateTypescript(schema.additionalProperties[key])}`)
      }
      for (const key in schema.patternProperties) {
         ln.push(`[${key}: ${generateTypescript(schema.patternProperties[key])}]`)
      }
      return ln.join("\n")
   }
   else if (schema.type) {
      return schema.type
   }
   return "any"
}

export const Types = {
   getPropertyTyping,
   getItemTyping,
   getValueTyping,
   isType,
   typeAsString,
   convertTextToExpression,
   generateTypescript,
}

export default Types
