import { Async, OneOrMany } from "../../common/types"
import { ActionUnit, AttachmentUnit, SemanticUnit } from "../semantic/units"
import { Blob, Resource } from "../semantic/resource"
import { IToolsProvider, ToolGuide, ToolSelector, ToolSet } from "./tooling"
import { CompletionCost, IGenerativeModel } from "./generative"

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

   getCosts(): CompletionCost
}

// Target condition (defined when contribution reach expected state)
export abstract class Target {
   abstract getTool(env: IAgenticWorkbench): ToolGuide
   abstract executeTool(action: ActionUnit, env: IAgenticWorkbench): Async<OneOrMany<SemanticUnit>>
   abstract check(contrib: Contribution): Async<boolean>
}

// Target condition (defined when contribution reach expected state)
export interface IAgenticTooling {
   getTools(env: IAgenticWorkbench): ToolGuide[]
}

export type ContributionSpec = {

   // Agentic pattern
   pattern?: IAgenticPattern

   // History propagation
   history?: OneOrMany<Contribution>

   // Environment
   tooling?: OneOrMany<IAgenticTooling> // Tools available
   private?: OneOrMany<SemanticUnit> // Privates messages
   message?: OneOrMany<SemanticUnit> // Messages

   // Conditionning
   system?: OneOrMany<SemanticUnit> // System prompt for this contribution
   directive?: OneOrMany<SemanticUnit> // Directive for this contribution
   objective?: OneOrMany<Target> // Target that define the goals achievement condition
}


export type Invokation = {
   tool_id?: string
   input?: SemanticUnit
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

   // Semantic items
   consumeds?: Streamlet<Contribution>

   // Objective items
   output?: unknown
}

export type ContributionLog = {
   createdAt?: number
   completedAt?: number
   costs?: CompletionCost
}

export type ContributionStatus = "success" | "failed" | "pending" | "running"

export interface IContributionHook {
   wait(): Promise<Contribution>
}

export class Contribution extends Resource {

   // Definition
   status: ContributionStatus = "pending"
   spec?: ContributionSpec = null
   data: ContributionData = null
   log: ContributionLog = null
   hook?: IContributionHook

   constructor(
      readonly id: string,
      readonly env: IAgenticWorkbench,
   ) {
      super()
   }
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
   async wait(): Promise<Contribution> {
      if (this.hook) return this.hook.wait()
      return this
   }
   toSemantic() {
      return this.data.message
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

