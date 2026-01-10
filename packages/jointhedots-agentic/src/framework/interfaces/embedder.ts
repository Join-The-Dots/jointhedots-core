import { VectorF32, SparseVectorF32, VectorMetricType } from "../../common/vector_f32"

export enum TextPerspective {
   Data,
   Query,
}

export interface IDenseTextEmbedder {
   readonly dimension: number
   readonly metric: VectorMetricType
   embed(text: string, perspective?: TextPerspective): Promise<VectorF32>
}

export interface ISparseTextEmbedder {
   readonly vocabularySize: number
   readonly metric: VectorMetricType
   embed(text: string, perspective?: TextPerspective): Promise<SparseVectorF32>
}
