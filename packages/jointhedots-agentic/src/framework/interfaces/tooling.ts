import { ZodType } from "zod"
import { Async, MapLike, OneOrMany } from "../../common/types"
import { SemanticUnit } from "../semantic/units"
import { IAgenticWorkbench } from "./context"

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
   listTools(): ToolGuide[] // Liste of tools provided
   invokeTool(tool_id: string, tool_input: SemanticUnit, session: IToolsSession, env: IAgenticWorkbench): Promise<OneOrMany<SemanticUnit>>

   // Provider state management
   createSession(): Async<IToolsSession> // Return null when provider is stateless
   disposeSession(session: IToolsSession)
}
