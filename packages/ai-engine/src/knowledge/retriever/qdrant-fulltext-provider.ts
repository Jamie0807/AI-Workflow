import type { VectorSearchResult } from '../types'
import type { FulltextSearchProvider } from './hybrid-retriever'

export interface TextSearchService {
    textSearch(options: { query: string; knowledgeBaseIds: string[]; topK: number }): Promise<VectorSearchResult[]>
}

export function createQdrantFulltextProvider(service: TextSearchService): FulltextSearchProvider {
    return {
        async search(options) {
            const results = await service.textSearch(options)

            return results.map(result => ({
                chunkId: result.chunkId,
                content: result.content,
                chunkIndex: result.chunkIndex,
                documentId: result.documentId,
                knowledgeBaseId: result.knowledgeBaseId,
                score: result.score,
                metadata: result.metadata,
            }))
        },
    }
}
