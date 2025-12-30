import { createOpenAIModel } from "../providers/models/openai"
import { z } from "zod"
import { IGenerativeModel } from "../services/generative/model"
import { createFunctionTool } from "../providers/tools/function"
import { createContext, createEnvironment, TargetOutput, TargetTool } from "../services/generative/runtime"
import { DataUnit, TextualUnit } from "../services/generative/resource"

async function listSynonyms(word: string, model: IGenerativeModel) {
  const env = createEnvironment()

  // Add a termination tool that receives the synonym list
  env.equip(createFunctionTool({
    id: "report_synonyms",
    label: "Report synonyms",
    intent: "When you have found all synonyms, call this tool to report them and complete the task",
    input: z.object({
      synonyms: z.array(z.string()).describe("List of synonyms found for the word")
    }),
    async executor(input) {
      return DataUnit.New({
        ...input,
        text: `Task completed. Reported ${input.synonyms.length} synonyms: ${input.synonyms.join(", ")}`
      })
    }
  }))

  const ctx = createContext(model, env)
  const res = await ctx.generate({
    directive: [
      TextualUnit.New("Task: list synonym of: " + word)
    ],
    objective: [
      TargetTool.New("report_synonyms"),
      TargetOutput.New(z.object({
        synonyms: z.array(z.string()).describe("List of synonyms found for the word")
      })),
    ],
  }).wait()
  console.log(res.data.output)

}

async function chessPlayerAgents(model: IGenerativeModel) {
  const env = createEnvironment()

  const ctx = createContext(model, env)

  let start = ctx.emit(null, {
    system: [
      TextualUnit.New([
        "You a professional chess player, that play virtualy by saying the move.",
        "And the other player will do the same, you shall imagine the chess table.",
        "At begin say your color, never say it again.",
        "When colors are known, after each time other player give a move, respond by saying your move.",
        "Definition of a 'move' shall be describe as: <move><piece>{PieceName}</piece><from>{FromLocation}</from><to>{NewLocation}</to></move>",
        "! IMPORTANT: each move shall be said shortly as possible the piece name and from positon to target position.",
        "! IMPORTANT: After each move say each taken piece win on adverser by listing each piece and there position.",
      ].join("\n"))
    ]
  })

  const move_action = TargetOutput.New(z.object({
    name: z.string().describe("name of the moved chess piece"),
    from: z.string().describe("current coordinate of moved piece"),
    to: z.string().describe("next coordinate of moved piece"),
  }))
  let player_1 = start, player_2 = start
  for (let turn = 1; turn < 10; turn++) {
    console.log(`--------- Turn ${turn} ---------`)

    player_1 = await ctx.generate({
      history: player_1,
      message: player_2,
      objective: [move_action]
    }).wait()
    console.log(`> Player 1: ${JSON.stringify(player_1.data.message)}`)

    player_2 = await ctx.generate({
      history: player_2,
      message: player_1,
      objective: [move_action]
    }).wait()
    console.log(`> Player 2: ${JSON.stringify(player_2.data.message)}`)
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

const model = await createModel("gpt-5-nano")
//await listSynonyms("book", model)
await chessPlayerAgents(model)
