import { z } from "zod"
import OpenAI from "openai"
import { AzureOpenAI } from "openai"
import { IGenerativeModel, MessageFrame, CompletionResult, ModelCapabilities, ModelIdentity, CompletionQuery } from "../../services/generative/model"
import { TextualUnit, ActionUnit, SemanticUnit, VisualUnit, FeedbackUnit, AudioUnit } from "../../services/semantic/units"
import type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionContentPart, ChatCompletionSystemMessageParam } from "openai/resources/chat/completions"
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources.js"
import { ToolGuide } from "../../services/generative/context"

export interface OpenAIModelConfig {
   apiKey: string
   model: string
   baseUrl?: string
   temperature?: number
   top_k?: number
   maxTokens?: number
   /** For Azure OpenAI, specify the API version */
   azureApiVersion?: string
   /** For Azure OpenAI, specify the deployment name */
   azureDeployment?: string
}

export class OpenAIAgentModel implements IGenerativeModel {
   private client: OpenAI | AzureOpenAI
   private config: OpenAIModelConfig
   readonly identity: ModelIdentity
   readonly capabilities: ModelCapabilities

   constructor(config: OpenAIModelConfig) {
      this.config = {
         model: config.model ?? "gpt-4o-mini",
         temperature: config.temperature ?? 1,
         maxTokens: config.maxTokens ?? 4096,
         ...config,
      }

      const model = this.config.model.toLowerCase()
      const isLegacy = /^(davinci|curie|babbage|ada|text-)/.test(model)
      const isVision = /gpt-4o|gpt-4-turbo|gpt-4-vision/.test(model)
      const isAudio = /gpt-4o-audio/.test(model)
      const isReasoning = /^o[1-9]|^o3/.test(model)

      this.identity = { id: this.config.model, provider: "openai" }
      this.capabilities = {
         input: {
            text: true,
            image: isVision,
            audio: isAudio,
            video: false,
         },
         output: {
            text: true,
            image: false,
            audio: isAudio,
            toolCalling: !isLegacy && !isReasoning,
            parallelToolCalls: !isLegacy && !isReasoning,
            structuredOutput: !isLegacy,
            streaming: !isReasoning,
            reasoning: isReasoning,
         },
         sampling: {
            maxInputTokens: isReasoning ? 200000 : 128000,
            maxOutputTokens: isReasoning ? 100000 : 16384,
            temperature: isReasoning ? undefined : { min: 0, max: 2, default: 1 },
            topP: isReasoning ? undefined : { min: 0, max: 1, default: 1 },
            stopSequences: !isReasoning,
         },
      }

      const isAzure = config.baseUrl?.includes('.azure.com')

      if (isAzure) {
         this.client = new AzureOpenAI({
            apiKey: config.apiKey,
            endpoint: config.baseUrl,
            apiVersion: config.azureApiVersion ?? "2024-06-01",
            deployment: config.azureDeployment ?? config.model,
         })
      } else {
         this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
         })
      }
   }

   async generate(query: CompletionQuery): Promise<CompletionResult> {
      const { frames } = query
      const messages = this.convertToOpenAIMessages(frames)
      const tools = this.convertToOpenAITools(query.tools)

      let tool_choice = undefined
      if (tools.length > 0) tool_choice = "auto"
      if (query.requiredTools) tool_choice = "required"

      const req: ChatCompletionCreateParamsNonStreaming = {
         model: this.config.model,
         reasoning_effort: "minimal",
         top_p: this.config.top_k,
         temperature: this.config.temperature,
         max_completion_tokens: this.config.maxTokens,
         tools: tools.length > 0 ? tools : undefined,
         tool_choice,
         messages,
      }

      const res = await this.client.chat.completions.create(req)
      return {
         items: this.convertToAgentPrimitives(res),
      }
   }

   private convertToOpenAIMessages(thread: MessageFrame[]): ChatCompletionMessageParam[] {
      const messages: ChatCompletionMessageParam[] = []
      for (const frame of thread) {
         this.appendFrameToMessages(frame, messages)
      }
      return messages
   }

   private mapRole(role?: MessageFrame["role"]): ChatCompletionMessageParam["role"] {
      switch (role) {
         case "system":
            return "system"
         case "directive":
            return "developer"
         case "self":
            return "assistant"
         case "agent":
            return "user"
         default:
            return "tool"
      }
   }

   private appendFrameToMessages(frame: MessageFrame, messages: ChatCompletionMessageParam[]) {

      const role = this.mapRole(frame.role)
      const msg: ChatCompletionMessageParam = { role, content: [] } as ChatCompletionMessageParam
      messages.push(msg)

      for (const item of frame.items) {
         if (item.type === TextualUnit.type) {
            const unit = item as TextualUnit
            (msg.content as ChatCompletionContentPart[]).push({ type: "text", text: unit.text })
         }
         else if (item.type === VisualUnit.type) {
            const unit = item as VisualUnit
            (msg.content as ChatCompletionContentPart[]).push({
               type: "image_url",
               image_url: { url: unit.toURI() }
            })
         }
         else if (item.type === AudioUnit.type) {
            const unit = item as AudioUnit
            const { format } = unit.data
            if (format === "wav" || format === "mp3") {
               (msg.content as ChatCompletionContentPart[]).push({
                  type: "input_audio",
                  input_audio: { data: unit.data.toBase64(), format }
               })
            }
            else {
               console.log("Audio semantic unit ignore")
            }
         }
         else if (item.type === ActionUnit.type) {
            const unit = item as ActionUnit
            if (msg.role === "assistant") {
               if (!msg.tool_calls) msg.tool_calls = []
               msg.tool_calls.push({
                  type: "function",
                  id: unit.action_id,
                  function: {
                     name: unit.tool_id,
                     arguments: typeof unit.tool_input === "string"
                        ? unit.tool_input
                        : JSON.stringify(unit.tool_input ?? {}),
                  },
               })
            }
            else {
               //(msg.content as ChatCompletionContentPart[]).push({ type: "text", text: unit.text })
            }
         }
         else if (item.type === FeedbackUnit.type) {
            const unit = item as FeedbackUnit
            const content = unit.status === "failed"
               ? unit.message ?? "Tool execution failed"
               : typeof unit.output === "string"
                  ? unit.output
                  : JSON.stringify(unit.output ?? "")
            if (msg.role === "assistant") {
               messages.push({
                  role: "tool",
                  tool_call_id: unit.action_id,
                  content,
               })
            }
            else {
               //(msg.content as ChatCompletionContentPart[]).push({ type: "text", text: unit.text })
            }
         }
      }
   }

   private convertToOpenAITools(tools: Record<string, ToolGuide>): ChatCompletionTool[] {
      return Object.values(tools).map(tool => {
         const description = [tool.intent, tool.procedure].filter(Boolean).join("\n")

         return {
            type: "function",
            function: {
               name: tool.id,
               description: description || tool.label,
               parameters: tool.input ? tool.input.toJSONSchema() : undefined,
            },
         }
      })
   }

   private convertToAgentPrimitives(response: OpenAI.Chat.Completions.ChatCompletion): SemanticUnit[] {
      const units: SemanticUnit[] = []

      for (const choice of response.choices) {
         const message = choice.message

         // Handle text content
         if (message.content) {
            units.push(TextualUnit.New(message.content))
         }

         // Handle tool calls
         if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
               // Handle both standard function tool calls
               if (toolCall.type === "function") {
                  const funcCall = toolCall as { id: string; type: "function"; function: { name: string; arguments: string } }
                  let input: any
                  try {
                     input = JSON.parse(funcCall.function.arguments)
                  } catch {
                     input = funcCall.function.arguments
                  }

                  units.push(ActionUnit.New(
                     funcCall.id,
                     funcCall.function.name,
                     input,
                  ))
               }
            }
         }
      }

      return units
   }
}

// Factory function for convenience
export function createOpenAIModel(config: OpenAIModelConfig): IGenerativeModel {
   return new OpenAIAgentModel(config)
}
