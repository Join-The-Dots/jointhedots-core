import { ZodType } from "zod"
import { OneOrMany } from "../../common/types"
import { JSONSchema } from "../../scripting"

export type Json = any

export type Content = Resource | SemanticUnit

export type ResourceUri = string

export interface ISerde<T> {
   serialize(object: T): Json
   deserialize(data: Json): T
}

export abstract class Resource {

   // Identity API
   abstract getURI(): string

   // Export API
   abstract toSharableURI(): string
   abstract toJSON(): Json
   abstract toBlob(): Blob
   abstract toString(): string
   abstract toSemantic(): OneOrMany<SemanticUnit>
}

export class Blob extends Uint8Array {
   constructor(
      bytes: ArrayBuffer,
      readonly media: string,
      readonly format: string,
      readonly encoding?: string,
   ) {
      super(bytes)
   }
   static fromString(str: string, format: string = "plain", media: string = "text"): Blob {
      const buf = Buffer.from(str)
      return new Blob(buf.buffer, media, format)
   }
   toBase64() {
      if (typeof btoa === 'function') {
         const binString = Array.from(this, (byte) => String.fromCodePoint(byte)).join("")
         return btoa(binString)
      } else if (typeof Buffer === 'function') {
         return Buffer.from(this).toString('base64')
      }
   }
   toURI() {
      return `data:${this.media}/${this.format};base64,${this.toBase64()}`
   }
}

export class BlobResource extends Resource {
   constructor(
      readonly data: Blob,
      readonly uri?: string,
   ) {
      super()
   }
   getURI(): string {
      if (this.uri) return this.uri
      return this.toSharableURI()
   }
   toString(): string {
      return `[${this.constructor.name}](${this.getURI()})`
   }
   toBlob(): Blob {
      return this.data
   }
   toSharableURI(): string {
      return this.toBlob().toURI()
   }
   toSemantic(): OneOrMany<SemanticUnit> {
      const { media, format } = this.data
      switch (media) {
         case "text":
            return TextualUnit.New(
               this.data.toString(),
               format,
            )
         case "image":
            return VisualUnit.New(
               this.toSharableURI()
            )
         default:
            return null
      }
   }
   toJSON(): Json {
      const { media, format } = this.data
      switch (media) {
         case "text":
            return {
               type: "text",
               format,
               text: this.data.toString()
            }
         case "image":
            return {
               type: "image",
               url: this.toSharableURI()
            }
         default:
            return {
               type: "resource",
               uri: this.toSharableURI()
            }
      }
   }
}

export class SemanticUnit {
   static type = "?"
   get type(): string {
      return this.constructor["type"]
   }
}

export class TextualUnit extends SemanticUnit {
   static type = "text"
   text: string = ""
   format: string = null // Markdown, Code, Typescript
   static New(text: string, format?: string) {
      const unit = new TextualUnit()
      unit.text = text || ""
      unit.format = format || null
      return unit
   }
}

export class VisualUnit extends SemanticUnit {
   static type = "image"
   url: string // link or data scheme with base64
   static New(url: string) {
      const unit = new VisualUnit()
      unit.url = url
      return unit
   }
}

export class AudioUnit extends SemanticUnit {
   static type = "audio"
   uri: ResourceUri // link or data scheme with base64
}

export class DataUnit extends SemanticUnit {
   static type = "data"
   schema?: ZodType
   data: Json
   static New(data: Json, schema?: ZodType) {
      const unit = new DataUnit()
      unit.schema = schema
      unit.data = data
      return unit
   }
}

export class TabularUnit extends SemanticUnit {
   static type = "table"
   // TODO
}

export enum SectionLayout {

   // Behavior section
   Instruction, // Contains instructions, behavior guide, ... (ex: `<importantReminders>\n${content}\n</importantReminders>` )

   // Information section
   Documentation, // Contains informations, assertions, ... (ex: `## How make an agent\n\n${content}` )
   Paragraph, // Block of content
   Note, // Block of highlighted informations
   Important, // Block of important informations
   Danger, // Block of very important informations
   Metadata, // Mixed attributes informations

   // Code section
   Code, // Contains programming definitions (ex: ```js ${label}\n${content}\n```)
   CodeDefinition, // Block of one programming element (type, class, schema, ...) (ex: `/* ${label} */\n${content}\n`)
   CodeAlgorithm, // Block of expressions (function, method, main, ...)  (ex: `/* ${label} */\n${content}\n`)
   CodeData, // Block of data (constant, ...) (ex: `/* ${label} */\n${content}\n`)
   // note: for code sections the label is the content describe in natural language (keep it null otherwise)
}

