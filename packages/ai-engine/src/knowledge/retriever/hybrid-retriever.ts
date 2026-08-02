import type { EmbeddingService, RetrievalOptions, RetrievalResult, RetrieverService, VectorStoreService } from '../types'

/**
 * 全文检索查询接口
 * 由外部（如 Prisma）提供实现
 */
export interface FulltextSearchProvider {
    /**
     * 执行全文检索
     */
    search(options: { query: string; knowledgeBaseIds: string[]; topK: number }): Promise<RetrievalResult[]>
}

/**
 * 混合检索器
 * 支持向量检索、全文检索、混合检索三种模式
 */
export class HybridRetriever implements RetrieverService {
    private embeddingService: EmbeddingService
    private vectorStore: VectorStoreService
    private fulltextProvider?: FulltextSearchProvider

    constructor(embeddingService: EmbeddingService, vectorStore: VectorStoreService, fulltextProvider?: FulltextSearchProvider) {
        this.embeddingService = embeddingService
        this.vectorStore = vectorStore
        this.fulltextProvider = fulltextProvider
    }

    /**
     * 执行检索
     */
    async retrieve(options: RetrievalOptions): Promise<RetrievalResult[]> {
        const { query, knowledgeBaseIds, mode, topK, threshold = 0.5, vectorWeight = 0.7 } = options

        if (!query || query.trim().length === 0) {
            throw new Error('Query cannot be empty')
        }

        if (!knowledgeBaseIds || knowledgeBaseIds.length === 0) {
            throw new Error('Knowledge base IDs cannot be empty')
        }

        switch (mode) {
            case 'vector':
                return this.vectorSearch(query, knowledgeBaseIds, topK, threshold)
            case 'fulltext':
                return this.fulltextSearch(query, knowledgeBaseIds, topK)
            case 'hybrid':
                return this.hybridSearch(query, knowledgeBaseIds, topK, threshold, vectorWeight)
            default:
                throw new Error(`Unsupported retrieval mode: ${mode}`)
        }
    }

    /**
     * 向量检索
     */
    private async vectorSearch(query: string, knowledgeBaseIds: string[], topK: number, threshold: number): Promise<RetrievalResult[]> {
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
            throw new Error(`Vector search failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * 全文检索
     */
    private async fulltextSearch(query: string, knowledgeBaseIds: string[], topK: number): Promise<RetrievalResult[]> {
        if (!this.fulltextProvider) {
            throw new Error('Fulltext search provider is not configured')
        }

        try {
            return await this.fulltextProvider.search({
                query: query.trim(),
                knowledgeBaseIds,
                topK,
            })
        } catch (error) {
            throw new Error(`Fulltext search failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * 混合检索
     * 结合向量检索和全文检索的结果
     */
    private async hybridSearch(
        query: string,
        knowledgeBaseIds: string[],
        topK: number,
        threshold: number,
        vectorWeight: number
    ): Promise<RetrievalResult[]> {
        // 获取两种检索的结果（获取更多结果用于融合）
        const expandedTopK = Math.ceil(topK * 1.5)

        const [vectorResults, fulltextResults] = await Promise.all([
            this.vectorSearch(query, knowledgeBaseIds, expandedTopK, threshold),
            this.fulltextProvider ? this.fulltextSearch(query, knowledgeBaseIds, expandedTopK) : Promise.resolve([]),
        ])

        // 如果没有全文检索结果，直接返回向量检索结果
        if (fulltextResults.length === 0) {
            return vectorResults.slice(0, topK)
        }

        // 融合结果（Reciprocal Rank Fusion）
        const fusedResults = this.reciprocalRankFusion(vectorResults, fulltextResults, vectorWeight)

        return fusedResults.slice(0, topK)
    }

    /**
     * Reciprocal Rank Fusion (RRF)
     * 融合多个排序列表
     */
    private reciprocalRankFusion(
        vectorResults: RetrievalResult[],
        fulltextResults: RetrievalResult[],
        vectorWeight: number
    ): RetrievalResult[] {
        const k = 60 // RRF 常数
        const fulltextWeight = 1 - vectorWeight
        const scoreMap = new Map<string, { result: RetrievalResult; score: number }>()

        // 处理向量检索结果
        vectorResults.forEach((result, index) => {
            const rrfScore = vectorWeight / (k + index + 1)
            const existing = scoreMap.get(result.chunkId)
            if (existing) {
                existing.score += rrfScore
            } else {
                scoreMap.set(result.chunkId, { result, score: rrfScore })
            }
        })

        // 处理全文检索结果
        fulltextResults.forEach((result, index) => {
            const rrfScore = fulltextWeight / (k + index + 1)
            const existing = scoreMap.get(result.chunkId)
            if (existing) {
                existing.score += rrfScore
            } else {
                scoreMap.set(result.chunkId, { result, score: rrfScore })
            }
        })

        // 按融合分数排序
        return Array.from(scoreMap.values())
            .sort((a, b) => b.score - a.score)
            .map(item => ({
                ...item.result,
                score: item.score,
            }))
    }
}

/**
 * 创建混合检索器实例
 */
export function createHybridRetriever(
    embeddingService: EmbeddingService,
    vectorStore: VectorStoreService,
    fulltextProvider?: FulltextSearchProvider
): RetrieverService {
    return new HybridRetriever(embeddingService, vectorStore, fulltextProvider)
}
