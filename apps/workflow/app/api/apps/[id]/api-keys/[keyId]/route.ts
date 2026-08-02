import { NextRequest } from 'next/server'
import { z } from 'zod'

import { apiError, apiSuccess, ErrorCode, handleApiError } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiKeyInfo } from '@/lib/types/api-key'

// ============================================================
// 请求验证
// ============================================================

const updateApiKeySchema = z.object({
    name: z.string().min(1, 'API Key 名称不能为空').max(50, 'API Key 名称不能超过50个字符').optional(),
    isActive: z.boolean().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
})

// ============================================================
// API 路由
// ============================================================

/**
 * 获取 API Key 详情
 * GET /api/apps/[id]/api-keys/[keyId]
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    try {
        const { id: appId, keyId } = await params
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

        // 获取 API Key
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                id: keyId,
                appId,
            },
        })

        if (!apiKey) {
            return apiError(ErrorCode.API_KEY_NOT_FOUND, 'API Key 不存在')
        }

        return apiSuccess(toApiKeyInfo(apiKey))
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * 更新 API Key
 * PUT /api/apps/[id]/api-keys/[keyId]
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    try {
        const { id: appId, keyId } = await params
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

        // 验证 API Key 存在
        const existingApiKey = await prisma.apiKey.findFirst({
            where: {
                id: keyId,
                appId,
            },
        })

        if (!existingApiKey) {
            return apiError(ErrorCode.API_KEY_NOT_FOUND, 'API Key 不存在')
        }

        // 解析请求体
        const body = await request.json()
        const validatedData = updateApiKeySchema.parse(body)

        // 更新 API Key
        const updatedApiKey = await prisma.apiKey.update({
            where: {
                id: keyId,
            },
            data: {
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
                ...(validatedData.expiresAt !== undefined && {
                    expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
                }),
            },
        })

        return apiSuccess(toApiKeyInfo(updatedApiKey), '更新成功')
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * 删除 API Key
 * DELETE /api/apps/[id]/api-keys/[keyId]
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; keyId: string }> }) {
    try {
        const { id: appId, keyId } = await params
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

        // 验证 API Key 存在
        const existingApiKey = await prisma.apiKey.findFirst({
            where: {
                id: keyId,
                appId,
            },
        })

        if (!existingApiKey) {
            return apiError(ErrorCode.API_KEY_NOT_FOUND, 'API Key 不存在')
        }

        // 删除 API Key
        await prisma.apiKey.delete({
            where: {
                id: keyId,
            },
        })

        return apiSuccess(null, '删除成功')
    } catch (error) {
        return handleApiError(error)
    }
}
