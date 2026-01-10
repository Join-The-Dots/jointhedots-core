import * as ort from 'onnxruntime-node'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import {
   IDenseTextEmbedder,
   TextPerspective,
} from '../../../framework/interfaces/embedder.js'
import { normalizeVector, VectorF32, VectorMetricType } from '../../../common/vector_f32.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface SpecialTokensMap {
   unk_token: string | { content: string }
   sep_token: string | { content: string }
   pad_token: string | { content: string }
   cls_token: string | { content: string }
   mask_token: string | { content: string }
}

function getTokenContent(token: string | { content: string }): string {
   return typeof token === 'string' ? token : token.content
}

// Basic WordPiece tokenizer for BERT-based models
class BertTokenizer {
   private vocab: Map<string, number>
   private unkTokenId: number
   private clsTokenId: number
   private sepTokenId: number
   private padTokenId: number

   constructor(vocab: Map<string, number>, specialTokens: SpecialTokensMap) {
      this.vocab = vocab
      this.unkTokenId = vocab.get(getTokenContent(specialTokens.unk_token)) ?? 100
      this.clsTokenId = vocab.get(getTokenContent(specialTokens.cls_token)) ?? 101
      this.sepTokenId = vocab.get(getTokenContent(specialTokens.sep_token)) ?? 102
      this.padTokenId = vocab.get(getTokenContent(specialTokens.pad_token)) ?? 0
   }

   static async load(vocabPath: string, specialTokensPath: string): Promise<BertTokenizer> {
      const vocabContent = readFileSync(vocabPath, 'utf-8')
      const vocab = new Map<string, number>()
      vocabContent.split('\n').forEach((line, index) => {
         const token = line.trim()
         if (token) {
            vocab.set(token, index)
         }
      })
      const specialTokens: SpecialTokensMap = JSON.parse(readFileSync(specialTokensPath, 'utf-8'))
      return new BertTokenizer(vocab, specialTokens)
   }

   private normalizeText(text: string): string {
      // Basic normalization: lowercase and handle whitespace
      return text.toLowerCase().trim()
   }

   private tokenizeWord(word: string): number[] {
      const tokens: number[] = []
      let start = 0

      while (start < word.length) {
         let end = word.length
         let foundToken = false

         while (start < end) {
            let substr = word.slice(start, end)
            if (start > 0) {
               substr = '##' + substr
            }

            if (this.vocab.has(substr)) {
               tokens.push(this.vocab.get(substr)!)
               foundToken = true
               break
            }
            end--
         }

         if (!foundToken) {
            tokens.push(this.unkTokenId)
            start++
         } else {
            start = end
         }
      }

      return tokens
   }

   encode(text: string, maxLength: number = 512): {
      inputIds: BigInt64Array
      attentionMask: BigInt64Array
      tokenTypeIds: BigInt64Array
   } {
      const normalized = this.normalizeText(text)

      // Split on whitespace and punctuation
      const words = normalized.split(/(\s+|[.,!?;:'"()\[\]{}])/).filter(w => w.trim())

      const tokenIds: number[] = [this.clsTokenId]

      for (const word of words) {
         if (!word.trim()) continue
         const wordTokens = this.tokenizeWord(word)
         tokenIds.push(...wordTokens)

         // Leave room for [SEP]
         if (tokenIds.length >= maxLength - 1) {
            break
         }
      }

      tokenIds.push(this.sepTokenId)

      // Pad or truncate to maxLength
      const paddedLength = Math.min(tokenIds.length, maxLength)
      const inputIds = new BigInt64Array(maxLength)
      const attentionMask = new BigInt64Array(maxLength)
      const tokenTypeIds = new BigInt64Array(maxLength)

      for (let i = 0; i < maxLength; i++) {
         if (i < paddedLength) {
            inputIds[i] = BigInt(tokenIds[i])
            attentionMask[i] = 1n
            tokenTypeIds[i] = 0n
         } else {
            inputIds[i] = BigInt(this.padTokenId)
            attentionMask[i] = 0n
            tokenTypeIds[i] = 0n
         }
      }

      return { inputIds, attentionMask, tokenTypeIds }
   }
}

// BGE models use CLS token pooling - extract the first token's embedding
function clsPooling(lastHiddenState: ort.Tensor): Float32Array {
   const [_batchSize, _seqLength, hiddenSize] = lastHiddenState.dims
   const data = lastHiddenState.data as Float32Array

   // Return the embedding of the [CLS] token (first position)
   return data.slice(0, hiddenSize)
}

class BgeSmallEmbedder implements IDenseTextEmbedder {
   readonly dimension = 384 // bge-small-en-v1.5 produces 384-dim embeddings
   readonly metric = VectorMetricType.Cosine

   private session: ort.InferenceSession | null = null
   private tokenizer: BertTokenizer | null = null
   private readonly modelPath: string
   private readonly vocabPath: string
   private readonly specialTokensPath: string
   private readonly maxLength = 512
   private initPromise: Promise<void> | null = null

   constructor(modelPath?: string, vocabPath?: string, specialTokensPath?: string) {
      // Navigate from src/providers/text-matching-models/bge-small-en-v1.5 to package root
      const packageRoot = join(__dirname, '..', '..', '..', '..')
      this.modelPath = modelPath ?? join(packageRoot, 'models', 'bge-small-en-v1.5', 'model_optimized.onnx')
      this.vocabPath = vocabPath ?? join(packageRoot, 'models', 'bge-small-en-v1.5', 'vocab.txt')
      this.specialTokensPath = specialTokensPath ?? join(packageRoot, 'models', 'bge-small-en-v1.5', 'special_tokens_map.json')
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
         this.tokenizer = await BertTokenizer.load(this.vocabPath, this.specialTokensPath)
      })()

      await this.initPromise
   }

   async embed(text: string, perspective?: TextPerspective): Promise<VectorF32> {
      await this.initialize()

      if (!this.session || !this.tokenizer) {
         throw new Error('Model not initialized')
      }

      // BGE models recommend prepending "query: " for queries to improve retrieval
      const processedText = perspective === TextPerspective.Query ? `query: ${text}` : text

      const { inputIds, attentionMask, tokenTypeIds } = this.tokenizer.encode(processedText, this.maxLength)

      const inputIdsTensor = new ort.Tensor('int64', inputIds, [1, this.maxLength])
      const attentionMaskTensor = new ort.Tensor('int64', attentionMask, [1, this.maxLength])
      const tokenTypeIdsTensor = new ort.Tensor('int64', tokenTypeIds, [1, this.maxLength])

      const feeds: Record<string, ort.Tensor> = {
         input_ids: inputIdsTensor,
         attention_mask: attentionMaskTensor,
         token_type_ids: tokenTypeIdsTensor,
      }

      const results = await this.session.run(feeds)

      // The model output is typically 'last_hidden_state' or similar
      const outputName = this.session.outputNames[0]
      const lastHiddenState = results[outputName]

      // BGE uses CLS token pooling
      const pooled = clsPooling(lastHiddenState)

      // L2 normalize the output
      return normalizeVector(pooled)
   }

   async dispose(): Promise<void> {
      if (this.session) {
         await this.session.release()
         this.session = null
      }
   }
}

// Singleton instance for convenience
let defaultEmbedder: BgeSmallEmbedder | null = null

export function getBgeSmallEmbedder(): BgeSmallEmbedder {
   if (!defaultEmbedder) {
      defaultEmbedder = new BgeSmallEmbedder()
   }
   return defaultEmbedder
}

export { BgeSmallEmbedder }
