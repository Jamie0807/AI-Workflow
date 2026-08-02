import { NextRequest, NextResponse } from 'next/server'

import { apiError, ErrorCode } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================================
// GET /api/apps/[id]/workflow/executions/[executionId] - Get execution detail
// ============================================================

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; executionId: string }> }) {
    try {
        const { id: appId, executionId } = await params
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

        // Fetch execution detail
        const execution = await prisma.workflowExecution.findFirst({
            where: {
                appId,
                OR: [{ id: executionId }, { executionId }],
            },
        })

        if (!execution) {
            return apiError(ErrorCode.NOT_FOUND, '执行记录不存在')
        }

        return NextResponse.json({
            success: true,
            data: execution,
        })
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('获取执行详情失败:', error)
        return apiError(ErrorCode.INTERNAL_SERVER_ERROR, error instanceof Error ? error.message : '获取执行详情失败')
    }
}

// ============================================================
// DELETE /api/apps/[id]/workflow/executions/[executionId] - Delete execution
// ============================================================

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; executionId: string }> }) {
    try {
        const { id: appId, executionId } = await params
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

        // Delete execution
        await prisma.workflowExecution.deleteMany({
            where: {
                appId,
                OR: [{ id: executionId }, { executionId }],
            },
        })

        return NextResponse.json({
            success: true,
            message: '删除成功',
        })
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('删除执行记录失败:', error)
        return apiError(ErrorCode.INTERNAL_SERVER_ERROR, error instanceof Error ? error.message : '删除执行记录失败')
    }
}
