
export enum TextPerspective {
   Data,
   Query,
}

export enum VectorMetricType {
   Cosine,
   Euclidean,
   Manhattan,
   DotProduct,
}

export type DenseVec = Float32Array
export type SparseVec = [Uint32Array, Float32Array]

export interface DenseTextEmbedder {
   readonly dimension: number
   readonly metric: VectorMetricType
   embed(text: string, perspective?: TextPerspective): Promise<DenseVec>
}

export interface SparseTextEmbedder {
   readonly vocabularySize: number
   readonly metric: VectorMetricType
   embed(text: string, perspective?: TextPerspective): Promise<SparseVec>
}

export function getDenseEmbeddingDistance(vec1: DenseVec, vec2: DenseVec, metric: VectorMetricType): number {
   switch (metric) {
      case VectorMetricType.Cosine: {
         let dot = 0, mag1 = 0, mag2 = 0
         for (let i = 0; i < vec1.length; i++) {
            dot += vec1[i] * vec2[i]
            mag1 += vec1[i] * vec1[i]
            mag2 += vec2[i] * vec2[i]
         }
         return 1 - (dot / (Math.sqrt(mag1) * Math.sqrt(mag2)))
      }
      case VectorMetricType.Euclidean: {
         let sum = 0
         for (let i = 0; i < vec1.length; i++) {
            const diff = vec1[i] - vec2[i]
            sum += diff * diff
         }
         return Math.sqrt(sum)
      }
      case VectorMetricType.Manhattan: {
         let sum = 0
         for (let i = 0; i < vec1.length; i++) {
            sum += Math.abs(vec1[i] - vec2[i])
         }
         return sum
      }
      case VectorMetricType.DotProduct: {
         let sum = 0
         for (let i = 0; i < vec1.length; i++) {
            sum += vec1[i] * vec2[i]
         }
         return -sum // Negative because higher dot product = closer
      }
      default: {
         let dot = 0, mag1 = 0, mag2 = 0
         for (let i = 0; i < vec1.length; i++) {
            dot += vec1[i] * vec2[i]
            mag1 += vec1[i] * vec1[i]
            mag2 += vec2[i] * vec2[i]
         }
         return 1 - (dot / (Math.sqrt(mag1) * Math.sqrt(mag2)))
      }
   }
}

export function getDenseEmbeddingSimilarity(vec1: DenseVec, vec2: DenseVec, metric: VectorMetricType): number {
   switch (metric) {
      case VectorMetricType.Cosine: {
         let dot = 0, mag1 = 0, mag2 = 0
         for (let i = 0; i < vec1.length; i++) {
            dot += vec1[i] * vec2[i]
            mag1 += vec1[i] * vec1[i]
            mag2 += vec2[i] * vec2[i]
         }
         return dot / (Math.sqrt(mag1) * Math.sqrt(mag2))
      }
      case VectorMetricType.Euclidean: {
         let sum = 0
         for (let i = 0; i < vec1.length; i++) {
            const diff = vec1[i] - vec2[i]
            sum += diff * diff
         }
         return 1 / (1 + Math.sqrt(sum))
      }
      case VectorMetricType.Manhattan: {
         let sum = 0
         for (let i = 0; i < vec1.length; i++) {
            sum += Math.abs(vec1[i] - vec2[i])
         }
         return 1 / (1 + sum)
      }
      case VectorMetricType.DotProduct: {
         let sum = 0
         for (let i = 0; i < vec1.length; i++) {
            sum += vec1[i] * vec2[i]
         }
         return sum
      }
      default: {
         let dot = 0, mag1 = 0, mag2 = 0
         for (let i = 0; i < vec1.length; i++) {
            dot += vec1[i] * vec2[i]
            mag1 += vec1[i] * vec1[i]
            mag2 += vec2[i] * vec2[i]
         }
         return dot / (Math.sqrt(mag1) * Math.sqrt(mag2))
      }
   }
}

