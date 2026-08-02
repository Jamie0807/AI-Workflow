import { describe, expect, it, vi } from 'vitest'

import { createHybridRetriever, createVectorRetriever, HybridRetriever, VectorRetriever } from '../retriever'
import type { FulltextSearchProvider } from '../retriever/hybrid-retriever'
import type { EmbeddingService, RetrievalResult, VectorSearchResult, VectorStoreService } from '../types'

// Mock 嵌入服务
const createMockEmbeddingService = (): EmbeddingService => ({
    embedText: vi.fn().mockResolvedValue(Array(1024).fill(0.5)),
    embedTexts: vi.fn().mockResolvedValue([Array(1024).fill(0.5)]),
    getDimensions: vi.fn().mockReturnValue(1024),
})

// Mock 向量存储
const createMockVectorStore = (results: VectorSearchResult[] = []): VectorStoreService => ({
    ensureCollection: vi.fn().mockResolvedValue(undefined),
    upsertVectors: vi.fn().mockResolvedValue(undefined),
    deleteByDocumentId: vi.fn().mockResolvedValue(undefined),
    deleteByKnowledgeBaseId: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue(results),
})

// Mock 全文检索提供者
const createMockFulltextProvider = (results: RetrievalResult[] = []): FulltextSearchProvider => ({
    search: vi.fn().mockResolvedValue(results),
})

describe('VectorRetriever', () => {
    describe('基础功能', () => {
        it('应该能创建实例', () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore()
            const retriever = new VectorRetriever(embedding, store)
            expect(retriever).toBeInstanceOf(VectorRetriever)
        })

        it('应该能使用工厂函数创建', () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore()
            const retriever = createVectorRetriever(embedding, store)
            expect(retriever).toBeDefined()
        })
    })

    describe('检索功能', () => {
        it('应该调用嵌入服务生成查询向量', async () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore()
            const retriever = new VectorRetriever(embedding, store)

            await retriever.retrieve({
                query: '测试查询',
                knowledgeBaseIds: ['kb-1'],
                mode: 'vector',
                topK: 5,
            })

            expect(embedding.embedText).toHaveBeenCalledWith('测试查询')
        })

        it('应该调用向量存储进行搜索', async () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore()
            const retriever = new VectorRetriever(embedding, store)

            await retriever.retrieve({
                query: '测试查询',
                knowledgeBaseIds: ['kb-1'],
                mode: 'vector',
                topK: 5,
                threshold: 0.5,
            })

            expect(store.search).toHaveBeenCalledWith({
                vector: expect.any(Array),
                knowledgeBaseIds: ['kb-1'],
                topK: 5,
                threshold: 0.5,
            })
        })

        it('应该返回正确格式的结果', async () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore([
                {
                    chunkId: 'chunk-1',
                    content: '内容一',
                    chunkIndex: 0,
                    documentId: 'doc-1',
                    knowledgeBaseId: 'kb-1',
                    score: 0.9,
                },
            ])
            const retriever = new VectorRetriever(embedding, store)

            const results = await retriever.retrieve({
                query: '测试',
                knowledgeBaseIds: ['kb-1'],
                mode: 'vector',
                topK: 5,
            })

            expect(results).toHaveLength(1)
            expect(results[0]).toEqual({
                chunkId: 'chunk-1',
                content: '内容一',
                chunkIndex: 0,
                documentId: 'doc-1',
                knowledgeBaseId: 'kb-1',
                score: 0.9,
                metadata: undefined,
            })
        })
    })

    describe('错误处理', () => {
        it('空查询应该抛出错误', async () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore()
            const retriever = new VectorRetriever(embedding, store)

            await expect(
                retriever.retrieve({
                    query: '',
                    knowledgeBaseIds: ['kb-1'],
                    mode: 'vector',
                    topK: 5,
                })
            ).rejects.toThrow()
        })

        it('空知识库 ID 应该抛出错误', async () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore()
            const retriever = new VectorRetriever(embedding, store)

            await expect(
                retriever.retrieve({
                    query: '测试',
                    knowledgeBaseIds: [],
                    mode: 'vector',
                    topK: 5,
                })
            ).rejects.toThrow()
        })
    })
})

