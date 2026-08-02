// ============================================================
// 执行日志类型定义
// ============================================================

import type { ExecutionStatus } from '@/app/generated/prisma/client'

/**
 * 执行日志信息（列表展示用）
 */
export interface ExecutionLogInfo {
    id: string
    executionId: string
    status: ExecutionStatus
    duration: number | null // 毫秒
    totalTokens: number
    error: string | null
    // 关联信息
    apiKeyName: string | null // API Key 名称
    triggerType: 'api' // 触发方式，目前仅支持 API
    // 时间
    startedAt: string
    completedAt: string | null
}

/**
 * 执行日志详情（包含输入输出）
 */
export interface ExecutionLogDetail extends ExecutionLogInfo {
    inputs: Record<string, unknown> | null
    outputs: Record<string, unknown> | null
    nodeTraces: unknown[] | null
}

/**
 * 执行日志列表响应
 */
export interface ExecutionLogListResponse {
    items: ExecutionLogInfo[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

/**
 * 执行日志查询参数
 */
export interface ExecutionLogQuery {
    page?: number
    pageSize?: number
    status?: ExecutionStatus | 'all'
    startDate?: string // ISO 日期
    endDate?: string // ISO 日期
    search?: string // 搜索 executionId 或 apiKeyName
}

// ============================================================
// 类型转换工具
// ============================================================

/**
 * 将数据库模型转换为执行日志信息
 */
export function toExecutionLogInfo(execution: {
    id: string
    executionId: string
    status: ExecutionStatus
    duration: number | null
    totalTokens: number
    error: string | null
    startedAt: Date
    completedAt: Date | null
    apiKey: { name: string } | null
}): ExecutionLogInfo {
    return {
        id: execution.id,
        executionId: execution.executionId,
        status: execution.status,
        duration: execution.duration,
        totalTokens: execution.totalTokens,
        error: execution.error,
        apiKeyName: execution.apiKey?.name ?? null,
        triggerType: 'api',
        startedAt: execution.startedAt.toISOString(),
        completedAt: execution.completedAt?.toISOString() ?? null,
    }
}

/**
 * 将数据库模型转换为执行日志详情
 */
export function toExecutionLogDetail(execution: {
    id: string
    executionId: string
    status: ExecutionStatus
    duration: number | null
    totalTokens: number
    error: string | null
    inputs: unknown
    outputs: unknown
    nodeTraces: unknown
    startedAt: Date
    completedAt: Date | null
    apiKey: { name: string } | null
}): ExecutionLogDetail {
    return {
        ...toExecutionLogInfo(execution),
        inputs: execution.inputs as Record<string, unknown> | null,
        outputs: execution.outputs as Record<string, unknown> | null,
        nodeTraces: execution.nodeTraces as unknown[] | null,
    }
}
