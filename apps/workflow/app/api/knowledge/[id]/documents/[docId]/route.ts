import { NextRequest } from 'next/server'

import { apiError, apiSuccess, ErrorCode, handleApiError } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteDocumentVectors } from '@/lib/services/document-processor'

/**
 * GET /api/knowledge/[id]/documents/[docId] - 获取文档详情
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

        // 获取文档
        const document = await prisma.document.findFirst({
            where: {
                id: docId,
                knowledgeBaseId,
            },
        })

        if (!document) {
            return apiError(ErrorCode.DOCUMENT_NOT_FOUND)
        }

        return apiSuccess({
            id: document.id,
            name: document.name,
            originalName: document.originalName,
            mimeType: document.mimeType,
            size: document.size,
            content: document.content,
            status: document.status,
            errorMessage: document.errorMessage,
            chunkCount: document.chunkCount,
            processedAt: document.processedAt?.toISOString() || null,
            createdAt: document.createdAt.toISOString(),
            updatedAt: document.updatedAt.toISOString(),
        })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * DELETE /api/knowledge/[id]/documents/[docId] - 删除文档
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
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

        // 删除文档
        await prisma.document.delete({
            where: { id: docId },
        })

        // 更新知识库统计
        await prisma.knowledgeBase.update({
            where: { id: knowledgeBaseId },
            data: {
                documentCount: { decrement: 1 },
                chunkCount: { decrement: document.chunkCount },
            },
        })

        // 删除 Qdrant 中的向量数据
        await deleteDocumentVectors(docId)

        return apiSuccess({ id: docId }, '文档删除成功')
    } catch (error) {
        return handleApiError(error)
    }
}
