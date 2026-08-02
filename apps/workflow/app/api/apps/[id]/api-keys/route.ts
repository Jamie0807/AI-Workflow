import { NextRequest } from 'next/server'
import { z } from 'zod'

import { apiError, apiSuccess, ErrorCode, handleApiError } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateApiKey, generateKeyPrefix, toApiKeyInfo, toApiKeyWithSecret } from '@/lib/types/api-key'

// ============================================================
// 请求验证
// ============================================================

const createApiKeySchema = z.object({
    name: z.string().min(1, 'API Key 名称不能为空').max(50, 'API Key 名称不能超过50个字符'),
    expiresAt: z.string().datetime().optional(),
})

// ============================================================
// API 路由
// ============================================================

/**
 * 获取应用的所有 API Keys
 * GET /api/apps/[id]/api-keys
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: appId } = await params
        const userId = await getCurrentUserId()

        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED, '请先登录')
        }

        // 验证应用存在且属于当前用户
        const app = await prisma.app.findFirst({
            where: {
                id: appId,
                userId,
                isDeleted: false,
            },
        })

        if (!app) {
            return apiError(ErrorCode.APP_NOT_FOUND, '应用不存在')
        }

        // 获取所有 API Keys
        const apiKeys = await prisma.apiKey.findMany({
            where: {
                appId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        return apiSuccess({
            items: apiKeys.map(toApiKeyInfo),
            total: apiKeys.length,
        })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * 创建新的 API Key
 * POST /api/apps/[id]/api-keys
 *
 * 注意：创建成功后会返回完整的 API Key，这是唯一一次显示完整 key 的机会
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: appId } = await params
        const userId = await getCurrentUserId()

        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED, '请先登录')
        }

        // 验证应用存在且属于当前用户
        const app = await prisma.app.findFirst({
            where: {
                id: appId,
                userId,
                isDeleted: false,
            },
        })

        if (!app) {
            return apiError(ErrorCode.APP_NOT_FOUND, '应用不存在')
        }

        // 解析请求体
        const body = await request.json()
        const validatedData = createApiKeySchema.parse(body)

        // 生成 API Key
        const key = generateApiKey()
        const keyPrefix = generateKeyPrefix(key)

        // 创建 API Key
        const apiKey = await prisma.apiKey.create({
            data: {
                name: validatedData.name,
                key,
                keyPrefix,
                appId,
                expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
            },
        })

        // 返回包含完整 key 的响应（仅此一次）
        return apiSuccess(toApiKeyWithSecret(apiKey), '创建成功，请妥善保存 API Key')
    } catch (error) {
        return handleApiError(error)
    }
}
