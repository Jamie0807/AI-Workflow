import { NextRequest, NextResponse } from 'next/server'

import type { ExecutionStatus, Prisma } from '@/app/generated/prisma/client'
import { apiError, ErrorCode } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toExecutionLogInfo } from '@/lib/types/execution'

/**
 * 获取应用执行日志列表 API
 * GET /api/apps/[id]/executions
 *
 * 查询参数：
 * - page: 页码（默认 1）
 * - pageSize: 每页数量（默认 20）
 * - status: 状态筛选（all/RUNNING/SUCCESS/ERROR）
 * - startDate: 开始日期（ISO 格式）
 * - endDate: 结束日期（ISO 格式）
 * - search: 搜索关键词（执行ID 或 API Key 名称）
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: appId } = await params
        const userId = await getCurrentUserId()

        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED, '请先登录')
        }

        // 验证应用归属
        const app = await prisma.app.findFirst({
            where: {
                id: appId,
                userId,
                isDeleted: false,
            },
            select: {
                id: true,
                publishedVersions: {
                    select: { id: true },
                },
            },
        })

        if (!app) {
            return apiError(ErrorCode.APP_NOT_FOUND, '应用不存在')
        }

        // 解析查询参数
        const searchParams = request.nextUrl.searchParams
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
        const status = searchParams.get('status') || 'all'
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const search = searchParams.get('search')

        // 构建查询条件
        const publishedAppIds = app.publishedVersions.map(p => p.id)

        // 如果没有发布版本，返回空列表
        if (publishedAppIds.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    items: [],
                    total: 0,
                    page,
                    pageSize,
                    totalPages: 0,
                },
            })
        }

        const where: Prisma.AppExecutionWhereInput = {
            publishedAppId: { in: publishedAppIds },
        }

        // 状态筛选
        if (status && status !== 'all') {
            where.status = status as ExecutionStatus
        }

        // 时间范围筛选
        if (startDate || endDate) {
            where.startedAt = {}
            if (startDate) {
                where.startedAt.gte = new Date(startDate)
            }
            if (endDate) {
                // 结束日期设置为当天结束
                const end = new Date(endDate)
                end.setHours(23, 59, 59, 999)
                where.startedAt.lte = end
            }
        }

        // 搜索（执行ID 或 API Key 名称）
        if (search) {
            where.OR = [
                { executionId: { contains: search, mode: 'insensitive' } },
                { apiKey: { name: { contains: search, mode: 'insensitive' } } },
            ]
        }

        // 查询总数和数据
        const [total, executions] = await Promise.all([
            prisma.appExecution.count({ where }),
            prisma.appExecution.findMany({
                where,
                include: {
                    apiKey: {
                        select: { name: true },
                    },
                },
                orderBy: { startedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ])

        const totalPages = Math.ceil(total / pageSize)

        return NextResponse.json({
            success: true,
            data: {
                items: executions.map(toExecutionLogInfo),
                total,
                page,
                pageSize,
                totalPages,
            },
        })
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('获取执行日志失败:', error)
        return apiError(ErrorCode.INTERNAL_SERVER_ERROR, error instanceof Error ? error.message : '获取执行日志失败')
    }
}
