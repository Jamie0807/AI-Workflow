import { NextRequest, NextResponse } from 'next/server'

import { apiError, ErrorCode } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiKeyUsage, DailyStat, StatsOverview, StatsResponse } from '@/lib/types/stats'

/**
 * 获取应用统计数据 API
 * GET /api/apps/[id]/stats
 *
 * 查询参数：
 * - period: 统计周期（7d/30d/90d，默认 7d）
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
        const period = (searchParams.get('period') || '7d') as '7d' | '30d' | '90d'

        // 计算时间范围
        const now = new Date()
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - days)
        startDate.setHours(0, 0, 0, 0)

        const publishedAppIds = app.publishedVersions.map(p => p.id)

        // 如果没有发布版本，返回空统计
        if (publishedAppIds.length === 0) {
            const emptyStats: StatsResponse = {
                overview: {
                    totalCalls: 0,
                    totalTokens: 0,
                    uniqueApiKeys: 0,
                    avgDuration: 0,
                    successRate: 0,
                },
                dailyStats: generateEmptyDailyStats(days),
                topApiKeys: [],
                period,
            }
            return NextResponse.json({ success: true, data: emptyStats })
        }

        // 并行查询统计数据
        const [aggregateResult, dailyStats, topApiKeys] = await Promise.all([
            // 1. 聚合统计
            getAggregateStats(publishedAppIds, startDate),
            // 2. 每日统计
            getDailyStats(publishedAppIds, startDate, days),
            // 3. API Key 使用排行
            getTopApiKeys(publishedAppIds, startDate),
        ])

        const response: StatsResponse = {
            overview: aggregateResult,
            dailyStats,
            topApiKeys,
            period,
        }

        return NextResponse.json({ success: true, data: response })
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('获取统计数据失败:', error)
        return apiError(ErrorCode.INTERNAL_SERVER_ERROR, error instanceof Error ? error.message : '获取统计数据失败')
    }
}

// 获取聚合统计数据
async function getAggregateStats(publishedAppIds: string[], startDate: Date): Promise<StatsOverview> {
    const executions = await prisma.appExecution.findMany({
        where: {
            publishedAppId: { in: publishedAppIds },
            startedAt: { gte: startDate },
        },
        select: {
            status: true,
            totalTokens: true,
            duration: true,
            apiKeyId: true,
        },
    })

    const totalCalls = executions.length
    const totalTokens = executions.reduce((sum, e) => sum + e.totalTokens, 0)
    const uniqueApiKeys = new Set(executions.map(e => e.apiKeyId).filter(Boolean)).size
    const successCount = executions.filter(e => e.status === 'SUCCESS').length
    const successRate = totalCalls > 0 ? Math.round((successCount / totalCalls) * 1000) / 10 : 0

    const durations = executions.map(e => e.duration).filter((d): d is number => d !== null)
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

    return {
        totalCalls,
        totalTokens,
        uniqueApiKeys,
        avgDuration,
        successRate,
    }
}

// 获取每日统计数据
async function getDailyStats(publishedAppIds: string[], startDate: Date, days: number): Promise<DailyStat[]> {
    const executions = await prisma.appExecution.findMany({
        where: {
            publishedAppId: { in: publishedAppIds },
            startedAt: { gte: startDate },
        },
        select: {
            status: true,
            totalTokens: true,
            startedAt: true,
        },
    })

    // 按日期分组
    const dailyMap = new Map<string, DailyStat>()

    // 初始化所有日期
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        dailyMap.set(dateStr, {
            date: dateStr,
            calls: 0,
            tokens: 0,
            errors: 0,
            successCalls: 0,
        })
    }

    // 填充数据
    for (const exec of executions) {
        const dateStr = exec.startedAt.toISOString().split('T')[0]
        const stat = dailyMap.get(dateStr)
        if (stat) {
            stat.calls++
            stat.tokens += exec.totalTokens
            if (exec.status === 'ERROR') {
                stat.errors++
            } else if (exec.status === 'SUCCESS') {
                stat.successCalls++
            }
        }
    }

    return Array.from(dailyMap.values())
}

// 获取 API Key 使用排行
async function getTopApiKeys(publishedAppIds: string[], startDate: Date): Promise<ApiKeyUsage[]> {
    const executions = await prisma.appExecution.findMany({
        where: {
            publishedAppId: { in: publishedAppIds },
            startedAt: { gte: startDate },
            apiKeyId: { not: null },
        },
        select: {
            totalTokens: true,
            startedAt: true,
            apiKey: {
                select: {
                    id: true,
                    name: true,
                    lastUsedAt: true,
                },
            },
        },
    })

    // 按 API Key 分组统计
    const keyMap = new Map<string, ApiKeyUsage>()

    for (const exec of executions) {
        if (!exec.apiKey) continue

        const existing = keyMap.get(exec.apiKey.id)
        if (existing) {
            existing.calls++
            existing.tokens += exec.totalTokens
        } else {
            keyMap.set(exec.apiKey.id, {
                id: exec.apiKey.id,
                name: exec.apiKey.name,
                calls: 1,
                tokens: exec.totalTokens,
                lastUsedAt: exec.apiKey.lastUsedAt?.toISOString() || null,
            })
        }
    }

    // 按调用次数排序，取前 10
    return Array.from(keyMap.values())
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 10)
}

// 生成空的每日统计数据
function generateEmptyDailyStats(days: number): DailyStat[] {
    const result: DailyStat[] = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        result.push({
            date: date.toISOString().split('T')[0],
            calls: 0,
            tokens: 0,
            errors: 0,
            successCalls: 0,
        })
    }

    return result
}
