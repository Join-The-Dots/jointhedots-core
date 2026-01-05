
import { z } from "@jointhedots/core"
import { createOpenAIModel } from "../providers/models/openai"
import { AgenticPatterns, createEnvironment, TargetOutput } from "../services/generative/runtime"
import { TextualUnit } from "../services/semantic/units"
import { ShowGraph } from "./components/ContributionPanel/ContributionsGraph"
import { useAsyncMemo } from "@jointhedots/core/react"
import { IAgenticEnvironment } from "../services/generative/context"

async function chessPlayerAgents(env: IAgenticEnvironment) {


   const move_action = TargetOutput.New(z.object({
      name: z.string().describe("name of the moved chess piece"),
      from: z.string().describe("current SAN coordinate of moved piece"),
      to: z.string().describe("next SAN coordinate of moved piece"),
   }))

   let player_w = env.emit({
      system: [
         TextualUnit.New([
            "Role: You are an International Chess Grandmaster playing WHITE.",
            "Context: Here is the starting FEN position: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "Task: Analyze the current position, identify threats and tactical opportunities. Choose the best move for White.",
            "Expected Output Format: 1. A very brief explanation of your strategy (1-2 sentences). 2. The final move in bold using Standard Algebraic Notation (e.g., **e4**).",
            "It is your turn."
         ])
      ]
   }, null)
   let player_b = env.emit({
      system: [
         TextualUnit.New([
            "Role: You are an International Chess Grandmaster playing BLACK.",
            "Context: Here is the starting FEN position: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "Task: White has just moved. Analyze the position, defend against immediate threats, and look for counter-attacks. Choose the best move for Black.",
            "Expected Output Format: 1. A very brief explanation of your strategy (1-2 sentences). 2. The final move in bold using Standard Algebraic Notation (e.g., **e5**).",
            "It is your turn."
         ])
      ]
   }, null)
   for (let turn = 1; turn < 10; turn++) {
      console.log(`--------- Turn ${turn} ---------`)

      player_w = await env.emit({
         pattern: AgenticPatterns.ReAct,
         history: player_w,
         message: player_b.share(),
         objective: [move_action]
      }).wait()
      console.log(`> Player 1: ${JSON.stringify(player_w.data.message)}`)

      player_b = await env.emit({
         pattern: AgenticPatterns.ReAct,
         history: player_b,
         message: player_w.share(),
         objective: [move_action]
      }).wait()
      console.log(`> Player 2: ${JSON.stringify(player_b.data.message)}`)
   }
}

async function createModel(name: string) {
   switch (name) {
      case "gpt-5-mini":
         return createOpenAIModel({
            model: "gpt-5-mini",
            temperature: 0.9,
            baseUrl: "https://wmodel-openai.openai.azure.com/openai/deployments/gpt-5-nano/chat/completions?api-version=2025-01-01-preview",
            apiKey: "4gEBnzj65ooK76R69TJqeL1u0iWcAlSSD9xBXXuJfYRoTdR4d7ybJQQJ99BLAC5T7U2XJ3w3AAABACOGAddN",
         })
      case "gpt-5-nano":
         return createOpenAIModel({
            model: "gpt-5-nano",
            baseUrl: "https://wmodel-openai.openai.azure.com/openai/deployments/gpt-5-nano-2/chat/completions?api-version=2025-01-01-preview",
            apiKey: "4gEBnzj65ooK76R69TJqeL1u0iWcAlSSD9xBXXuJfYRoTdR4d7ybJQQJ99BLAC5T7U2XJ3w3AAABACOGAddN",
         })
      /*case "ministral-3":
        return createOllamaModel({
          model: "ministral-3:14b",
          baseUrl: "http://localhost:11434"
        })
      case "lms":
        return createLMStudioModel({
          model: "ministral-3:14b",
        })*/
      default:
         return null
   }
}

export function App() {
   const env = useAsyncMemo(async () => {
      const env = createEnvironment()
      const model = await createModel("gpt-5-nano")
      env.equipModel(model)
      await chessPlayerAgents(env)
      return env
   }, null, [])
   return <div>ShowGraph<ShowGraph env={env} /></div>
}
