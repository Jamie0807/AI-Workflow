import { NextRequest } from 'next/server'

import { apiError, apiPaginated, apiSuccess, ErrorCode, handleApiError } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processDocument } from '@/lib/services/document-processor'

/**
 * GET /api/knowledge/[id]/documents - 获取文档列表
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || undefined
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '20')

        // 构建查询条件
        const where: {
            knowledgeBaseId: string
            status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
        } = {
            knowledgeBaseId,
        }

        if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'ERROR'].includes(status)) {
            where.status = status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
        }

        // 分页查询
        const [documents, total] = await Promise.all([
            prisma.document.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.document.count({ where }),
        ])

        const totalPages = Math.ceil(total / pageSize)

        // 转换数据格式
        const items = documents.map(doc => ({
            id: doc.id,
            name: doc.name,
            originalName: doc.originalName,
            mimeType: doc.mimeType,
            size: doc.size,
            status: doc.status,
            errorMessage: doc.errorMessage,
            chunkCount: doc.chunkCount,
            processedAt: doc.processedAt?.toISOString() || null,
            createdAt: doc.createdAt.toISOString(),
        }))

        return apiPaginated(items, { page, pageSize, total, totalPages })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * POST /api/knowledge/[id]/documents - 上传文档
 * 支持文本文件上传
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

        // 解析 FormData
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return apiError(ErrorCode.VALIDATION_ERROR, '请选择要上传的文件')
        }

        // 验证文件类型
        const allowedTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv', 'text/html']
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
            return apiError(ErrorCode.VALIDATION_ERROR, '不支持的文件类型，仅支持 TXT、MD、JSON、CSV、HTML')
        }

        // 验证文件大小（最大 10MB）
        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
            return apiError(ErrorCode.VALIDATION_ERROR, '文件大小不能超过 10MB')
        }

        // 读取文件内容
        const content = await file.text()

        // 创建文档记录
        const document = await prisma.document.create({
            data: {
                name: file.name.replace(/\.[^/.]+$/, ''), // 去掉扩展名作为名称
                originalName: file.name,
                mimeType: file.type || 'text/plain',
                size: file.size,
                content,
                status: 'PENDING',
                knowledgeBaseId,
            },
        })

        // 更新知识库文档计数
        await prisma.knowledgeBase.update({
            where: { id: knowledgeBaseId },
            data: {
                documentCount: { increment: 1 },
            },
        })

        // 异步处理文档（切分、嵌入、存储到 Qdrant）
        // 使用 Promise 不等待，让处理在后台进行
        processDocument({
            documentId: document.id,
            knowledgeBaseId,
            content,
            fileName: file.name,
            chunkSize: knowledgeBase.chunkSize,
            chunkOverlap: knowledgeBase.chunkOverlap,
            embeddingModel: knowledgeBase.embeddingModel,
            dimensions: knowledgeBase.dimensions,
        }).catch(error => {
            // eslint-disable-next-line no-console
            console.error('Document processing failed:', error)
        })

        return apiSuccess(
            {
                id: document.id,
                name: document.name,
                originalName: document.originalName,
                mimeType: document.mimeType,
                size: document.size,
                status: document.status,
                createdAt: document.createdAt.toISOString(),
            },
            '文档上传成功，正在处理中'
        )
    } catch (error) {
        return handleApiError(error)
    }
}
