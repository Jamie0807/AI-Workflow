import { QdrantClient } from '@qdrant/js-client-rest'
import { NextRequest } from 'next/server'

import { apiError, apiSuccess, ErrorCode, handleApiError } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/knowledge/[id]/documents/[docId]/chunks - 获取文档切片列表
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED)
        }

        const { id: knowledgeBaseId, docId } = await params

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

        // 检查文档是否存在
        const document = await prisma.document.findFirst({
            where: {
                id: docId,
                knowledgeBaseId,
            },
        })

        if (!document) {
            return apiError(ErrorCode.DOCUMENT_NOT_FOUND)
        }

        // 从 Qdrant 获取切片（包含向量）
        const client = new QdrantClient({
            url: process.env.QDRANT_URL || 'http://localhost:6333',
        })

        const response = await client.scroll('knowledge_chunks', {
            filter: {
                must: [{ key: 'documentId', match: { value: docId } }],
            },
            limit: 100,
            with_payload: true,
            with_vector: true, // 获取向量用于统计
        })

        // 格式化切片数据，包含 embedding 统计信息
        const chunks = response.points
            .map(point => {
                const vector = point.vector as number[] | undefined
                let embeddingStats = null

                if (vector && Array.isArray(vector)) {
                    // 计算向量统计信息
                    const sum = vector.reduce((a, b) => a + b, 0)
                    const mean = sum / vector.length
                    const squaredDiffs = vector.map(v => Math.pow(v - mean, 2))
                    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / vector.length
                    const std = Math.sqrt(variance)
                    const min = Math.min(...vector)
                    const max = Math.max(...vector)
                    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0))

                    embeddingStats = {
                        dimensions: vector.length,
                        mean: Number(mean.toFixed(6)),
                        std: Number(std.toFixed(6)),
                        min: Number(min.toFixed(6)),
                        max: Number(max.toFixed(6)),
                        norm: Number(norm.toFixed(6)),
                        // 只返回前 10 个维度作为预览
                        preview: vector.slice(0, 10).map(v => Number(v.toFixed(4))),
                    }
                }

                return {
                    chunkId: point.payload?.chunkId as string,
                    content: point.payload?.content as string,
                    chunkIndex: point.payload?.chunkIndex as number,
                    startOffset: point.payload?.startOffset as number,
                    endOffset: point.payload?.endOffset as number,
                    charCount: ((point.payload?.content as string) || '').length,
                    wordCount: ((point.payload?.content as string) || '').split(/\s+/).filter(Boolean).length,
                    embeddingStats,
                }
            })
            .sort((a, b) => a.chunkIndex - b.chunkIndex)

        return apiSuccess({
            documentId: docId,
            documentName: document.name,
            total: chunks.length,
            // 文档级别的统计
            documentStats: {
                totalChars: chunks.reduce((sum, c) => sum + c.charCount, 0),
                totalWords: chunks.reduce((sum, c) => sum + c.wordCount, 0),
                embeddingModel: knowledgeBase.embeddingModel,
                embeddingDimensions: knowledgeBase.dimensions,
            },
            chunks,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
