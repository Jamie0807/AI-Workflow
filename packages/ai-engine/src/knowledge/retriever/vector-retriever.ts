import type { EmbeddingService, RetrievalOptions, RetrievalResult, RetrieverService, VectorStoreService } from '../types'

/**
 * 向量检索器
 * 使用嵌入模型和向量存储进行语义检索
 */
export class VectorRetriever implements RetrieverService {
    private embeddingService: EmbeddingService
    private vectorStore: VectorStoreService

    constructor(embeddingService: EmbeddingService, vectorStore: VectorStoreService) {
        this.embeddingService = embeddingService
        this.vectorStore = vectorStore
    }

    /**
     * 执行向量检索
     */
    async retrieve(options: RetrievalOptions): Promise<RetrievalResult[]> {
        const { query, knowledgeBaseIds, topK, threshold = 0.5 } = options

        if (!query || query.trim().length === 0) {
            throw new Error('Query cannot be empty')
        }

        if (!knowledgeBaseIds || knowledgeBaseIds.length === 0) {
            throw new Error('Knowledge base IDs cannot be empty')
        }

        try {
            // 生成查询向量
            const queryVector = await this.embeddingService.embedText(query.trim())

            // 向量搜索
            const searchResults = await this.vectorStore.search({
                vector: queryVector,
                knowledgeBaseIds,
                topK,
                threshold,
            })

            // 转换为检索结果
            return searchResults.map(result => ({
                chunkId: result.chunkId,
                content: result.content,
                chunkIndex: result.chunkIndex,
                documentId: result.documentId,
                knowledgeBaseId: result.knowledgeBaseId,
                score: result.score,
                metadata: result.metadata,
            }))
        } catch (error) {
            throw new Error(`Vector retrieval failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }
}

/**
 * 创建向量检索器实例
 */
export function createVectorRetriever(embeddingService: EmbeddingService, vectorStore: VectorStoreService): RetrieverService {
    return new VectorRetriever(embeddingService, vectorStore)
}
