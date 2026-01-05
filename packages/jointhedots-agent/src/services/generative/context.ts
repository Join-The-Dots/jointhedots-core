import { ZodType } from "zod"
import { Async, MapLike, OneOrMany } from "@jointhedots/core"
import { ActionUnit, AttachmentUnit, SemanticUnit } from "../semantic/units"
import { Blob, Resource } from "../semantic/resource"
import { IGenerativeModel } from "./model"

export type ToolID = string

export type ToolSet = Record<ToolID, ToolGuide>

// Tool selector define what agent can use
// - All tools: `*`
// - All provider tools: `${provider_id}.*`
// - All provider tools subset: `${provider_id}.${subset_id}.*`
export type ToolSelector = string

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

export interface IToolsProvider {
   readonly id: string

   // Tooling
   getTools(): ToolGuide[] // Liste of tools provided
   invokeTool(tool_id: string, tool_input: any, session: IToolsSession, env: IAgenticWorkbench): Promise<OneOrMany<SemanticUnit>>

   // Provider state management
   createSession(): Promise<IToolsSession> // Return null when provider is stateless
   disposeSession(session: IToolsSession)
}

export interface IAgenticPattern {
   execute(contrib: Contribution)
}

export interface IAgenticWorkbench {

   emit(spec: ContributionSpec, data?: ContributionData): Contribution

   equipModel(model: IGenerativeModel)
   getModel(criterion?: any): IGenerativeModel

   equipTools(provider: IToolsProvider): void
   selectTools(selector?: OneOrMany<ToolSelector>): ToolSet
   executeTool(task: ActionUnit): Promise<OneOrMany<SemanticUnit>>

   getResource(uri: string): Resource
   putResource(res: Resource)
   listResources(): Generator<Resource>
   fetchResource(uri: string): Promise<Resource>
}

// Target condition (defined when contribution reach expected state)
export abstract class Target {
   abstract getTool(env: IAgenticWorkbench): ToolGuide
   abstract check(contrib: Contribution): Async<boolean>
}

// Target condition (defined when contribution reach expected state)
export abstract class Tooling {
   abstract getTools(env: IAgenticWorkbench): ToolGuide[]
}

export type ContributionSpec = {

   // Agentic pattern
   pattern?: IAgenticPattern

   // History propagation
   history?: OneOrMany<Contribution>

   // Environment
   tooling?: OneOrMany<Tooling> // Tools available
   private?: OneOrMany<SemanticUnit> // Privates messages
   message?: OneOrMany<SemanticUnit> // Messages

   // Conditionning
   system?: OneOrMany<SemanticUnit> // System prompt for this contribution
   directive?: OneOrMany<SemanticUnit> // Directive for this contribution
   objective?: OneOrMany<Target> // Target that define the goals achievement condition
}


export type Invokation = {
   tool_id?: string
   input?: unknown
   output?: OneOrMany<SemanticUnit>
   failure?: Error
}

export type StreamPacket = {
   message?: OneOrMany<SemanticUnit>
}

export type Streamlet<T> = T[]

export type ContributionData = {
   pattern?: IAgenticPattern

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

export type ContributionStatus = "success" | "failed" | "pending" | "running"

export abstract class Contribution extends Resource {

   // Definition
   readonly id: string = null
   readonly env: IAgenticWorkbench
   status: ContributionStatus = "pending"
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
   share(fragment?: string): AttachmentUnit {
      return AttachmentUnit.New(this, fragment)
   }

   getDependencies(): Resource[] {
      const deps: Resource[] = []
      function collectConnectedContributions(value) {
         if (value instanceof Resource) {
            if (!deps.includes(value)) deps.push(value)
         }
         else if (value instanceof SemanticUnit) {
            //TODO
         }
         else if (Array.isArray(value)) {
            value.forEach(collectConnectedContributions)
         }
         else if (value.constructor === Object) {
            for (const key in value) {
               collectConnectedContributions(value[key])
            }
         }
      }
      collectConnectedContributions(this.spec)
      return deps
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

