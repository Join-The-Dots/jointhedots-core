import { MapLike } from "@livedoc/core/common"
import { JSONSchema7Type, JSONSchema7Version, JSONSchema7TypeName } from "json-schema"

export type JSONSchema7Definition = JSONSchema

export type JSONSchema = {
   $id?: string | undefined
   $ref?: string | undefined
   $schema?: JSONSchema7Version | undefined
   $comment?: string | undefined

   /**
    * @see https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-8.2.4
    * @see https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#appendix-A
    */
   $defs?: {
      [key: string]: JSONSchema7Definition
   } | undefined

   /**
    * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1
    */
   type?: JSONSchema7TypeName | JSONSchema7TypeNameCustom
   enum?: JSONSchema7Type[] | undefined
   const?: JSONSchema7Type | undefined

   /**
    * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.2
    */
   multipleOf?: number | undefined
   maximum?: number | undefined
   exclusiveMaximum?: number | undefined
   minimum?: number | undefined
   exclusiveMinimum?: number | undefined

   /**
    * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.3
    */
   maxLength?: number | undefined
   minLength?: number | undefined
   pattern?: string | undefined

   /**
    * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.4
    */
   items?: JSONSchema7Definition | JSONSchema7Definition[] | undefined
   additionalItems?: JSONSchema7Definition | undefined
   maxItems?: number | undefined
   minItems?: number | undefined
   uniqueItems?: boolean | undefined
   contains?: JSONSchema7Definition | undefined

   /**
    * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.5
    */
   maxProperties?: number | undefined
   minProperties?: number | undefined
   required?: string[] | undefined
   properties?: {
      [key: string]: JSONSchema7Definition
   } | undefined
   patternProperties?: {
      [key: string]: JSONSchema7Definition
   } | undefined
   additionalProperties?: JSONSchema7Definition | undefined
   dependencies?: {
      [key: string]: JSONSchema7Definition | string[]
   } | undefined
   propertyNames?: JSONSchema7Definition | undefined

   /**
    * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.6
    */
   if?: JSONSchema7Definition | undefined
   then?: JSONSchema7Definition | undefined
   else?: JSONSchema7Definition | undefined

   /**
    * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.7
    */
   allOf?: JSONSchema7Definition[] | undefined
   anyOf?: JSONSchema7Definition[] | undefined
   oneOf?: JSONSchema7Definition[] | undefined
   not?: JSONSchema7Definition | undefined

   /**
    * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-7
    */
   format?: string | undefined

   /**
    * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-8
    */
   contentMediaType?: string | undefined
   contentEncoding?: string | undefined

   /**
    * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-9
    */
   definitions?: {
      [key: string]: JSONSchema7Definition
   } | undefined

   /**
    * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-10
    */
   title?: string | undefined
   description?: string | undefined
   default?: JSONSchema7Type | undefined
   readOnly?: boolean | undefined
   writeOnly?: boolean | undefined
   examples?: JSONSchema7Type | undefined
} & JSONSchemaCustom

export type JSONSchema7TypeNameCustom =
   "module" |
   "expression" |
   "function" |
   "element" |
   "view"

export type JSONSchemaCustom = {

   // Information
   title?: string
   icon?: string
   doc?: DocumentationSchema
   $error?: string | Error

   // Programming interface
   args?: JSONSchema[]
   placeholder?: boolean // require a placeholder structure when empty
   attachments?: MapLike<ResourceLink>

   // Component related schema
   docking?: DockingSchema
   template?: TemplateSchema // descriptor to create a valid expression for this schema
}

export type ResourceLink = string

export type TemplateSchema = {
   title?: string
   args?: JSONSchema[]
   content: ExpressionSchema
}

export type ExpressionSchema = {
   type: string,
   [properties: string]: any
}

export type DockingSchema = {
   view: string
   properties: MapLike<JSONSchema7Definition> | undefined
}

export type ChapterSchema = {
   title?: string
   properties?: string[]
   secondaryProperties?: string[]
   patternProperties?: string[]
   additionalProperties?: boolean
}

export type DocumentationSchema = {
   description?: string
   chapters?: ChapterSchema[]
   additionalChapter?: boolean
}
