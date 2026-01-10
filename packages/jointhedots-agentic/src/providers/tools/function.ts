import { IAgenticWorkbench } from "../../framework/interfaces/context"
import { z, ZodAny } from "zod"
import { OneOrMany } from "../../common/types"
import { SemanticUnit } from "../../framework/semantic/units"
import { transformUnitToData } from "../../framework/semantic/transform"
import { IToolsProvider, IToolsSession, ToolGuide } from "../../framework/interfaces/tooling"

// Function Tool types and factory
export interface FunctionToolConfig<TInput extends z.ZodTypeAny, TOutput extends z.ZodTypeAny> {
   id?: string
   label?: string
   intent: string
   policy?: string
   procedure?: string
   input: TInput
   output?: TOutput
   executor: (input: z.infer<TInput>, session: IToolsSession, env: IAgenticWorkbench) => Promise<OneOrMany<SemanticUnit>>
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

      listTools(): ToolGuide[] {
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

      async invokeTool(tool_id: string, input: SemanticUnit, session: IToolsSession, env: IAgenticWorkbench): Promise<OneOrMany<SemanticUnit>> {
         if (tool_id !== this.id) {
            throw new Error(`Unknown tool: ${tool_id}`)
         }
         const data = transformUnitToData(input)
         const parsed = this.config.input.parse(data)
         return await this.config.executor(parsed, session, env)
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
