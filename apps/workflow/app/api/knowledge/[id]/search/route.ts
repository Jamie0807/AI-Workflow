import {
    createHybridRetriever,
    createOllamaEmbeddingService,
    createQdrantVectorStore,
    type FulltextSearchProvider,
    type RetrievalResult,
} from '@ai-workflow/ai-engine'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { apiError, apiSuccess, ErrorCode, handleApiError } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const searchSchema = z.object({
    query: z.string().min(1, '查询内容不能为空').max(500, '查询内容最多500个字符'),
    topK: z.number().min(1).max(20).optional(),
    threshold: z.number().min(0).max(1).optional(),
    mode: z.enum(['vector', 'fulltext', 'hybrid']).optional(),
})

/**
 * POST /api/knowledge/[id]/search - 知识库检索
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED)
        }

        const { id: knowledgeBaseId } = await params

        // 检查知识库是否存在且属于当前用户
        const knowledgeBase = await prisma.knowledgeBase.findFirst({
            where: { id: knowledgeBaseId },
        })

        if (!knowledgeBase) {
            return apiError(ErrorCode.KNOWLEDGE_BASE_NOT_FOUND)
        }

        if (knowledgeBase.userId !== userId) {
            return apiError(ErrorCode.KNOWLEDGE_BASE_NOT_FOUND, '无权访问此知识库')
        }

        const body = await request.json()
        const result = searchSchema.safeParse(body)

        if (!result.success) {
            return apiError(ErrorCode.VALIDATION_ERROR, result.error.issues[0]?.message)
        }

        const {
            query,
            topK = knowledgeBase.topK,
            threshold = knowledgeBase.threshold,
            mode = knowledgeBase.retrievalMode.toLowerCase() as 'vector' | 'fulltext' | 'hybrid',
        } = result.data

        // 初始化服务
        const embeddingService = createOllamaEmbeddingService({
            model: knowledgeBase.embeddingModel,
            dimensions: knowledgeBase.dimensions,
        })

        const vectorStore = createQdrantVectorStore({
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            collectionName: 'knowledge_chunks',
        })

        // 创建全文检索提供者（使用 Qdrant 的简单文本匹配）
        const fulltextProvider: FulltextSearchProvider = {
            async search(options): Promise<RetrievalResult[]> {
                // 使用 QdrantVectorStore 的 textSearch 方法
                const results = await (vectorStore as any).textSearch({
                    query: options.query,
                    knowledgeBaseIds: options.knowledgeBaseIds,
                    topK: options.topK,
                })
                return results.map((r: any) => ({
                    chunkId: r.chunkId,
                    content: r.content,
                    chunkIndex: r.chunkIndex,
                    documentId: r.documentId,
                    knowledgeBaseId: r.knowledgeBaseId,
                    score: r.score,
                    metadata: r.metadata,
                }))
            },
        }

        const retriever = createHybridRetriever(embeddingService, vectorStore, fulltextProvider)

        // 执行检索
        const startTime = Date.now()
        const results = await retriever.retrieve({
            query,
            knowledgeBaseIds: [knowledgeBaseId],
            mode,
            topK,
            threshold,
            vectorWeight: knowledgeBase.vectorWeight,
        })
        const duration = Date.now() - startTime

        // 获取文档信息
        const documentIds = [...new Set(results.map(r => r.documentId))] as string[]
        const documents = await prisma.document.findMany({
            where: { id: { in: documentIds } },
            select: { id: true, name: true, originalName: true },
        })
        const documentMap = new Map(documents.map(d => [d.id, d]))

        // 格式化结果
        const formattedResults = results.map(
            (r: {
                chunkId: string
                content: string
                score: number
                chunkIndex: number
                documentId: string
                metadata?: Record<string, unknown>
            }) => ({
                chunkId: r.chunkId,
                content: r.content,
                score: r.score,
                chunkIndex: r.chunkIndex,
                documentId: r.documentId,
                documentName: documentMap.get(r.documentId)?.name || '未知文档',
                metadata: r.metadata,
            })
        )

        return apiSuccess({
            query,
            mode,
            topK,
            threshold,
            duration,
            total: formattedResults.length,
            results: formattedResults,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
