import { SemanticUnit } from "../semantic/units"
import { ToolGuide, ToolID } from "./tooling"

export interface ModelInputCapabilities {
   text: boolean
   image: boolean
   audio: boolean
   video: boolean
}

export interface ModelOutputCapabilities {
   text: boolean
   image: boolean
   audio: boolean
   toolCalling: boolean
   parallelToolCalls: boolean
   structuredOutput: boolean
   streaming: boolean
   reasoning: boolean
}

export interface ModelSamplingCapabilities {
   maxInputTokens?: number
   maxOutputTokens?: number
   temperature?: { min: number; max: number; default: number }
   topP?: { min: number; max: number; default: number }
   topK?: { min: number; max: number; default: number }
   stopSequences?: boolean
}

export interface ModelIdentity {
   id: string
   name?: string
   provider: string
}

export interface ModelCapabilities {
   input: ModelInputCapabilities
   output: ModelOutputCapabilities
   sampling: ModelSamplingCapabilities
}

export type MessageRole =
   | "system" // Global rules, situation and goals
   | "agent" // Produced by an agent (user, llm, tool, ...)
   | "directive" // Update rules, situation and goals
   | "resource" // Information, data source
   | "notification" // Tool/agent reaction
   | "self" // Only for reframed thread, equivalent to 'agent' but for a specific agent 

export type MessageFrame = {
   role: MessageRole
   items: SemanticUnit[]
}

export type CompletionCost = {
   [metric: string]: number
}

export type CompletionQuery = {
   frames: MessageFrame[]
   tools: Record<ToolID, ToolGuide>
   requiredTools: boolean | ToolGuide[]
}

export type CompletionResult = {
   items: SemanticUnit[]
   costs?: CompletionCost
}

export interface IGenerativeModel {
   readonly identity: ModelIdentity
   readonly capabilities: ModelCapabilities
   generate(query: CompletionQuery): Promise<CompletionResult>
}
