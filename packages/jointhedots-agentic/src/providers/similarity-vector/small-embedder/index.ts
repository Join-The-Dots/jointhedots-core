import * as ort from 'onnxruntime-node'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import {
   DenseTextEmbedder,
   DenseVec,
   TextPerspective,
   VectorMetricType,
} from '../../../framework/interfaces/embedder.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Basic WordPiece tokenizer for BERT-based models
class BertTokenizer {
   private vocab: Map<string, number>
   private unkTokenId: number
   private clsTokenId: number
   private sepTokenId: number
   private padTokenId: number

   constructor(vocab: Map<string, number>) {
      this.vocab = vocab
      this.unkTokenId = vocab.get('[UNK]') ?? 100
      this.clsTokenId = vocab.get('[CLS]') ?? 101
      this.sepTokenId = vocab.get('[SEP]') ?? 102
      this.padTokenId = vocab.get('[PAD]') ?? 0
   }

   static async load(vocabPath: string): Promise<BertTokenizer> {
      const vocabContent = readFileSync(vocabPath, 'utf-8')
      const vocab = new Map<string, number>()
      vocabContent.split('\n').forEach((line, index) => {
         const token = line.trim()
         if (token) {
            vocab.set(token, index)
         }
      })
      return new BertTokenizer(vocab)
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

function meanPooling(lastHiddenState: ort.Tensor, attentionMask: BigInt64Array): Float32Array {
   const [batchSize, seqLength, hiddenSize] = lastHiddenState.dims
   const data = lastHiddenState.data as Float32Array

   const output = new Float32Array(hiddenSize)
   let totalWeight = 0

   for (let i = 0; i < seqLength; i++) {
      const mask = Number(attentionMask[i])
      if (mask > 0) {
         totalWeight += mask
         for (let j = 0; j < hiddenSize; j++) {
            output[j] += data[i * hiddenSize + j] * mask
         }
      }
   }

   // Normalize
   if (totalWeight > 0) {
      for (let j = 0; j < hiddenSize; j++) {
         output[j] /= totalWeight
      }
   }

   return output
}

function normalize(vec: Float32Array): Float32Array {
   let norm = 0
   for (let i = 0; i < vec.length; i++) {
      norm += vec[i] * vec[i]
   }
   norm = Math.sqrt(norm)

   if (norm > 0) {
      for (let i = 0; i < vec.length; i++) {
         vec[i] /= norm
      }
   }

   return vec
}

class MiniLMEmbedder implements DenseTextEmbedder {
   readonly dimension = 384 // all-MiniLM-L6-v2 produces 384-dim embeddings
   readonly metric = VectorMetricType.Cosine

   private session: ort.InferenceSession | null = null
   private tokenizer: BertTokenizer | null = null
   private readonly modelPath: string
   private readonly vocabPath: string
   private readonly maxLength = 256
   private initPromise: Promise<void> | null = null

   constructor(modelPath?: string, vocabPath?: string) {
      // Navigate from src/providers/similarity-vector/small-embedder to package root
      const packageRoot = join(__dirname, '..', '..', '..', '..')
      this.modelPath = modelPath ?? join(packageRoot, 'models', 'all-MiniLM-L6-v2', 'model_O4.onnx')
      this.vocabPath = vocabPath ?? join(packageRoot, 'models', 'all-MiniLM-L6-v2', 'vocab.txt')
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
         this.tokenizer = await BertTokenizer.load(this.vocabPath)
      })()

      await this.initPromise
   }

   async embed(text: string, _perspective?: TextPerspective): Promise<DenseVec> {
      await this.initialize()

      if (!this.session || !this.tokenizer) {
         throw new Error('Model not initialized')
      }

      const { inputIds, attentionMask, tokenTypeIds } = this.tokenizer.encode(text, this.maxLength)

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

      // Apply mean pooling over the sequence dimension
      const pooled = meanPooling(lastHiddenState, attentionMask)

      // L2 normalize the output
      return normalize(pooled)
   }

   async dispose(): Promise<void> {
      if (this.session) {
         await this.session.release()
         this.session = null
      }
   }
}

// Singleton instance for convenience
let defaultEmbedder: MiniLMEmbedder | null = null

export function getNanoEmbedder(): MiniLMEmbedder {
   if (!defaultEmbedder) {
      defaultEmbedder = new MiniLMEmbedder()
   }
   return defaultEmbedder
}