describe('HybridRetriever', () => {
    describe('基础功能', () => {
        it('应该能创建实例', () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore()
            const retriever = new HybridRetriever(embedding, store)
            expect(retriever).toBeInstanceOf(HybridRetriever)
        })

        it('应该能使用工厂函数创建', () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore()
            const retriever = createHybridRetriever(embedding, store)
            expect(retriever).toBeDefined()
        })
    })

    describe('向量模式', () => {
        it('应该执行向量检索', async () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore([
                {
                    chunkId: 'chunk-1',
                    content: '内容',
                    chunkIndex: 0,
                    documentId: 'doc-1',
                    knowledgeBaseId: 'kb-1',
                    score: 0.9,
                },
            ])
            const retriever = new HybridRetriever(embedding, store)

            const results = await retriever.retrieve({
                query: '测试',
                knowledgeBaseIds: ['kb-1'],
                mode: 'vector',
                topK: 5,
            })

            expect(results).toHaveLength(1)
            expect(embedding.embedText).toHaveBeenCalled()
            expect(store.search).toHaveBeenCalled()
        })
    })

    describe('全文模式', () => {
        it('没有全文提供者时应该抛出错误', async () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore()
            const retriever = new HybridRetriever(embedding, store) // 无全文提供者

            await expect(
                retriever.retrieve({
                    query: '测试',
                    knowledgeBaseIds: ['kb-1'],
                    mode: 'fulltext',
                    topK: 5,
                })
            ).rejects.toThrow('Fulltext search provider is not configured')
        })

        it('应该调用全文检索提供者', async () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore()
            const fulltext = createMockFulltextProvider([
                {
                    chunkId: 'chunk-1',
                    content: '内容',
                    chunkIndex: 0,
                    documentId: 'doc-1',
                    knowledgeBaseId: 'kb-1',
                    score: 0.8,
                },
            ])
            const retriever = new HybridRetriever(embedding, store, fulltext)

            const results = await retriever.retrieve({
                query: '测试',
                knowledgeBaseIds: ['kb-1'],
                mode: 'fulltext',
                topK: 5,
            })

            expect(results).toHaveLength(1)
            expect(fulltext.search).toHaveBeenCalledWith({
                query: '测试',
                knowledgeBaseIds: ['kb-1'],
                topK: 5,
            })
        })
    })

    describe('混合模式', () => {
        it('应该融合向量和全文结果', async () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore([
                {
                    chunkId: 'chunk-1',
                    content: '向量结果',
                    chunkIndex: 0,
                    documentId: 'doc-1',
                    knowledgeBaseId: 'kb-1',
                    score: 0.9,
                },
                {
                    chunkId: 'chunk-2',
                    content: '仅向量',
                    chunkIndex: 1,
                    documentId: 'doc-1',
                    knowledgeBaseId: 'kb-1',
                    score: 0.7,
                },
            ])
            const fulltext = createMockFulltextProvider([
                {
                    chunkId: 'chunk-1',
                    content: '向量结果',
                    chunkIndex: 0,
                    documentId: 'doc-1',
                    knowledgeBaseId: 'kb-1',
                    score: 0.8,
                },
                {
                    chunkId: 'chunk-3',
                    content: '仅全文',
                    chunkIndex: 2,
                    documentId: 'doc-1',
                    knowledgeBaseId: 'kb-1',
                    score: 0.6,
                },
            ])
            const retriever = new HybridRetriever(embedding, store, fulltext)

            const results = await retriever.retrieve({
                query: '测试',
                knowledgeBaseIds: ['kb-1'],
                mode: 'hybrid',
                topK: 5,
                vectorWeight: 0.7,
            })

            // 应该包含所有不重复的结果
            expect(results.length).toBe(3)
            // chunk-1 应该排在前面（在两个列表中都有）
            expect(results[0].chunkId).toBe('chunk-1')
        })

        it('没有全文提供者时应该只返回向量结果', async () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore([
                {
                    chunkId: 'chunk-1',
                    content: '向量结果',
                    chunkIndex: 0,
                    documentId: 'doc-1',
                    knowledgeBaseId: 'kb-1',
                    score: 0.9,
                },
            ])
            const retriever = new HybridRetriever(embedding, store)

            const results = await retriever.retrieve({
                query: '测试',
                knowledgeBaseIds: ['kb-1'],
                mode: 'hybrid',
                topK: 5,
            })

            expect(results).toHaveLength(1)
            expect(results[0].chunkId).toBe('chunk-1')
        })
    })

    describe('错误处理', () => {
        it('不支持的模式应该抛出错误', async () => {
            const embedding = createMockEmbeddingService()
            const store = createMockVectorStore()
            const retriever = new HybridRetriever(embedding, store)

            await expect(
                retriever.retrieve({
                    query: '测试',
                    knowledgeBaseIds: ['kb-1'],
                    mode: 'unknown' as any,
                    topK: 5,
                })
            ).rejects.toThrow('Unsupported retrieval mode')
        })
    })
})
