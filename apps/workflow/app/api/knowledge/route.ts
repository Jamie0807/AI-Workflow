import { NextRequest } from 'next/server'
import { z } from 'zod'

import { apiError, apiPaginated, apiSuccess, ErrorCode, handleApiError } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/knowledge - 获取知识库列表
 */
export async function GET(request: NextRequest) {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED)
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || undefined
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '20')

        // 构建查询条件
        const where: {
            userId: string
            name?: { contains: string; mode: 'insensitive' }
        } = {
            userId,
        }

        // 搜索条件
        if (search) {
            where.name = { contains: search, mode: 'insensitive' }
        }

        // 分页查询
        const [knowledgeBases, total] = await Promise.all([
            prisma.knowledgeBase.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.knowledgeBase.count({ where }),
        ])

        const totalPages = Math.ceil(total / pageSize)

        // 转换数据格式
        const items = knowledgeBases.map(kb => ({
            id: kb.id,
            name: kb.name,
            description: kb.description,
            icon: kb.icon,
            documentCount: kb.documentCount,
            chunkCount: kb.chunkCount,
            status: kb.status,
            retrievalMode: kb.retrievalMode,
            createdAt: kb.createdAt.toISOString(),
            updatedAt: kb.updatedAt.toISOString(),
        }))

        return apiPaginated(items, { page, pageSize, total, totalPages })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * POST /api/knowledge - 创建知识库
 */
const createKnowledgeBaseSchema = z.object({
    name: z.string().min(1, '知识库名称不能为空').max(50, '知识库名称最多50个字符'),
    description: z.string().max(200, '知识库描述最多200个字符').optional(),
    icon: z.string().default('📚'),
})

export async function POST(request: NextRequest) {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED)
        }

        const body = await request.json()
        const result = createKnowledgeBaseSchema.safeParse(body)

        if (!result.success) {
            return apiError(ErrorCode.KNOWLEDGE_BASE_NAME_INVALID, result.error.issues[0]?.message)
        }

        const { name, description, icon } = result.data

        // 创建知识库
        const knowledgeBase = await prisma.knowledgeBase.create({
            data: {
                name,
                description: description || null,
                icon,
                userId,
            },
        })

        return apiSuccess(
            {
                id: knowledgeBase.id,
                name: knowledgeBase.name,
                description: knowledgeBase.description,
                icon: knowledgeBase.icon,
                documentCount: knowledgeBase.documentCount,
                chunkCount: knowledgeBase.chunkCount,
                status: knowledgeBase.status,
                retrievalMode: knowledgeBase.retrievalMode,
                createdAt: knowledgeBase.createdAt.toISOString(),
                updatedAt: knowledgeBase.updatedAt.toISOString(),
            },
            '知识库创建成功'
        )
    } catch (error) {
        return handleApiError(error)
    }
}
