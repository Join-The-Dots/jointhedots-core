import { JSONSchema } from "@livedoc/core/ast/schema/schema"
import { DXElement } from "./model"
import { JSONSchemaRelation } from "../ast/schema/document"

export interface ExpressionTemplate {
   name: string
   icon: string
   getSchema(): JSONSchema
   getMembers(): Generator<ExpressionTemplate>
   getMetaMembers(): Generator<ExpressionTemplate>
   getExpression(): DXElement
   getPath(): string
}

export class JSONSchemaTemplate implements ExpressionTemplate {
   constructor(public name: string, public expr: DXElement, public schema: JSONSchema, public from: ExpressionTemplate, public icon: string = "code:symbol/field") {
      if (expr) this.icon = expr["constructor"]["icon"] || this.icon
   }
   findMember(symbol: string, meta: boolean) {
      return this.expr?.findMember(symbol, meta)
   }
   getSchema(): JSONSchema {
      return this.schema
   }
   getPath(): string {
      const base = this.from ? this.from.getPath() : ""
      return `${base}/${this.name}`
   }
   *getMembers(): Generator<ExpressionTemplate> {
      let { expr, schema } = this
      if (schema instanceof JSONSchemaRelation) {
         schema = schema.schema
      }

      const { properties } = schema
      if (properties) {
         for (const prop in properties) {
            const item = expr ? expr.findMember(prop, false) : null
            yield new JSONSchemaTemplate(prop, item, properties[prop], this)
         }
         for (const item of expr.getMembers()) {
            if (item.isMetaMember == false && properties.hasOwnProperty(item.name) === false) {
               yield new JSONSchemaTemplate(item.name, item, item.getTyping(), this)
            }
         }
      }
      else {
         for (const item of expr.getMembers()) {
            yield new JSONSchemaTemplate(item.name, item, item.getTyping(), this)
         }
      }
   }
   *getMetaMembers(): Generator<ExpressionTemplate> {
   }
   getExpression(): DXElement {
      return this.expr
   }
}

export class JSONMetaTemplate extends JSONSchemaTemplate {
   getPath(): string {
      const base = this.from ? this.from.getPath() : ""
      return `${base}:${this.name}`
   }
}
