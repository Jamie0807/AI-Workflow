import { NextRequest, NextResponse } from 'next/server'

import { apiError, ErrorCode } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================================
// GET /api/apps/[id]/workflow/executions - Get execution history
// ============================================================

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: appId } = await params
        const userId = await getCurrentUserId()

        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED, '请先登录')
        }

        // Verify app ownership
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

        // Parse query parameters
        const { searchParams } = new URL(request.url)
        const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
        const cursor = searchParams.get('cursor')

        // Build query
        const where = { appId }

        // Fetch executions
        const executions = await prisma.workflowExecution.findMany({
            where,
            orderBy: { startedAt: 'desc' },
            take: limit + 1, // Fetch one extra to determine if there are more
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1, // Skip the cursor item
            }),
            select: {
                id: true,
                executionId: true,
                status: true,
                inputs: true,
                outputs: true,
                error: true,
                duration: true,
                totalTokens: true,
                startedAt: true,
                completedAt: true,
            },
        })

        // Determine if there are more results
        const hasMore = executions.length > limit
        const results = hasMore ? executions.slice(0, limit) : executions
        const nextCursor = hasMore ? results[results.length - 1]?.id : null

        return NextResponse.json({
            success: true,
            data: {
                executions: results,
                hasMore,
                nextCursor,
            },
        })
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('获取执行历史失败:', error)
        return apiError(ErrorCode.INTERNAL_SERVER_ERROR, error instanceof Error ? error.message : '获取执行历史失败')
    }
}
