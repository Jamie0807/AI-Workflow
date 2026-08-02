import { NextRequest } from 'next/server'

import { Prisma } from '@/app/generated/prisma/client'
import { apiError, apiSuccess, ErrorCode } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================================
// 类型定义
// ============================================================

interface FlowNode {
    id: string
    type: string
    position: { x: number; y: number }
    data?: Record<string, unknown>
}

interface FlowEdge {
    id: string
    source: string
    sourceHandle?: string
    target: string
    [key: string]: unknown
}

interface WorkflowData {
    nodes: FlowNode[]
    edges: FlowEdge[]
}

interface UpdateWorkflowRequest {
    nodes: FlowNode[]
    edges: FlowEdge[]
}

// ============================================================
// GET /api/apps/[id]/workflow - 获取应用工作流
// ============================================================

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const userId = await getCurrentUserId()

        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED, '请先登录')
        }

        // 获取应用
        const app = await prisma.app.findFirst({
            where: {
                id,
                userId,
                isDeleted: false,
            },
        })

        if (!app) {
            return apiError(ErrorCode.APP_NOT_FOUND, '应用不存在')
        }

        // 获取工作流（如果存在）
        const workflow = await prisma.workflow.findFirst({
            where: {
                appId: id,
            },
            orderBy: {
                version: 'desc',
            },
        })

        if (!workflow) {
            // 返回空工作流
            return apiSuccess<WorkflowData>({
                nodes: [],
                edges: [],
            })
        }

        return apiSuccess<WorkflowData>({
            nodes: workflow.nodes as unknown as FlowNode[],
            edges: workflow.edges as unknown as FlowEdge[],
        })
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('获取工作流失败:', error)
        return apiError(ErrorCode.INTERNAL_SERVER_ERROR, '获取工作流失败')
    }
}

// ============================================================
// POST /api/apps/[id]/workflow - 创建/更新工作流
// ============================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const userId = await getCurrentUserId()

        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED, '请先登录')
        }

        // 验证应用权限
        const app = await prisma.app.findFirst({
            where: {
                id,
                userId,
                isDeleted: false,
            },
        })

        if (!app) {
            return apiError(ErrorCode.APP_NOT_FOUND, '应用不存在')
        }

        const body = (await request.json()) as UpdateWorkflowRequest
        const { nodes, edges } = body

        if (!nodes || !Array.isArray(nodes)) {
            return apiError(ErrorCode.VALIDATION_ERROR, '节点数据格式错误')
        }

        if (!edges || !Array.isArray(edges)) {
            return apiError(ErrorCode.VALIDATION_ERROR, '边数据格式错误')
        }

        // 检查是否已有工作流
        const existingWorkflow = await prisma.workflow.findFirst({
            where: {
                appId: id,
            },
            orderBy: {
                version: 'desc',
            },
        })

        let workflow

        if (existingWorkflow) {
            // 更新现有工作流
            workflow = await prisma.workflow.update({
                where: { id: existingWorkflow.id },
                data: {
                    nodes: nodes as unknown as Prisma.InputJsonValue,
                    edges: edges as unknown as Prisma.InputJsonValue,
                    updatedAt: new Date(),
                },
            })
        } else {
            // 创建新工作流
            workflow = await prisma.workflow.create({
                data: {
                    name: `${app.name} - 工作流`,
                    appId: id,
                    nodes: nodes as unknown as Prisma.InputJsonValue,
                    edges: edges as unknown as Prisma.InputJsonValue,
                    version: 1,
                },
            })
        }

        return apiSuccess<WorkflowData>({
            nodes: workflow.nodes as unknown as FlowNode[],
            edges: workflow.edges as unknown as FlowEdge[],
        })
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('保存工作流失败:', error)
        return apiError(ErrorCode.INTERNAL_SERVER_ERROR, '保存工作流失败')
    }
}
