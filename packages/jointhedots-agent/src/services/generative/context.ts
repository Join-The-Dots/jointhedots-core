import { ZodType } from "zod"
import { Content, SemanticUnit } from "./resource"
import { Blob, Resource } from "./resource"
import { Async, MapLike, OneOrMany } from "@jointhedots/core"

export type ToolID = string

export enum StandardToolID {
   WebSearch = "std.web-search",
   FileSearch = "std.file-search",
   CodeInterpreter = "std.code-interpreter",
   Output = "std.output",
}

export interface ToolGuide {
   readonly id: ToolID // Command id (can be StandardToolID)
   readonly label: string // Short displayable text
   readonly tags?: string[]
   readonly metadata?: MapLike<string>
   readonly intent?: string // Help to think to use the tool
   readonly policy?: string // Help to confirm the tool usage
   readonly procedure?: string // Help to use the tools properly
   readonly input?: ZodType
   readonly output?: ZodType
}

export interface IToolsSession {
   // Can be anything
}

// Tool selector define what agent can use
// - All tools: `*`
// - All provider tools: `${provider_id}.*`
// - All provider tools subset: `${provider_id}.${subset_id}.*`
export type ToolSelector = string[]

export interface IToolsProvider {
   readonly id: string

   // Tooling
   getTools(): ToolGuide[] // Liste of tools provided
   invokeTool(tool_id: string, tool_input: any, session: IToolsSession, context: IContributionContext): Promise<OneOrMany<SemanticUnit>>

   // Provider state management
   createSession(): Promise<IToolsSession> // Return null when provider is stateless
   disposeSession(session: IToolsSession)
}

export interface IEnvironment {
   equip(provider: IToolsProvider): void
   getTool(tool_id: string): ToolGuide
   selectTools(selector?: ToolSelector): ToolGuide[]
   executeTool(input: any, context: IContributionContext): Promise<OneOrMany<Content>>
}

// Target condition (defined when contribution reach expected state)
export abstract class Target {
   abstract getTool(ctx: IContributionContext): ToolGuide
   abstract check(contrib: Contribution, ctx: IContributionContext): Async<boolean>
}

export type ContributionSpec = {
   // History propagation
   history?: OneOrMany<Contribution>

   // Environment
   tooling?: ToolSelector // Tools available
   private?: OneOrMany<Content> // Privates messages
   message?: OneOrMany<Content> // Messages

   // Conditionning
   system?: OneOrMany<Content> // System prompt for this contribution
   directive?: OneOrMany<Content> // Directive for this contribution
   objective?: OneOrMany<Target> // Target that define the goals achievement condition
}

export type OutputResult = {
   guide: ToolGuide
   data: any
}

export type Invokation = {
   tool_id?: string
   input?: unknown
   output?: OneOrMany<Content>
   failure?: Error
}

export type StreamPacket = {
   message?: OneOrMany<Content>
}

export type Streamlet<T> = T[]

export type ContributionData = {
   // Semantic items
   message?: Streamlet<SemanticUnit>

   // Audio items
   audio?: Streamlet<unknown>

   // Visual items
   visual?: Streamlet<unknown>

   // Visual items
   video?: Streamlet<unknown>

   // Actions items
   actions?: Record<string, Invokation>

   // Objective items
   output?: unknown
}

export abstract class Contribution extends Resource {

   // Definition
   id: string = null
   status: "success" | "failed" | "pending" | "running" = "pending"
   spec?: ContributionSpec = null
   data: ContributionData = {}

   abstract wait(): Promise<Contribution>
   emit<K extends keyof ContributionData, T = ContributionData[K] extends Streamlet<infer T> ? T : never>(channel: K, content: T | T[]): T | T[] {
      const data = this.data[channel]
      if (Array.isArray(data)) {
         if (Array.isArray(content)) data.push(...content)
         else if (content) data.push(content)
      }
      else if (content) {
         if (Array.isArray(content)) this.data[channel] = content as any
         else if (content) this.data[channel] = [content] as any
      }
      return content
   }
   * iter<K extends keyof ContributionData, T = ContributionData[K] extends Streamlet<infer T> ? T : never>(channel: K): Generator<T> {
      const items = this.data[channel]
      if (Array.isArray(items)) {
         for (const item of items) {
            yield item
         }
      }
   }
   has<K extends keyof ContributionData>(channel: K): boolean {
      return !!this.data[channel]
   }

   getURI(): string {
      return `contrib:${this.id}`
   }
   toSharableURI(): string {
      return this.getURI()
   }
   toBlob(): Blob {
      return Blob.fromString(JSON.stringify(this.toJSON()), "contribution", "application")
   }
   toString(): string {
      return this.getURI()
   }
   toJSON(): any {
      return JSON.parse(JSON.stringify(this, (key, value) => {
         if (value instanceof Resource) {
            return value.toJSON()
         }
         return value
      }))
   }
}

export interface IContributionContext {
   getResource(id: string): Resource
   fetchResource(id: string): Promise<Resource>
   emit(data: ContributionData, spec?: ContributionSpec): Contribution
   generate(spec: ContributionSpec): Contribution
}
