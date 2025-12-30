import { IContributionContext, IToolsProvider, IToolsSession, ToolGuide } from "../../services/generative/context"
import { z, ZodAny } from "zod"
import { SemanticUnit } from "../../services/generative/resource"
import { OneOrMany } from "@jointhedots/core"

// Function Tool types and factory
export interface FunctionToolConfig<TInput extends z.ZodTypeAny, TOutput extends z.ZodTypeAny> {
   id?: string
   label?: string
   intent: string
   policy?: string
   procedure?: string
   input: TInput
   output?: TOutput
   executor: (input: z.infer<TInput>, session: IToolsSession, context: IContributionContext) => Promise<OneOrMany<SemanticUnit>>
}

export function createFunctionTool<TInput extends z.ZodTypeAny, TOutput extends z.ZodTypeAny>(
   config: FunctionToolConfig<TInput, TOutput>
): IToolsProvider {

   class FunctionToolProvider implements IToolsProvider {
      private config: FunctionToolConfig<TInput, TOutput>
      id: string

      constructor(config: FunctionToolConfig<TInput, TOutput>) {
         this.config = config
         this.id = config.id ?? `func_${Math.random().toString(36).substring(2, 9)}`
      }

      getTools(): ToolGuide[] {
         return [{
            id: this.id,
            label: this.config.label ?? this.config.intent.substring(0, 50),
            intent: this.config.intent,
            policy: this.config.policy ?? "",
            procedure: this.config.procedure ?? "",
            input: this.config.input as unknown as ZodAny,
            output: this.config.output as unknown as ZodAny,
         }]
      }

      async invokeTool(tool_id: string, input: unknown, session: IToolsSession, context: IContributionContext): Promise<OneOrMany<SemanticUnit>> {
         if (tool_id !== this.id) {
            throw new Error(`Unknown tool: ${tool_id}`)
         }
         const parsed = this.config.input.parse(input)
         return await this.config.executor(parsed, session, context)
      }

      async createSession(): Promise<IToolsSession> {
         return {}
      }

      disposeSession(_session: IToolsSession): void {
         // No-op for stateless function tools
      }
   }

   return new FunctionToolProvider(config)
}
