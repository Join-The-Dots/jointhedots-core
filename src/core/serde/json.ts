import { JSONSchemaRelation } from "../AST/schema-document"

export function stringifyDescriptor(what: Object): string {
   return JSON.stringify(what, (key, value) => {
      if (value instanceof JSONSchemaRelation) {
         return { $ref: value.$ref }
      }
      return value
   }, 2)
}