export function getSparseEmbeddingDistance(vec1: SparseVec, vec2: SparseVec, metric: VectorMetricType): number {
   const [indices1, values1] = vec1
   const [indices2, values2] = vec2
   
   switch (metric) {
      case VectorMetricType.Cosine: {
         let dot = 0, mag1 = 0, mag2 = 0
         let i = 0, j = 0
         
         // Calculate dot product for overlapping indices
         while (i < indices1.length && j < indices2.length) {
            if (indices1[i] === indices2[j]) {
               dot += values1[i] * values2[j]
               i++
               j++
            } else if (indices1[i] < indices2[j]) {
               i++
            } else {
               j++
            }
         }
         
         // Calculate magnitudes
         for (let k = 0; k < values1.length; k++) {
            mag1 += values1[k] * values1[k]
         }
         for (let k = 0; k < values2.length; k++) {
            mag2 += values2[k] * values2[k]
         }
         
         return 1 - (dot / (Math.sqrt(mag1) * Math.sqrt(mag2)))
      }
      case VectorMetricType.Euclidean: {
         let sum = 0
         let i = 0, j = 0
         
         while (i < indices1.length || j < indices2.length) {
            if (i >= indices1.length) {
               sum += values2[j] * values2[j]
               j++
            } else if (j >= indices2.length) {
               sum += values1[i] * values1[i]
               i++
            } else if (indices1[i] === indices2[j]) {
               const diff = values1[i] - values2[j]
               sum += diff * diff
               i++
               j++
            } else if (indices1[i] < indices2[j]) {
               sum += values1[i] * values1[i]
               i++
            } else {
               sum += values2[j] * values2[j]
               j++
            }
         }
         
         return Math.sqrt(sum)
      }
      case VectorMetricType.Manhattan: {
         let sum = 0
         let i = 0, j = 0
         
         while (i < indices1.length || j < indices2.length) {
            if (i >= indices1.length) {
               sum += Math.abs(values2[j])
               j++
            } else if (j >= indices2.length) {
               sum += Math.abs(values1[i])
               i++
            } else if (indices1[i] === indices2[j]) {
               sum += Math.abs(values1[i] - values2[j])
               i++
               j++
            } else if (indices1[i] < indices2[j]) {
               sum += Math.abs(values1[i])
               i++
            } else {
               sum += Math.abs(values2[j])
               j++
            }
         }
         
         return sum
      }
      case VectorMetricType.DotProduct: {
         let dot = 0
         let i = 0, j = 0
         
         while (i < indices1.length && j < indices2.length) {
            if (indices1[i] === indices2[j]) {
               dot += values1[i] * values2[j]
               i++
               j++
            } else if (indices1[i] < indices2[j]) {
               i++
            } else {
               j++
            }
         }
         
         return -dot // Negative because higher dot product = closer
      }
      default: {
         let dot = 0, mag1 = 0, mag2 = 0
         let i = 0, j = 0
         
         while (i < indices1.length && j < indices2.length) {
            if (indices1[i] === indices2[j]) {
               dot += values1[i] * values2[j]
               i++
               j++
            } else if (indices1[i] < indices2[j]) {
               i++
            } else {
               j++
            }
         }
         
         for (let k = 0; k < values1.length; k++) {
            mag1 += values1[k] * values1[k]
         }
         for (let k = 0; k < values2.length; k++) {
            mag2 += values2[k] * values2[k]
         }
         
         return 1 - (dot / (Math.sqrt(mag1) * Math.sqrt(mag2)))
      }
   }
}

export function getSparseEmbeddingSimilarity(vec1: SparseVec, vec2: SparseVec, metric: VectorMetricType): number {
   const [indices1, values1] = vec1
   const [indices2, values2] = vec2
   
   switch (metric) {
      case VectorMetricType.Cosine: {
         let dot = 0, mag1 = 0, mag2 = 0
         let i = 0, j = 0
         
         while (i < indices1.length && j < indices2.length) {
            if (indices1[i] === indices2[j]) {
               dot += values1[i] * values2[j]
               i++
               j++
            } else if (indices1[i] < indices2[j]) {
               i++
            } else {
               j++
            }
         }
         
         for (let k = 0; k < values1.length; k++) {
            mag1 += values1[k] * values1[k]
         }
         for (let k = 0; k < values2.length; k++) {
            mag2 += values2[k] * values2[k]
         }
         
         return dot / (Math.sqrt(mag1) * Math.sqrt(mag2))
      }
      case VectorMetricType.Euclidean: {
         let sum = 0
         let i = 0, j = 0
         
         while (i < indices1.length || j < indices2.length) {
            if (i >= indices1.length) {
               sum += values2[j] * values2[j]
               j++
            } else if (j >= indices2.length) {
               sum += values1[i] * values1[i]
               i++
            } else if (indices1[i] === indices2[j]) {
               const diff = values1[i] - values2[j]
               sum += diff * diff
               i++
               j++
            } else if (indices1[i] < indices2[j]) {
               sum += values1[i] * values1[i]
               i++
            } else {
               sum += values2[j] * values2[j]
               j++
            }
         }
         
         return 1 / (1 + Math.sqrt(sum))
      }
      case VectorMetricType.Manhattan: {
         let sum = 0
         let i = 0, j = 0
         
         while (i < indices1.length || j < indices2.length) {
            if (i >= indices1.length) {
               sum += Math.abs(values2[j])
               j++
            } else if (j >= indices2.length) {
               sum += Math.abs(values1[i])
               i++
            } else if (indices1[i] === indices2[j]) {
               sum += Math.abs(values1[i] - values2[j])
               i++
               j++
            } else if (indices1[i] < indices2[j]) {
               sum += Math.abs(values1[i])
               i++
            } else {
               sum += Math.abs(values2[j])
               j++
            }
         }
         
         return 1 / (1 + sum)
      }
      case VectorMetricType.DotProduct: {
         let dot = 0
         let i = 0, j = 0
         
         while (i < indices1.length && j < indices2.length) {
            if (indices1[i] === indices2[j]) {
               dot += values1[i] * values2[j]
               i++
               j++
            } else if (indices1[i] < indices2[j]) {
               i++
            } else {
               j++
            }
         }
         
         return dot
      }
      default: {
         let dot = 0, mag1 = 0, mag2 = 0
         let i = 0, j = 0
         
         while (i < indices1.length && j < indices2.length) {
            if (indices1[i] === indices2[j]) {
               dot += values1[i] * values2[j]
               i++
               j++
            } else if (indices1[i] < indices2[j]) {
               i++
            } else {
               j++
            }
         }
         
         for (let k = 0; k < values1.length; k++) {
            mag1 += values1[k] * values1[k]
         }
         for (let k = 0; k < values2.length; k++) {
            mag2 += values2[k] * values2[k]
         }
         
         return dot / (Math.sqrt(mag1) * Math.sqrt(mag2))
      }
   }
}
