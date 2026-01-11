import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { createOpenAIModel } from "../providers/generative-models/openai"
import { z } from "zod"
import { IGenerativeModel } from "../framework/interfaces/generative"
import { createFunctionTool } from "../providers/tools/function"
import { AgenticPatterns, createWorkbench, TargetOutput, TargetTool, traceContribution } from "../framework/workbench/bench"
import { DataUnit, TextualUnit } from "../framework/semantic/units"
import { getMiniEmbedder } from "../providers/text-matching-models/all-MiniLM-L6-v2/index"
import { getBgeSmallEmbedder } from "../providers/text-matching-models/bge-small-en-v1.5/index"
import { getJinaReranker } from "../providers/text-matching-models/jina-reranker-v1-turbo-en/index"
import { getVectorSimilarity, VectorMetricType } from "../common/vector_f32"
import { filterText, filterUnits } from "../framework/semantic/filter"
import { transformTextToUnits, transformUnitsToText } from "../framework/semantic/transform"

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
   const embedder = getMiniEmbedder()
   
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
         const similarity = getVectorSimilarity(
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
            similarity: getVectorSimilarity(
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

async function rerankerDemo() {
   console.log("Initializing Jina Reranker...")
   const reranker = getJinaReranker()

   const query = "What are the benefits of exercise for mental health?"
   
   const documents = [
      "Regular physical activity has been shown to reduce symptoms of depression and anxiety.",
      "The stock market experienced significant volatility this quarter.",
      "Exercise releases endorphins, which are natural mood boosters that improve mental wellbeing.",
      "A balanced diet includes proteins, carbohydrates, and healthy fats.",
      "Studies show that just 30 minutes of walking can help reduce stress levels.",
      "The new smartphone features an improved camera and longer battery life.",
      "Yoga and meditation combined with physical movement can enhance cognitive function.",
      "Climate change is affecting weather patterns globally.",
   ]

   console.log(`\nQuery: "${query}"`)
   console.log(`\nReranking ${documents.length} documents...\n`)

   const results = await reranker.rerank(query, documents)

   console.log("--- Ranked Results ---\n")
   for (let rank = 0; rank < results.length; rank++) {
      const result = results[rank]
      const doc = documents[result.index]
      const relevance = result.score >= 0.5 ? "✓ RELEVANT" : result.score >= 0.1 ? "~ PARTIAL" : "✗ NOT RELEVANT"
      console.log(`#${rank + 1} [${result.score.toFixed(4)}] ${relevance}`)
      console.log(`   "${doc}"\n`)
   }

   // Show score distribution
   console.log("--- Score Distribution ---")
   const highRelevance = results.filter(r => r.score >= 0.5).length
   const partialRelevance = results.filter(r => r.score >= 0.1 && r.score < 0.5).length
   const lowRelevance = results.filter(r => r.score < 0.1).length
   console.log(`High relevance (≥0.5):    ${highRelevance}`)
   console.log(`Partial relevance (0.1-0.5): ${partialRelevance}`)
   console.log(`Low relevance (<0.1):     ${lowRelevance}`)

   await reranker.dispose()
   console.log("\n✓ Demo complete")
}

async function filterDemo() {
   console.log("=".repeat(60))
   console.log("Hierarchical Document Pruning Demo")
   console.log("=".repeat(60))

   // Sample technical documentation
   const document = `# TypeScript Guide

This guide covers TypeScript fundamentals and advanced patterns.

## Chapter 1: Basic Types

TypeScript provides several basic types for variables.

### 1.1 Primitive Types

The primitive types include:
- **string**: for textual data
- **number**: for numeric values  
- **boolean**: for true/false values

### 1.2 Arrays and Tuples

Arrays can be typed using generic syntax:
\`\`\`typescript
const numbers: number[] = [1, 2, 3];
const tuple: [string, number] = ["hello", 42];
\`\`\`

## Chapter 2: Functions

Functions are first-class citizens in TypeScript.

### 2.1 Function Types

You can type function parameters and return values:
\`\`\`typescript
function greet(name: string): string {
   return "Hello, " + name;
}
\`\`\`

### 2.2 Arrow Functions

Arrow functions provide concise syntax:
\`\`\`typescript
const add = (a: number, b: number): number => a + b;
\`\`\`

## Chapter 3: Classes and Interfaces

Object-oriented programming with TypeScript.

### 3.1 Interfaces

Interfaces define contracts for objects:
\`\`\`typescript
interface User {
   name: string;
   age: number;
}
\`\`\`

### 3.2 Classes

Classes implement interfaces and provide encapsulation:
\`\`\`typescript
class Person implements User {
   constructor(public name: string, public age: number) {}
}
\`\`\`

## Chapter 4: Generics

Generics enable reusable, type-safe code.

### 4.1 Generic Functions

\`\`\`typescript
function identity<T>(value: T): T {
   return value;
}
\`\`\`

### 4.2 Generic Constraints

Constraints limit what types can be used:
\`\`\`typescript
function getLength<T extends { length: number }>(item: T): number {
   return item.length;
}
\`\`\`

## Chapter 5: Advanced Types

TypeScript offers powerful type manipulation.

### 5.1 Union Types

Combine multiple types:
\`\`\`typescript
type StringOrNumber = string | number;
\`\`\`

### 5.2 Mapped Types

Transform existing types:
\`\`\`typescript
type Readonly<T> = { readonly [P in keyof T]: T[P] };
\`\`\`
`

   console.log("\n📄 Original Document Length:", document.length, "characters")
   console.log("\n" + "-".repeat(60))

   // Initialize reranker
   console.log("\n🔧 Initializing Jina Reranker...")
   const reranker = getJinaReranker()

   // Test different queries
   const queries = [
      "How do I define function types in TypeScript?",
      "What are generics and how to use constraints?",
      "How to create interfaces for objects?",
   ]

   for (const query of queries) {
      console.log("\n" + "=".repeat(60))
      console.log("🔍 Query:", query)
      console.log("=".repeat(60))

      // Filter with different thresholds
      const filtered = await filterText(query, document, "md", reranker, {
         relativeThreshold: 0.4,
         minScore: 0.1,
      })

      console.log("\n📋 Filtered Result:")
      console.log("-".repeat(40))
      console.log(filtered)
      console.log("-".repeat(40))
      console.log(`📊 Reduction: ${document.length} → ${filtered.length} chars (${((1 - filtered.length / document.length) * 100).toFixed(1)}% pruned)`)
   }

   // Demo with budget constraint
   console.log("\n" + "=".repeat(60))
   console.log("💰 Budget-Constrained Filtering (max 500 chars)")
   console.log("=".repeat(60))

   const budgetQuery = "TypeScript type system"
   const budgetFiltered = await filterText(budgetQuery, document, "md", reranker, {
      maxCharacters: 500,
      relativeThreshold: 0.1,
      minScore: 0.0,
   })

   console.log("🔍 Query:", budgetQuery)
   console.log("\n📋 Filtered Result:")
   console.log("-".repeat(40))
   console.log(budgetFiltered || "(no results - try adjusting thresholds)")
   console.log("-".repeat(40))
   console.log(`📊 Result: ${budgetFiltered.length} chars (budget: 500)`)

   await reranker.dispose()
   console.log("\n✓ Filter demo complete")
}

async function negativeFilterDemo() {
   console.log("=".repeat(60))
   console.log("Negative Filter Demo: Removing Noise by Pattern")
   console.log("=".repeat(60))

   // A document with useful content mixed with noise (logs, test output)
   const noisyDocument = `# Bug Report: Authentication Service Failing

## Summary

Users are experiencing login failures when attempting to authenticate via OAuth2.
The issue appears to be related to token refresh logic in the AuthService class.

## Environment

- Node.js v20.11.0
- Production server: auth-prod-west-01
- OAuth provider: Azure AD

## Reproduction Steps

1. User initiates login flow
2. OAuth redirect succeeds
3. Token exchange fails intermittently

## Debug Logs

\`\`\`
[2026-01-10T14:23:45.123Z] DEBUG auth-service Starting OAuth2 flow for user session abc123
[2026-01-10T14:23:45.156Z] TRACE http-client Request: GET https://login.microsoftonline.com/authorize
[2026-01-10T14:23:45.234Z] TRACE http-client Response headers: {"x-ms-request-id":"f8a3b2c1","content-type":"text/html"}
[2026-01-10T14:23:46.001Z] DEBUG auth-service Redirect received, extracting auth code
[2026-01-10T14:23:46.045Z] TRACE http-client Request: POST https://login.microsoftonline.com/token
[2026-01-10T14:23:46.089Z] TRACE http-client Request body: {"grant_type":"authorization_code","code":"***REDACTED***"}
[2026-01-10T14:23:46.234Z] TRACE http-client Response: 200 OK (145ms)
[2026-01-10T14:23:46.235Z] DEBUG token-store Storing access token, expires_in: 3600
[2026-01-10T14:23:46.240Z] TRACE token-store Token hash: sha256:a1b2c3d4e5f6...
[2026-01-10T14:24:47.001Z] DEBUG auth-service Token refresh triggered
[2026-01-10T14:24:47.015Z] TRACE http-client Request: POST https://login.microsoftonline.com/token
[2026-01-10T14:24:47.016Z] TRACE http-client Request body: {"grant_type":"refresh_token","refresh_token":"***REDACTED***"}
[2026-01-10T14:24:47.567Z] ERROR auth-service Token refresh failed: invalid_grant
[2026-01-10T14:24:47.568Z] TRACE http-client Response: 400 Bad Request
[2026-01-10T14:24:47.569Z] TRACE http-client Response body: {"error":"invalid_grant","error_description":"AADSTS70000: Refresh token is malformed or expired"}
\`\`\`

## Test Results

\`\`\`
  AuthService
    ✓ should initialize with valid config (12ms)
    ✓ should handle OAuth redirect (45ms)
    ✓ should store tokens correctly (8ms)
    ✗ should refresh expired tokens (234ms)
      Error: Expected token refresh to succeed
      at Object.<anonymous> (auth.test.ts:156:12)
      at processTicksAndRejections (node:internal/process/task_queues:95:5)
    ✓ should logout and clear session (15ms)
    ✓ should handle network errors gracefully (89ms)

  TokenStore
    ✓ should encrypt tokens at rest (23ms)
    ✓ should handle concurrent access (156ms)
    ✓ should expire stale tokens (45ms)

  9 passing (627ms)
  1 failing
\`\`\`

## Root Cause Analysis

The issue is in the token refresh logic. When the refresh token expires or becomes
invalid, the AuthService doesn't properly fall back to re-authentication. The
AADSTS70000 error indicates the refresh token was rejected by Azure AD.

## Proposed Fix

Modify the \`refreshToken\` method in AuthService to catch invalid_grant errors
and trigger a full re-authentication flow instead of failing silently:

\`\`\`typescript
async refreshToken(): Promise<boolean> {
   try {
      const response = await this.oauth.refresh(this.refreshToken);
      this.tokenStore.save(response);
      return true;
   } catch (error) {
      if (error.code === 'invalid_grant') {
         // Token is invalid/expired, need full re-auth
         await this.logout();
         return this.initiateOAuthFlow();
      }
      throw error;
   }
}
\`\`\`

## Impact Assessment

- Affected users: ~5% of daily active users
- Business impact: Medium (users can retry login manually)
- Priority: P2

## Next Steps

1. Implement the proposed fix
2. Add integration tests for token expiry scenarios
3. Deploy to staging for validation
4. Roll out to production with feature flag
`

   console.log("\n📄 Noisy Document Length:", noisyDocument.length, "characters")
   console.log("\n" + "-".repeat(60))

   // Initialize reranker
   console.log("\n🔧 Initializing Jina Reranker...")
   const reranker = getJinaReranker()

   // Demo 1: Query for noise patterns and REMOVE them (invert=true)
   console.log("\n" + "=".repeat(60))
   console.log("🔄 INVERTED FILTER: Query for noise, remove matches")
   console.log("=".repeat(60))

   const noiseQueries = [
      "debug logs trace timestamps http requests responses",
      "test results passing failing assertions stack trace",
   ]

   for (const noiseQuery of noiseQueries) {
      console.log("\n" + "-".repeat(40))
      console.log("🗑️  Noise Query:", noiseQuery)
      console.log("-".repeat(40))

      const filtered = await filterText(noiseQuery, noisyDocument, "md", reranker, {
         relativeThreshold: 0.7,  // High threshold = only remove very strong matches
         minScore: 0.3,           // Only remove nodes scoring > 0.3
         invert: true,  // <-- INVERT: Remove what matches!
      })

      console.log("\n📋 Result (noise removed):")
      console.log("-".repeat(40))
      console.log(filtered.substring(0, 800) + (filtered.length > 800 ? "\n... [truncated]" : ""))
      console.log("-".repeat(40))
      
      const reduction = ((1 - filtered.length / noisyDocument.length) * 100).toFixed(1)
      console.log(`📊 Reduction: ${noisyDocument.length} → ${filtered.length} chars (${reduction}% noise removed)`)
   }

   // Demo 2: Compare normal vs inverted filtering
   console.log("\n" + "=".repeat(60))
   console.log("⚖️  COMPARISON: Normal vs Inverted Filter")
   console.log("=".repeat(60))

   const compareQuery = "debug log trace http request response timestamp"

   console.log("🔍 Query:", compareQuery)

   // Normal filter - keeps what matches
   const normalFiltered = await filterText(compareQuery, noisyDocument, "md", reranker, {
      relativeThreshold: 0.4,
      minScore: 0.1,
      invert: false,
   })

   // Inverted filter - removes what matches (use higher thresholds to only remove strong matches)
   const invertedFiltered = await filterText(compareQuery, noisyDocument, "md", reranker, {
      relativeThreshold: 0.6,
      minScore: 0.25,
      invert: true,
   })

   console.log("\n📋 NORMAL (keeps matches):", normalFiltered.length, "chars")
   console.log("-".repeat(40))
   console.log(normalFiltered.substring(0, 500) + (normalFiltered.length > 500 ? "\n..." : ""))

   console.log("\n📋 INVERTED (removes matches):", invertedFiltered.length, "chars")
   console.log("-".repeat(40))
   console.log(invertedFiltered.substring(0, 500) + (invertedFiltered.length > 500 ? "\n..." : ""))

   console.log("\n📊 Summary:")
   console.log(`   Original:  ${noisyDocument.length} chars`)
   console.log(`   Normal:    ${normalFiltered.length} chars (kept ${(normalFiltered.length / noisyDocument.length * 100).toFixed(1)}%)`)
   console.log(`   Inverted:  ${invertedFiltered.length} chars (kept ${(invertedFiltered.length / noisyDocument.length * 100).toFixed(1)}%)`)

   await reranker.dispose()
   console.log("\n✓ Negative filter demo complete")
}

async function bgeEmbeddingDemo() {
   console.log("Initializing BGE-small-en-v1.5 embedder...")
   const embedder = getBgeSmallEmbedder()
   
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
         const similarity = getVectorSimilarity(
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
            similarity: getVectorSimilarity(
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
      case "bge-embedding":
         await bgeEmbeddingDemo()
         break
      case "reranker":
         await rerankerDemo()
         break
      case "filter":
         await filterDemo()
         break
      case "negative-filter":
         await negativeFilterDemo()
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
            choices: ['synonyms', 'chess', 'embedding', 'bge-embedding', 'reranker', 'filter', 'negative-filter']
         })
      },
      async (argv) => {
         await demoCommand(argv.name as string)
      }
   )
   .demandCommand(1, 'You must specify a command (demo <name>)')
   .help()
   .argv