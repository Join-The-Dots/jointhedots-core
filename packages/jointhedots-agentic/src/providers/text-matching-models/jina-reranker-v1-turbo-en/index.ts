import * as ort from 'onnxruntime-node'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import {
   ITextReranker,
   RerankResult,
} from '../../../framework/interfaces/reranker.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface TokenizerJson {
   model: {
      type: string
      vocab: Record<string, number>
      merges: string[]
   }
   added_tokens: Array<{
      id: number
      content: string
      special: boolean
   }>
}

interface TokenizerConfig {
   cls_token: string
   sep_token: string
   pad_token: string
   unk_token: string
   model_max_length: number
}

// BPE tokenizer for RoBERTa-based models (Jina reranker)
class BPETokenizer {
   private vocab: Map<string, number>
   private merges: Map<string, number>
   private clsTokenId: number
   private sepTokenId: number
   private padTokenId: number
   private unkTokenId: number
   private maxLength: number

   constructor(
      vocab: Map<string, number>,
      merges: Map<string, number>,
      config: TokenizerConfig
   ) {
      this.vocab = vocab
      this.merges = merges
      this.clsTokenId = vocab.get(config.cls_token) ?? 0
      this.sepTokenId = vocab.get(config.sep_token) ?? 2
      this.padTokenId = vocab.get(config.pad_token) ?? 1
      this.unkTokenId = vocab.get(config.unk_token) ?? 3
      this.maxLength = config.model_max_length
   }

   static async load(tokenizerPath: string, configPath: string): Promise<BPETokenizer> {
      const tokenizerJson: TokenizerJson = JSON.parse(readFileSync(tokenizerPath, 'utf-8'))
      const config: TokenizerConfig = JSON.parse(readFileSync(configPath, 'utf-8'))

      const vocab = new Map<string, number>()
      for (const [token, id] of Object.entries(tokenizerJson.model.vocab)) {
         vocab.set(token, id)
      }

      // Add special tokens
      for (const added of tokenizerJson.added_tokens) {
         vocab.set(added.content, added.id)
      }

      // Build merges map with priority
      const merges = new Map<string, number>()
      if (tokenizerJson.model.merges) {
         tokenizerJson.model.merges.forEach((merge, idx) => {
            merges.set(merge, idx)
         })
      }

      return new BPETokenizer(vocab, merges, config)
   }

   private normalizeText(text: string): string {
      // NFC normalize and lowercase (as per tokenizer config)
      return text.normalize('NFC').toLowerCase().trim()
   }

   private tokenizeWord(word: string): number[] {
      // Simple character-level tokenization with BPE merging
      if (!word) return []

      // Start with individual characters as tokens
      let tokens: string[] = word.split('')

      // Apply BPE merges iteratively
      while (tokens.length > 1) {
         let bestMerge: [number, string] | null = null
         let bestPriority = Infinity

         // Find the best merge pair
         for (let i = 0; i < tokens.length - 1; i++) {
            const pair = `${tokens[i]} ${tokens[i + 1]}`
            const priority = this.merges.get(pair)
            if (priority !== undefined && priority < bestPriority) {
               bestPriority = priority
               bestMerge = [i, tokens[i] + tokens[i + 1]]
            }
         }

         if (!bestMerge) break

         // Apply the merge
         const [idx, merged] = bestMerge
         tokens = [...tokens.slice(0, idx), merged, ...tokens.slice(idx + 2)]
      }

      // Convert tokens to IDs
      return tokens.map(t => this.vocab.get(t) ?? this.unkTokenId)
   }

   private tokenize(text: string): number[] {
      const normalized = this.normalizeText(text)
      const words = normalized.split(/\s+/).filter(w => w.length > 0)

      const tokenIds: number[] = []
      for (const word of words) {
         tokenIds.push(...this.tokenizeWord(word))
      }

      return tokenIds
   }

