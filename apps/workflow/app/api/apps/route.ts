import { NextRequest } from 'next/server'
import { z } from 'zod'

import { apiError, apiPaginated, apiSuccess, ErrorCode, handleApiError } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { APP_TYPE_MAP, type AppListQuery, formatDate, toAppInfo } from '@/lib/types/app'

/**
 * GET /api/apps - 获取应用列表
 */
export async function GET(request: NextRequest) {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED)
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || undefined
        const type = searchParams.get('type') || undefined
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '20')

        // 构建查询条件
        const where: {
            userId: string
            isDeleted: boolean
            name?: { contains: string; mode: 'insensitive' }
            type?: 'WORKFLOW' | 'CHATBOT' | 'AGENT'
        } = {
            userId,
            isDeleted: false,
        }

        // 搜索条件
        if (search) {
            where.name = { contains: search, mode: 'insensitive' }
        }

        // 类型筛选
        if (type && type !== 'all') {
            const appType = type.toUpperCase()
            if (appType === 'WORKFLOW' || appType === 'CHATBOT' || appType === 'AGENT') {
                where.type = appType
            }
        }

        // 分页查询
        const [apps, total] = await Promise.all([
            prisma.app.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    user: {
                        select: { name: true },
                    },
                },
            }),
            prisma.app.count({ where }),
        ])

        const totalPages = Math.ceil(total / pageSize)

        // 转换数据格式
        const items = apps.map((app: (typeof apps)[number]) => ({
            ...toAppInfo({
                ...app,
                type: app.type,
            }),
            updatedAt: formatDate(app.updatedAt),
        }))

        return apiPaginated(items, { page, pageSize, total, totalPages })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * POST /api/apps - 创建应用
 */
const createAppSchema = z.object({
    name: z.string().min(1, '应用名称不能为空').max(50, '应用名称最多50个字符'),
    description: z.string().max(200, '应用描述最多200个字符').optional(),
    icon: z.string().default('automation'),
    type: z.enum(['workflow', 'chatbot', 'agent']).default('workflow'),
    tags: z.array(z.string()).default([]),
})

export async function POST(request: NextRequest) {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED)
        }

        const body = await request.json()
        const result = createAppSchema.safeParse(body)

        if (!result.success) {
            return apiError(ErrorCode.APP_NAME_INVALID, result.error.issues[0]?.message)
        }

        const { name, description, icon, type, tags } = result.data

        // 创建应用
        const app = await prisma.app.create({
            data: {
                name,
                description: description || null,
                icon,
                type: APP_TYPE_MAP[type],
                tags,
                userId,
            },
            include: {
                user: {
                    select: { name: true },
                },
            },
        })

        return apiSuccess(
            {
                ...toAppInfo({
                    ...app,
                    type: app.type,
                }),
                updatedAt: formatDate(app.updatedAt),
                createdAt: formatDate(app.createdAt),
            },
            '应用创建成功'
        )
    } catch (error) {
        return handleApiError(error)
    }
}
