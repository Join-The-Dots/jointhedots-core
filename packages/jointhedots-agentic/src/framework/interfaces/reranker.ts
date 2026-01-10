
export type RerankResult = {
   index: number      // Original index from 'texts'
   score: number      // Revelance score
}

export interface ITextReranker {
   rerank(query: string, texts: string[]): Promise<RerankResult[]>
}
