import { NextRequest, NextResponse } from 'next/server'

import { Prisma } from '@/app/generated/prisma/client'
import { apiError, ErrorCode } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 获取应用发布状态 API
 * GET /api/apps/[id]/publish
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: appId } = await params
        const userId = await getCurrentUserId()

        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED, '请先登录')
        }

        const app = await prisma.app.findFirst({
            where: {
                id: appId,
                userId,
                isDeleted: false,
            },
            select: {
                id: true,
                isPublished: true,
                publishedAt: true,
                activePublishedId: true,
                activePublished: {
                    select: {
                        id: true,
                        version: true,
                        publishedAt: true,
                    },
                },
            },
        })

        if (!app) {
            return apiError(ErrorCode.APP_NOT_FOUND, '应用不存在')
        }

        return NextResponse.json({
            success: true,
            data: app,
        })
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('获取发布状态失败:', error)
        return apiError(ErrorCode.INTERNAL_SERVER_ERROR, error instanceof Error ? error.message : '获取发布状态失败')
    }
}

/**
 * 发布应用 API
 * POST /api/apps/[id]/publish
 *
 * 验证权限后，创建工作流快照（PublishedApp），将应用标记为已发布
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: appId } = await params
        const userId = await getCurrentUserId()

        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED, '请先登录')
        }

        // 1. 验证应用存在性和权限，同时获取当前发布状态
        const app = await prisma.app.findFirst({
            where: {
                id: appId,
                userId,
                isDeleted: false,
            },
            select: {
                id: true,
                name: true,
                description: true,
                isPublished: true,
                activePublishedId: true,
            },
        })

        if (!app) {
            return apiError(ErrorCode.APP_NOT_FOUND, '应用不存在')
        }

        // 2. 获取最新工作流
        const workflow = await prisma.workflow.findFirst({
            where: {
                appId,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        })

        // 3. 验证工作流有效
        if (!workflow) {
            return apiError(ErrorCode.INVALID_WORKFLOW, '工作流为空，无法发布。请先编排工作流')
        }

        const workflowNodes = workflow.nodes as Array<{ id: string; type: string }>
        if (workflowNodes.length === 0) {
            return apiError(ErrorCode.INVALID_WORKFLOW, '工作流为空，无法发布。请先添加节点')
        }

        // 4. 验证工作流必须有开始节点和结束节点
        const nodeTypes = workflowNodes.map(n => n.type)
        if (!nodeTypes.includes('start')) {
            return apiError(ErrorCode.INVALID_WORKFLOW, '工作流缺少开始节点，无法发布')
        }
        if (!nodeTypes.includes('end')) {
            return apiError(ErrorCode.INVALID_WORKFLOW, '工作流缺少结束节点，无法发布')
        }

        // 5. 检查是否是更新发布
        const isUpdate = app.isPublished

        // 6. 获取当前应用的最大发布版本号
        const latestPublished = await prisma.publishedApp.findFirst({
            where: { appId },
            orderBy: { version: 'desc' },
            select: { version: true },
        })
        const nextVersion = (latestPublished?.version ?? 0) + 1

        // 7. 创建新的发布版本（工作流快照）
        const publishedApp = await prisma.publishedApp.create({
            data: {
                version: nextVersion,
                name: app.name,
                description: app.description,
                nodes: workflow.nodes as Prisma.InputJsonValue,
                edges: workflow.edges as Prisma.InputJsonValue,
                appId,
                publishedBy: userId,
            },
        })

        // 8. 更新应用发布状态，指向新的发布版本
        await prisma.app.update({
            where: { id: appId },
            data: {
                isPublished: true,
                activePublishedId: publishedApp.id,
                publishedAt: new Date(),
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                isUpdate,
                version: nextVersion,
                publishedAppId: publishedApp.id,
                message: isUpdate ? '应用已更新发布！' : '应用发布成功！',
            },
        })
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('发布应用失败:', error)
        return apiError(ErrorCode.INTERNAL_SERVER_ERROR, error instanceof Error ? error.message : '发布失败')
    }
}