export enum SectionLanguage {

   // Natural language
   International = "en", // English
   English = "en",
   French = "fr",

   // Promgramming language
   Javascript = "javascript",
   Typescript = "typescript",
   Python = "python",
   Terraform = "terraform",
}

export class SectionUnit extends SemanticUnit {
   static type = "section"
   layout: SectionLayout
   language?: SectionLanguage | string
   label?: SemanticUnit
   content: SemanticUnit[]
   static New(layout: SectionLayout, label: any, content: any) {
      const unit = new SectionUnit()
      unit.layout = layout
      unit.label = convertAnyToSemanticUnit(label)
      unit.content = appendAnyToSemanticUnits(content, [])
      return unit
   }
}

export class ActionUnit extends SemanticUnit {
   static type = "action"
   action_id: string // Future contribution id receiving the result
   tool_id: string // Tool to invoke
   tool_input?: DataUnit // Tool invokation inputs
   static New(action_id: string, tool_id: string, tool_input?: DataUnit) {
      const unit = new ActionUnit()
      unit.action_id = action_id
      unit.tool_id = tool_id
      unit.tool_input = tool_input
      return unit
   }
}

export enum ActionStatus {
   Done = "done",
   Running = "running",
   Scheduled = "scheduled",
   Failed = "failed",
}

export class FeedbackUnit extends SemanticUnit {
   static type = "feedback"
   status: ActionStatus
   action_id: string
   ticket_id?: string // Ticket id to follow the tool task
   message?: string
   output?: OneOrMany<Content>
   static Done(action_id: string, output: OneOrMany<Content>, ticket_id?: string) {
      const unit = new FeedbackUnit()
      unit.status = ActionStatus.Done
      unit.action_id = action_id
      unit.ticket_id = ticket_id
      unit.output = output
      return unit
   }
   static Running(action_id: string, output: OneOrMany<Content>, ticket_id: string) {
      const unit = new FeedbackUnit()
      unit.status = ActionStatus.Running
      unit.action_id = action_id
      unit.ticket_id = ticket_id
      unit.output = output
      return unit
   }
   static Failed(action_id: string, message?: string) {
      const unit = new FeedbackUnit()
      unit.status = ActionStatus.Failed
      unit.action_id = action_id
      unit.message = message
      return unit
   }
}

export class NotificationUnit extends SemanticUnit {
   static type = "notification"
   content: SemanticUnit[]
}

export class SemanticResource extends Resource {
   units: SemanticUnit[]
   constructor(
      readonly base: Resource,
      readonly identifier?: string | number,
   ) {
      super()
   }
   getURI(): string {
      //if (this.uri) return this.uri
      return this.toSharableURI()
   }
   toString(): string {
      return `[${this.constructor.name}](${this.getURI()})`
   }
   toBlob(): Blob {
      return null
   }
   toSharableURI(): string {
      return this.toBlob().toURI()
   }
   toSemantic(): OneOrMany<SemanticUnit> {
      return this.units
   }
   toJSON(): Json {
      return null
   }
}

function convertAnyToSemanticUnit(content: any): SemanticUnit {
   if (Array.isArray(content)) {
      const result: SemanticUnit[] = []
      for (const cnt of content) {
         appendAnyToSemanticUnits(cnt, result)
      }
      return SectionUnit.New(SectionLayout.Paragraph, null, result)
   }
   else if (content instanceof SemanticUnit) {
      return content
   }
   else if (typeof content === "string") {
      return TextualUnit.New(content)
   }
   else if (typeof content === "number") {
      return TextualUnit.New(content.toString())
   }
   return null
}

function appendAnyToSemanticUnits(content: any, result: SemanticUnit[]): SemanticUnit[] {
   if (Array.isArray(content)) {
      for (const cnt of content) {
         appendAnyToSemanticUnits(cnt, result)
      }
   }
   else if (content instanceof SemanticUnit) {
      result.push(content)
   }
   else if (typeof content === "string") {
      result.push(TextualUnit.New(content))
   }
   else if (typeof content === "number") {
      result.push(TextualUnit.New(content.toString()))
   }
   return result
}
