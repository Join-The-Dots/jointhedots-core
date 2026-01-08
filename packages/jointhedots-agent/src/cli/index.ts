import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { createOpenAIModel } from "../providers/models/openai"
import { z } from "zod"
import { IGenerativeModel } from "../services/generative/model"
import { createFunctionTool } from "../providers/tools/function"
import { AgenticPatterns, createWorkbench, TargetOutput, TargetTool } from "../services/generative/runtime"
import { DataUnit, TextualUnit } from "../services/semantic/units"
import { AckPolicy, connect, ConnectionOptions, DeliverPolicy, JSONCodec, NatsConnection, ReplayPolicy } from "nats"

interface IAgenticStream {

}

interface IAgenticState {

}

interface IAgenticBus {
   subscribe(channel: string, worker: (msg: any, stream: IAgenticStream) => void): Promise<void>
   terminate(): Promise<void>
}

class NatsTenantBus implements IAgenticBus {
   private constructor(
      readonly tenantId: string,
      readonly nc: NatsConnection,
   ) {
   }
   async subscribe(channel: string, worker: (msg: any, stream: IAgenticStream) => void): Promise<void> {
      const streamName = "agent-input"
      const consumerName = "FILTERED_WORKER"
      const subject = `${this.tenantId}.${channel}`

      const { nc } = this
      const jsm = await nc.jetstreamManager()
      const js = nc.jetstream()


      // 1. Créer le consommateur avec un filtre
      await jsm.consumers.add(streamName, {
         durable_name: consumerName,
         filter_subject: "test.agent1.>", // On ne veut que les sujets commençant par ceci
         ack_policy: AckPolicy.Explicit,
      })

      // 2. Récupérer le consommateur filtré
      const consumer = await js.consumers.get(streamName, consumerName)
      const messages = await consumer.consume()

      console.log(`> subscribe: ${subject}`)
      const jc = JSONCodec()
      for await (const msg of messages) {
         try {
            //const data = jc.decode(msg.data)
            const data = msg.data
            console.log(`📥 Reçu sur [${msg.subject}]:`, data)
            await worker(msg.data, null)
            msg.ack()
         } catch (err) {
            console.error("Erreur de traitement :", err)
            msg.nak()
         }
      }
      return null
   }
   async terminate() {
      await this.nc.drain()
   }
   static async New(tenantId: string, opts?: ConnectionOptions) {
      try {
         const nc: NatsConnection = await connect(opts)
         console.log(`Connected to ${nc.getServer()}`)
         return new NatsTenantBus(tenantId, nc)
      } catch (err) {
         throw new Error(`Erreur de connexion: ${err.message}`)
      }
   }
}

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

   const res = await env.emit({
      pattern: AgenticPatterns.ReAct,
      directive: [
         TextualUnit.New("Task: list synonym of: " + word)
      ],
      objective: [
         TargetOutput.New(z.object({
            synonyms: z.array(z.string()).describe("List of synonyms found for the word")
         })),
         TargetTool.New("report_synonyms"),
      ],
   }).wait()
   console.log(res.data.output)

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

async function serveCommand() {
   console.log("Starting NATS mode...")
   
   const bus = await NatsTenantBus.New("test", {
      servers: "nats://localhost:4222",
   })

   const model = await createModel("gpt-5-nano")

   bus.subscribe("agent1.input", async (msg) => {
      console.log(msg.toString())

      await listSynonyms("book", model)

      await chessPlayerAgents(model)
   })
}

async function demoCommand() {
   console.log("Running demo...")
   
   const model = await createModel("gpt-5-nano")
   
   await listSynonyms("book", model)
}

// CLI setup
yargs(hideBin(process.argv))
   .command(
      'serve',
      'Start the agent in NATS mode',
      () => {},
      async () => {
         await serveCommand()
      }
   )
   .command(
      'demo',
      'Run demo mode',
      () => {},
      async () => {
         await demoCommand()
      }
   )
   .demandCommand(1, 'You must specify a command (serve or demo)')
   .help()
   .argv