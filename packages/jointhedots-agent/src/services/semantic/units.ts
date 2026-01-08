import { OneOrMany } from "@jointhedots/core"
import { Blob, Json, Resource, ResourceUri } from "./resource"
import { ZodType } from "zod"

export type Primitive =
   | PrimitiveUnit
   | TextualUnit
   | VisualUnit
   | AudioUnit
   | DataUnit
   | ActionUnit
   | FeedbackUnit

export type Primitives = OneOrMany<Primitive>

export abstract class SemanticUnit {
   static type = "?"
   transcript?: TextualUnit
   get type(): string {
      return this.constructor["type"]
   }
   abstract toPrimitives(): Primitives
}

export class PrimitiveUnit extends SemanticUnit {
   toPrimitives(): Primitives {
      return this
   }
}

export class TextualUnit extends PrimitiveUnit {
   static type = "text"
   text: string = ""
   format: string = null // Markdown, Code, Typescript
   toPrimitives(): Primitives {
      return this
   }
   static New(text: string | string[], format?: string) {
      const unit = new TextualUnit()
      unit.text = Array.isArray(text) ? text.join("\n") : text || ""
      unit.format = format || null
      return unit
   }
}

export class VisualUnit extends PrimitiveUnit {
   static type = "image"
   origin?: Resource
   data: Blob
   toURI() {
      if (this.origin) return this.origin.toSharableURI()
      if (this.data) return this.data.toURI()
      return null
   }
   static New(data: Blob, origin?: Resource) {
      const unit = new VisualUnit()
      if (data.media !== "image") throw new Error(`Invalid image resource`)
      unit.data = data
      unit.origin = origin
      return unit
   }
}

export class AudioUnit extends PrimitiveUnit {
   static type = "audio"
   origin?: Resource
   data: Blob
   toURI() {
      if (this.origin) return this.origin.toSharableURI()
      if (this.data) return this.data.toURI()
      return null
   }
   static New(data: Blob, origin?: Resource) {
      const unit = new AudioUnit()
      if (data.media !== "audio") throw new Error(`Invalid audio resource`)
      unit.data = data
      unit.origin = origin
      return unit
   }
}

export class DataUnit extends PrimitiveUnit {
   static type = "data"
   tag?: string
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
   headers: string[] = []
   rows: string[][] = []
   toPrimitives(): Primitives {
      return TextualUnit.New(this.toMarkdown(), "markdown")
   }
   toMarkdown(): string {
      const header = `| ${this.headers.join(" | ")} |`
      const separator = `| ${this.headers.map(() => "---").join(" | ")} |`
      const rows = this.rows.map(row => `| ${row.join(" | ")} |`).join("\n")
      return `${header}\n${separator}\n${rows}`
   }
   static New(headers: string[], rows: string[][]) {
      const unit = new TabularUnit()
      unit.headers = headers
      unit.rows = rows
      return unit
   }
}

export class AttachmentUnit extends SemanticUnit {
   static type = "attachment"
   resource: Resource
   fragment?: string
   toPrimitives(): OneOrMany<SemanticUnit> {
      return this.resource.toSemantic(this.fragment)
   }
   static New(resource: Resource, fragment?: string) {
      const unit = new AttachmentUnit()
      unit.resource = resource
      unit.fragment = fragment
      return unit
   }
}

export enum SectionLayout {

   // Data section
   Metadata = "meta", // Mixed attributes informations
   Documentation = "doc", // Contains informations, assertions, ... (ex: `## How make an agent\n\n${content}` )
   Notification = "alert",

   // Information section
   Block = "block", // Block of content, ... (ex: `${content}`, `<importantReminders>\n${content}\n</importantReminders>` )
   BlockNote = "doc.note", // Block of highlighted informations
   BlockImportant = "doc.important", // Block of important informations
   BlockDanger = "doc.danger", // Block of very important informations
   BlockQuote = "doc.quote", // Block of very important informations

   // Code section
   Code = "code", // Contains programming definitions (ex: ```js ${label}\n${content}\n```)
   CodeDefinition = "code.def", // Block of one programming element (type, class, schema, ...) (ex: `/* ${label} */\n${content}\n`)
   CodeFunction = "code.func", // Block of expressions (function, method, main, ...)  (ex: `/* ${label} */\n${content}\n`)
   CodeData = "code.data", // Block of data (constant, ...) (ex: `/* ${label} */\n${content}\n`)
   // note: for code sections the label is the content describe in natural language (keep it null otherwise)
}

export enum SectionLanguage {

   // Natural language
   International = "en", // English
   English = "en",
   French = "fr",

   // Presentation language
   Html = "html",
   Markdown = "md",

   // Programming language
   Javascript = "js",
   Typescript = "ts",
   Python = "py",
}

export class SectionUnit extends SemanticUnit {
   static type = "section"
   layout: SectionLayout
   language?: SectionLanguage | string
   label?: SemanticUnit
   content: SemanticUnit[]
   toPrimitives(): Primitives {
      throw "TODO"
   }
   static New(layout: SectionLayout, label: any, content: any, language?: SectionLanguage | string) {
      const unit = new SectionUnit()
      unit.layout = layout
      unit.label = convertAnyToSemanticUnit(label)
      unit.content = appendAnyToSemanticUnits(content, [])
      unit.language = language
      return unit
   }
}

export class ActionUnit extends SemanticUnit {
   static type = "action"
   action_id: string // Future contribution id receiving the result
   tool_id: string // Tool to invoke
   tool_input?: SemanticUnit // Tool invokation inputs
   toPrimitives(): Primitives {
      return this
   }
   static New(action_id: string, tool_id: string, tool_input?: SemanticUnit) {
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
   output?: OneOrMany<SemanticUnit>
   toPrimitives(): Primitives {
      return this
   }
   static Done(action_id: string, output: OneOrMany<SemanticUnit>, ticket_id?: string) {
      const unit = new FeedbackUnit()
      unit.status = ActionStatus.Done
      unit.action_id = action_id
      unit.ticket_id = ticket_id
      unit.output = output
      return unit
   }
   static Running(action_id: string, output: OneOrMany<SemanticUnit>, ticket_id: string) {
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

function convertAnyToSemanticUnit(content: any): SemanticUnit {
   if (Array.isArray(content)) {
      const result: SemanticUnit[] = []
      for (const cnt of content) {
         appendAnyToSemanticUnits(cnt, result)
      }
      return SectionUnit.New(SectionLayout.Block, null, result)
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
