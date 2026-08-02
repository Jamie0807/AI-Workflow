// 统计概览数据
export interface StatsOverview {
    totalCalls: number // 总调用次数
    totalTokens: number // 总 Token 消耗
    uniqueApiKeys: number // 不同 API Key 数（代表用户数）
    avgDuration: number // 平均执行时间（毫秒）
    successRate: number // 成功率（0-100）
}

// 每日统计数据（用于图表）
export interface DailyStat {
    date: string // 日期 YYYY-MM-DD
    calls: number // 调用次数
    tokens: number // Token 消耗
    errors: number // 错误次数
    successCalls: number // 成功次数
}

// API Key 使用统计
export interface ApiKeyUsage {
    id: string
    name: string
    calls: number // 调用次数
    tokens: number // Token 消耗
    lastUsedAt: string | null // 最后使用时间
}

// 完整的统计响应
export interface StatsResponse {
    overview: StatsOverview
    dailyStats: DailyStat[]
    topApiKeys: ApiKeyUsage[]
    period: string // 统计周期
}

// 查询参数
export interface StatsQuery {
    period?: '7d' | '30d' | '90d' // 统计周期，默认 7d
}
