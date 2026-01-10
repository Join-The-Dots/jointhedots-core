import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { createOpenAIModel } from "../providers/models/openai"
import { z } from "zod"
import { IGenerativeModel } from "../framework/interfaces/generative"
import { createFunctionTool } from "../providers/tools/function"
import { AgenticPatterns, createWorkbench, TargetOutput, TargetTool, traceContribution } from "../framework/workbench/bench"
import { DataUnit, TextualUnit } from "../framework/semantic/units"
import { getNanoEmbedder } from "../providers/similarity-vector/nano-embedder/index"
import { getDenseEmbeddingSimilarity, VectorMetricType } from "../framework/interfaces/embedder"

async function listSynonyms(word: string, model: IGenerativeModel) {
   const env = createWorkbench()

   env.equipModel(model)

   // Add a termination tool that receives the synonym list
   env.equipTools(createFunctionTool({
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

   const contrib1 = env.emit({
      pattern: AgenticPatterns.ReAct,
      directive: [
         TextualUnit.New("Task: list synonym of: " + word)
      ],
      objective: [
         TargetTool.New("report_synonyms"),
      ],
   })
   console.log("> output with TargetTool:")
   traceContribution(await contrib1.wait())

   const contrib2 = env.emit({
      pattern: AgenticPatterns.Direct,
      directive: [
         TextualUnit.New("Task: list synonym of: " + word)
      ],
      objective: [
         TargetOutput.New(z.object({
            synonyms: z.array(z.string()).describe("List of synonyms found for the word")
         })),
      ],
   })
   console.log("> output with TargetOutput:")
   traceContribution(await contrib2.wait())

   console.log("> Costs:", env.getCosts())
}

async function chessPlayerAgents(model: IGenerativeModel) {
   const env = createWorkbench()

   env.equipModel(model)

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
   for (let turn = 1; turn < 2; turn++) {
      console.log(`--------- Turn ${turn} ---------`)

      player_w = await env.emit({
         pattern: AgenticPatterns.ReAct,
         history: player_w,
         message: player_b.share(),
         objective: [move_action]
      }).wait()
      console.log(`> Player 1:`)
      traceContribution(player_w)

      player_b = await env.emit({
         pattern: AgenticPatterns.ReAct,
         history: player_b,
         message: player_w.share(),
         objective: [move_action]
      }).wait()
      console.log(`> Player 2:`)
      traceContribution(player_b)
   }
   
   console.log("> Costs:", env.getCosts())
}

async function embeddingDemo() {
   console.log("Initializing MiniLM embedder...")
   const embedder = getNanoEmbedder()
   
   const sentences = [
      "The cat sat on the mat.",
      "A feline rested on the rug.",
      "Dogs are loyal companions.",
      "The weather is sunny today.",
      "Machine learning is transforming technology.",
      "AI and deep learning are revolutionizing software.",
   ]
   
   console.log("\nEmbedding sentences...")
   const embeddings = await Promise.all(
      sentences.map(async (text) => ({
         text,
         embedding: await embedder.embed(text),
      }))
   )
   
   console.log(`\nEmbedded ${embeddings.length} sentences (dimension: ${embedder.dimension})`)
   console.log("\n--- Similarity Matrix ---\n")
   
   // Print header
   const shortLabels = sentences.map((_, i) => `S${i + 1}`)
   console.log("     " + shortLabels.map(l => l.padStart(6)).join(" "))
   
   // Print similarity matrix
   for (let i = 0; i < embeddings.length; i++) {
      const row = [shortLabels[i].padEnd(4)]
      for (let j = 0; j < embeddings.length; j++) {
         const similarity = getDenseEmbeddingSimilarity(
            embeddings[i].embedding,
            embeddings[j].embedding,
            VectorMetricType.Cosine
         )
         row.push(similarity.toFixed(3).padStart(6))
      }
      console.log(row.join(" "))
   }
   
   console.log("\n--- Sentences ---")
   sentences.forEach((s, i) => console.log(`S${i + 1}: ${s}`))
   
   // Find most similar pairs
   console.log("\n--- Most Similar Pairs ---")
   const pairs: { i: number; j: number; similarity: number }[] = []
   for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
         pairs.push({
            i,
            j,
            similarity: getDenseEmbeddingSimilarity(
               embeddings[i].embedding,
               embeddings[j].embedding,
               VectorMetricType.Cosine
            ),
         })
      }
   }
   pairs.sort((a, b) => b.similarity - a.similarity)
   
   for (const pair of pairs.slice(0, 3)) {
      console.log(`\n[${pair.similarity.toFixed(3)}] "${sentences[pair.i]}"`)
      console.log(`         "${sentences[pair.j]}"`)
   }
   
   await embedder.dispose()
   console.log("\n✓ Demo complete")
}

async function createModel(name: string) {
   switch (name) {
      case "gpt-5-mini":
         return createOpenAIModel({
            model: "gpt-5-mini",
            baseUrl: "https://wmodel-openai.openai.azure.com/openai/deployments/gpt-5-nano/chat/completions?api-version=2025-01-01-preview",
            apiKey: "4gEBnzj65ooK76R69TJqeL1u0iWcAlSSD9xBXXuJfYRoTdR4d7ybJQQJ99BLAC5T7U2XJ3w3AAABACOGAddN",
         })
      case "gpt-5-nano":
         return createOpenAIModel({
            model: "gpt-5-nano",
            baseUrl: "https://wmodel-openai.openai.azure.com/openai/deployments/gpt-5-nano/chat/completions?api-version=2025-01-01-preview",
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

async function demoCommand(name: string) {
   console.log(`Running demo: ${name}...`)

   switch (name) {
      case "embedding":
         await embeddingDemo()
         break
      case "synonyms": {
         const model = await createModel("gpt-5-nano")
         await listSynonyms("book", model)
         break
      }
      case "chess": {
         const model = await createModel("gpt-5-nano")
         await chessPlayerAgents(model)
         break
      }
      default:
         console.error(`Unknown demo: ${name}`)
         process.exit(1)
   }
}

// CLI setup
yargs(hideBin(process.argv))
   .command(
      'demo <name>',
      'Run demo mode',
      (yargs) => {
         return yargs.positional('name', {
            describe: 'Name of the demo to run',
            type: 'string',
            choices: ['synonyms', 'chess', 'embedding']
         })
      },
      async (argv) => {
         await demoCommand(argv.name as string)
      }
   )
   .demandCommand(1, 'You must specify a command (demo <name>)')
   .help()
   .argv