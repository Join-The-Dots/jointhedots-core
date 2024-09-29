import { getDataAtKeys } from "./helpers"
import { CommonTypes, JSONSchema } from "core/AST/schema-helpers"

export function getJSONSchemaName(schema: JSONSchema): string {
   if (schema instanceof JSONSchemaRelation) {
      schema = schema.schema
   }
   return schema.$id || schema.type
}

export class JSONSchemaRelation {
   schema: JSONSchema
   constructor(public $ref: string, public doc: JSONDocument) {
   }
}

export class JSONDocument {
   relations: JSONSchemaRelation[] = []
   schemas: Set<JSONSchema> = new Set()
   constructor(public root: any) {
   }
   useSchema(schema: JSONSchema): JSONSchema {
      if (this.schemas.has(schema)) {
         return schema
      }
      const result = compileJSONRelations(schema, this)
      if (result === schema) {
         this.schemas.add(schema)
      }
      return result
   }
   resolveRelations(): Promise<void> | void {
      const { relations } = this
      for (let i = 0; i < relations.length; i++) {
         const rel = relations[i]
         if (!rel.schema) {
            rel.schema = this.resolve(rel.$ref)
            if (!rel.schema) {
               rel.schema = CommonTypes.any
               console.error(`Cannot resolve $ref: ${rel.$ref}`)
            }
         }
      }
   }
   resolve(ref: string): JSONSchema {
      if (ref.startsWith("#")) {
         const keys = ref.split("/")
         const schema = getDataAtKeys(keys.slice(1), this.root)
         return this.useSchema(schema)
      }
      return null
   }
}

function compileJSONRelations(schema: any, doc: JSONDocument): any {
   if (schema instanceof Object) {
      if (Array.isArray(schema)) {
         for (let key = 0; key < schema.length; key++) {
            schema[key] = compileJSONRelations(schema[key], doc)
         }
      }
      else if (typeof schema.$ref === "string") {
         const rel = new JSONSchemaRelation(schema.$ref, doc)
         doc.relations.push(rel)
         return rel
      }
      else {
         for (const key in schema) {
            schema[key] = compileJSONRelations(schema[key], doc)
         }
      }
   }
   return schema
}
