/* eslint-disable no-console */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createQdrantVectorStore, QdrantVectorStore } from '../store/qdrant-store'
import type { ChunkWithVector } from '../types'

/**
 * Qdrant 存储测试
 *
 * 注意：这些测试需要 Qdrant 服务运行
 * 启动方式：docker compose -f docker/docker-compose.yml up -d ai-workflow-qdrant
 */
describe('QdrantVectorStore', () => {
    const TEST_COLLECTION = 'test_knowledge_chunks'
    const DIMENSIONS = 1024
    let store: QdrantVectorStore

    beforeAll(async () => {
        store = new QdrantVectorStore({
            url: 'http://localhost:6333',
            collectionName: TEST_COLLECTION,
        })

        // 检查 Qdrant 是否可用
        const isHealthy = await store.healthCheck()
        if (!isHealthy) {
            console.warn('Qdrant is not available, skipping integration tests')
        }
    })

    afterAll(async () => {
        // 清理测试集合
        try {
            await store.deleteByKnowledgeBaseId('test-kb-1')
            await store.deleteByKnowledgeBaseId('test-kb-2')
        } catch {
            // 忽略清理错误
        }
    })

    describe('工厂函数', () => {
        it('应该能使用工厂函数创建实例', () => {
            const instance = createQdrantVectorStore({
                url: 'http://localhost:6333',
                collectionName: 'test',
            })
            expect(instance).toBeDefined()
        })
    })

    describe('健康检查', () => {
        it('应该能检查健康状态', async () => {
            const isHealthy = await store.healthCheck()
            // 如果 Qdrant 没运行，跳过后续测试
            if (!isHealthy) {
                console.warn('Qdrant not available, skipping test')
                return
            }
            expect(isHealthy).toBe(true)
        })
    })

    describe('集合管理', () => {
        it('应该能确保集合存在', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            await expect(store.ensureCollection(DIMENSIONS)).resolves.not.toThrow()
        })

        it('重复调用 ensureCollection 不应报错', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            await store.ensureCollection(DIMENSIONS)
            await expect(store.ensureCollection(DIMENSIONS)).resolves.not.toThrow()
        })
    })

    describe('向量操作', () => {
        const testChunks: ChunkWithVector[] = [
            {
                id: 'chunk-1',
                content: '这是测试内容一',
                index: 0,
                startOffset: 0,
                endOffset: 8,
                documentId: 'doc-1',
                knowledgeBaseId: 'test-kb-1',
                vector: Array(DIMENSIONS).fill(0.1),
            },
            {
                id: 'chunk-2',
                content: '这是测试内容二',
                index: 1,
                startOffset: 8,
                endOffset: 16,
                documentId: 'doc-1',
                knowledgeBaseId: 'test-kb-1',
                vector: Array(DIMENSIONS).fill(0.2),
            },
            {
                id: 'chunk-3',
                content: '这是另一个知识库的内容',
                index: 0,
                startOffset: 0,
                endOffset: 12,
                documentId: 'doc-2',
                knowledgeBaseId: 'test-kb-2',
                vector: Array(DIMENSIONS).fill(0.3),
            },
        ]

        it('应该能插入向量', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            await store.ensureCollection(DIMENSIONS)
            await expect(store.upsertVectors(testChunks)).resolves.not.toThrow()
        })

        it('应该能更新已存在的向量', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            const updatedChunks: ChunkWithVector[] = [
                {
                    ...testChunks[0],
                    content: '更新后的内容',
                    vector: Array(DIMENSIONS).fill(0.15),
                },
            ]

            await expect(store.upsertVectors(updatedChunks)).resolves.not.toThrow()
        })

        it('空数组不应报错', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            await expect(store.upsertVectors([])).resolves.not.toThrow()
        })
    })

    describe('向量搜索', () => {
        it('应该能搜索向量', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            // 先确保有数据
            await store.ensureCollection(DIMENSIONS)
            await store.upsertVectors([
                {
                    id: 'search-test-1',
                    content: '搜索测试内容',
                    index: 0,
                    startOffset: 0,
                    endOffset: 6,
                    documentId: 'search-doc',
                    knowledgeBaseId: 'test-kb-1',
                    vector: Array(DIMENSIONS).fill(0.5),
                },
            ])

            // 等待索引更新
            await new Promise(resolve => setTimeout(resolve, 100))

            const results = await store.search({
                vector: Array(DIMENSIONS).fill(0.5),
                knowledgeBaseIds: ['test-kb-1'],
                topK: 5,
                threshold: 0,
            })

            expect(results).toBeDefined()
            expect(Array.isArray(results)).toBe(true)
        })

        it('应该能按知识库过滤搜索结果', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            const results = await store.search({
                vector: Array(DIMENSIONS).fill(0.5),
                knowledgeBaseIds: ['test-kb-2'],
                topK: 10,
                threshold: 0,
            })

            // 结果应该只包含 test-kb-2 的内容
            results.forEach(result => {
                expect(result.knowledgeBaseId).toBe('test-kb-2')
            })
        })

        it('空向量应该抛出错误', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            await expect(
                store.search({
                    vector: [],
                    knowledgeBaseIds: ['test-kb-1'],
                    topK: 5,
                })
            ).rejects.toThrow()
        })

        it('空知识库 ID 应该抛出错误', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            await expect(
                store.search({
                    vector: Array(DIMENSIONS).fill(0.5),
                    knowledgeBaseIds: [],
                    topK: 5,
                })
            ).rejects.toThrow()
        })
    })

    describe('删除操作', () => {
        it('应该能按文档 ID 删除', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            await expect(store.deleteByDocumentId('doc-1')).resolves.not.toThrow()
        })

        it('应该能按知识库 ID 删除', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            await expect(store.deleteByKnowledgeBaseId('test-kb-2')).resolves.not.toThrow()
        })
    })

    describe('集合信息', () => {
        it('应该能获取集合信息', async () => {
            const isHealthy = await store.healthCheck()
            if (!isHealthy) return

            await store.ensureCollection(DIMENSIONS)
            const info = await store.getCollectionInfo()

            if (info) {
                expect(info.pointsCount).toBeDefined()
                expect(info.status).toBeDefined()
            }
        })
    })
})
