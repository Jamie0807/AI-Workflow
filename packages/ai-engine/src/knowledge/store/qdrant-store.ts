import { QdrantClient } from '@qdrant/js-client-rest'

import type { ChunkWithVector, VectorSearchOptions, VectorSearchResult, VectorStoreConfig, VectorStoreService } from '../types'
import { DEFAULT_VECTOR_STORE_CONFIG } from '../types'

/**
 * Qdrant 向量存储服务
 * 使用 Qdrant 存储和检索向量
 */
export class QdrantVectorStore implements VectorStoreService {
    private client: QdrantClient
    private collectionName: string

    constructor(config?: Partial<VectorStoreConfig>) {
        const { url, collectionName } = { ...DEFAULT_VECTOR_STORE_CONFIG, ...config }

        this.client = new QdrantClient({ url })
        this.collectionName = collectionName
    }

    /**
     * 确保集合存在
     */
    async ensureCollection(dimensions: number): Promise<void> {
        try {
            // 检查集合是否存在
            const collections = await this.client.getCollections()
            const exists = collections.collections.some(c => c.name === this.collectionName)

            if (exists) {
                return
            }

            // 创建集合
            await this.client.createCollection(this.collectionName, {
                vectors: {
                    size: dimensions,
                    distance: 'Cosine',
                },
                // 创建 payload 索引以加速过滤
                optimizers_config: {
                    indexing_threshold: 10000,
                },
            })

            // 创建 payload 索引
            await this.client.createPayloadIndex(this.collectionName, {
                field_name: 'knowledgeBaseId',
                field_schema: 'keyword',
            })

            await this.client.createPayloadIndex(this.collectionName, {
                field_name: 'documentId',
                field_schema: 'keyword',
            })
        } catch (error) {
            throw new Error(`Failed to ensure collection: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * 插入或更新向量
     */
    async upsertVectors(chunks: ChunkWithVector[]): Promise<void> {
        if (chunks.length === 0) {
            return
        }

        try {
            // 转换为 Qdrant 格式
            const points = chunks.map(chunk => ({
                id: this.stringToUuid(chunk.id),
                vector: chunk.vector,
                payload: {
                    chunkId: chunk.id,
                    content: chunk.content,
                    chunkIndex: chunk.index,
                    startOffset: chunk.startOffset,
                    endOffset: chunk.endOffset,
                    documentId: chunk.documentId,
                    knowledgeBaseId: chunk.knowledgeBaseId,
                    metadata: chunk.metadata || {},
                },
            }))

            // 批量插入（每批最多 100 个）
            const BATCH_SIZE = 100
            for (let i = 0; i < points.length; i += BATCH_SIZE) {
                const batch = points.slice(i, i + BATCH_SIZE)
                await this.client.upsert(this.collectionName, {
                    points: batch,
                    wait: true,
                })
            }
        } catch (error) {
            throw new Error(`Failed to upsert vectors: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * 按文档 ID 删除向量
     */
    async deleteByDocumentId(documentId: string): Promise<void> {
        try {
            await this.client.delete(this.collectionName, {
                filter: {
                    must: [
                        {
                            key: 'documentId',
                            match: { value: documentId },
                        },
                    ],
                },
                wait: true,
            })
        } catch (error) {
            throw new Error(`Failed to delete by document ID: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * 按知识库 ID 删除所有向量
     */
    async deleteByKnowledgeBaseId(knowledgeBaseId: string): Promise<void> {
        try {
            await this.client.delete(this.collectionName, {
                filter: {
                    must: [
                        {
                            key: 'knowledgeBaseId',
                            match: { value: knowledgeBaseId },
                        },
                    ],
                },
                wait: true,
            })
        } catch (error) {
            throw new Error(`Failed to delete by knowledge base ID: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * 向量搜索
     */
    async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
        const { vector, knowledgeBaseIds, topK, threshold = 0 } = options

        if (!vector || vector.length === 0) {
            throw new Error('Query vector cannot be empty')
        }

        if (!knowledgeBaseIds || knowledgeBaseIds.length === 0) {
            throw new Error('Knowledge base IDs cannot be empty')
        }

        try {
            const response = await this.client.search(this.collectionName, {
                vector,
                limit: topK,
                score_threshold: threshold,
                filter: {
                    must: [
                        {
                            key: 'knowledgeBaseId',
                            match: { any: knowledgeBaseIds },
                        },
                    ],
                },
                with_payload: true,
                with_vector: false,
            })

            return response.map(point => ({
                chunkId: (point.payload?.chunkId as string) || '',
                content: (point.payload?.content as string) || '',
                chunkIndex: (point.payload?.chunkIndex as number) || 0,
                documentId: (point.payload?.documentId as string) || '',
                knowledgeBaseId: (point.payload?.knowledgeBaseId as string) || '',
                score: point.score,
                metadata: (point.payload?.metadata as Record<string, unknown>) || undefined,
            }))
        } catch (error) {
            throw new Error(`Failed to search vectors: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * 获取集合信息
     */
    async getCollectionInfo(): Promise<{
        pointsCount: number
        status: string
    } | null> {
        try {
            const info = await this.client.getCollection(this.collectionName)
            return {
                pointsCount: info.points_count || 0,
                status: info.status,
            }
        } catch {
            return null
        }
    }

    /**
     * 检查健康状态
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.client.getCollections()
            return true
        } catch {
            return false
        }
    }

    /**
     * 文本搜索（基于 payload 内容匹配）
     * 支持分词匹配和相关性评分
     */
    async textSearch(options: { query: string; knowledgeBaseIds: string[]; topK: number }): Promise<VectorSearchResult[]> {
        const { query, knowledgeBaseIds, topK } = options

        if (!query || query.trim().length === 0) {
            throw new Error('Query cannot be empty')
        }

        if (!knowledgeBaseIds || knowledgeBaseIds.length === 0) {
            throw new Error('Knowledge base IDs cannot be empty')
        }

        try {
            // 使用 scroll 获取所有匹配知识库的切片
            const response = await this.client.scroll(this.collectionName, {
                filter: {
                    must: [
                        {
                            key: 'knowledgeBaseId',
                            match: { any: knowledgeBaseIds },
                        },
                    ],
                },
                limit: 1000,
                with_payload: true,
                with_vector: false,
            })

            // 分词（支持中英文）
            const queryLower = query.toLowerCase()
            const queryTerms = queryLower.split(/[\s,，。.!！?？;；:：、]+/).filter(term => term.length > 0)

            const matchedResults: Array<{ result: VectorSearchResult; matchScore: number }> = []

            for (const point of response.points) {
                const content = (point.payload?.content as string) || ''
                const contentLower = content.toLowerCase()

                // 计算匹配分数
                let matchScore = 0
                let matchedTerms = 0

                // 完整查询匹配（权重更高）
                if (contentLower.includes(queryLower)) {
                    matchScore += 2
                }

                // 分词匹配
                for (const term of queryTerms) {
                    if (contentLower.includes(term)) {
                        matchedTerms++
                        // 根据词频增加分数
                        const regex = new RegExp(term, 'gi')
                        const matches = content.match(regex)
                        matchScore += matches ? matches.length * 0.5 : 0
                    }
                }

                // 至少匹配一个词才计入结果
                if (matchScore > 0 || matchedTerms > 0) {
                    matchScore += (matchedTerms / Math.max(queryTerms.length, 1)) * 1.5

                    matchedResults.push({
                        result: {
                            chunkId: (point.payload?.chunkId as string) || '',
                            content,
                            chunkIndex: (point.payload?.chunkIndex as number) || 0,
                            documentId: (point.payload?.documentId as string) || '',
                            knowledgeBaseId: (point.payload?.knowledgeBaseId as string) || '',
                            score: matchScore,
                            metadata: (point.payload?.metadata as Record<string, unknown>) || undefined,
                        },
                        matchScore,
                    })
                }
            }

            // 按匹配分数排序
            matchedResults.sort((a, b) => b.matchScore - a.matchScore)

            // 归一化分数到 0-1 范围
            const maxScore = matchedResults[0]?.matchScore || 1
            return matchedResults.slice(0, topK).map(({ result, matchScore }) => ({
                ...result,
                score: matchScore / maxScore,
            }))
        } catch (error) {
            throw new Error(`Failed to perform text search: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * 将字符串 ID 转换为 UUID 格式
     * Qdrant 需要 UUID 或整数作为点 ID
     * UUID 格式: 8-4-4-4-12 (共 36 字符)
     */
    private stringToUuid(str: string): string {
        // 使用简单的哈希生成确定性 UUID
        let h1 = 0xdeadbeef
        let h2 = 0x41c6ce57

        for (let i = 0; i < str.length; i++) {
            const ch = str.charCodeAt(i)
            h1 = Math.imul(h1 ^ ch, 2654435761)
            h2 = Math.imul(h2 ^ ch, 1597334677)
        }

        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)

        // 生成 32 个十六进制字符 (4 个 8 位块)
        const hex1 = (h1 >>> 0).toString(16).padStart(8, '0')
        const hex2 = (h2 >>> 0).toString(16).padStart(8, '0')
        const hex3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0')
        const hex4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0')

        // 组成 UUID 格式: 8-4-4-4-12
        return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(5, 8)}-a${hex3.slice(1, 4)}-${hex3.slice(4, 8)}${hex4}`
    }
}

/**
 * 创建 Qdrant 向量存储实例
 */
export function createQdrantVectorStore(config?: Partial<VectorStoreConfig>): VectorStoreService {
    return new QdrantVectorStore(config)
}