   // Encode query-document pair for reranking
   // Format: <s> query </s></s> document </s>
   encodeQueryDocument(query: string, document: string, maxLength: number = 512): {
      inputIds: BigInt64Array
      attentionMask: BigInt64Array
   } {
      const queryTokens = this.tokenize(query)
      const documentTokens = this.tokenize(document)

      // Build: <s> query </s></s> document </s>
      // That's 4 special tokens: 1 cls + 2 sep (between) + 1 sep (end)
      const specialTokenCount = 4
      const availableLength = maxLength - specialTokenCount

      // Distribute available space between query and document
      let queryLen = queryTokens.length
      let docLen = documentTokens.length

      if (queryLen + docLen > availableLength) {
         // Prioritize keeping the query, truncate document
         const queryMaxLen = Math.min(queryLen, Math.floor(availableLength * 0.3))
         const docMaxLen = availableLength - queryMaxLen
         queryLen = Math.min(queryLen, queryMaxLen)
         docLen = Math.min(docLen, docMaxLen)
      }

      const tokenIds: number[] = [
         this.clsTokenId,
         ...queryTokens.slice(0, queryLen),
         this.sepTokenId,
         this.sepTokenId,
         ...documentTokens.slice(0, docLen),
         this.sepTokenId,
      ]

      const seqLength = tokenIds.length
      const inputIds = new BigInt64Array(maxLength)
      const attentionMask = new BigInt64Array(maxLength)

      for (let i = 0; i < maxLength; i++) {
         if (i < seqLength) {
            inputIds[i] = BigInt(tokenIds[i])
            attentionMask[i] = 1n
         } else {
            inputIds[i] = BigInt(this.padTokenId)
            attentionMask[i] = 0n
         }
      }

      return { inputIds, attentionMask }
   }
}

// Sigmoid function to convert logits to scores
function sigmoid(x: number): number {
   return 1 / (1 + Math.exp(-x))
}

export class JinaReranker implements ITextReranker {
   private session: ort.InferenceSession | null = null
   private tokenizer: BPETokenizer | null = null
   private readonly modelPath: string
   private readonly tokenizerPath: string
   private readonly configPath: string
   private readonly maxLength = 512
   private initPromise: Promise<void> | null = null

   constructor(modelPath?: string, tokenizerPath?: string, configPath?: string) {
      const packageRoot = join(__dirname, '..', '..', '..', '..')
      this.modelPath = modelPath ?? join(packageRoot, 'models', 'jina-reranker-v1-turbo-en', 'model_int8.onnx')
      this.tokenizerPath = tokenizerPath ?? join(packageRoot, 'models', 'jina-reranker-v1-turbo-en', 'tokenizer.json')
      this.configPath = configPath ?? join(packageRoot, 'models', 'jina-reranker-v1-turbo-en', 'tokenizer_config.json')
   }

   private async initialize(): Promise<void> {
      if (this.session && this.tokenizer) return

      if (this.initPromise) {
         await this.initPromise
         return
      }

      this.initPromise = (async () => {
         this.session = await ort.InferenceSession.create(this.modelPath, {
            executionProviders: ['cpu'],
         })
         this.tokenizer = await BPETokenizer.load(this.tokenizerPath, this.configPath)
      })()

      await this.initPromise
   }

   async rerank(query: string, texts: string[]): Promise<RerankResult[]> {
      await this.initialize()

      if (!this.session || !this.tokenizer) {
         throw new Error('Model not initialized')
      }

      const results: RerankResult[] = []

      // Process each query-text pair
      for (let i = 0; i < texts.length; i++) {
         const { inputIds, attentionMask } = this.tokenizer.encodeQueryDocument(
            query,
            texts[i],
            this.maxLength
         )

         const inputIdsTensor = new ort.Tensor('int64', inputIds, [1, this.maxLength])
         const attentionMaskTensor = new ort.Tensor('int64', attentionMask, [1, this.maxLength])

         const feeds: Record<string, ort.Tensor> = {
            input_ids: inputIdsTensor,
            attention_mask: attentionMaskTensor,
         }

         const outputs = await this.session.run(feeds)

         // Get the relevance score from model output
         const outputName = this.session.outputNames[0]
         const output = outputs[outputName]
         const data = output.data as Float32Array

         // The model typically outputs logits, apply sigmoid for probability
         const score = sigmoid(data[0])

         results.push({
            index: i,
            score: score,
         })
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score)

      return results
   }

   async dispose(): Promise<void> {
      if (this.session) {
         await this.session.release()
         this.session = null
      }
   }
}

// Singleton instance for convenience
let defaultReranker: JinaReranker | null = null

export function getJinaReranker(): JinaReranker {
   if (!defaultReranker) {
      defaultReranker = new JinaReranker()
   }
   return defaultReranker
}
