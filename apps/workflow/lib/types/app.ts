// ============================================================
// 应用类型
// ============================================================

/**
 * 应用类型枚举（与数据库保持一致）
 */
export type AppTypeEnum = 'WORKFLOW' | 'CHATBOT' | 'AGENT'

/**
 * 应用类型（前端使用的简化版本）
 */
export type AppType = 'workflow' | 'chatbot' | 'agent'

/**
 * 应用类型映射
 */
export const APP_TYPE_MAP: Record<AppType, AppTypeEnum> = {
    workflow: 'WORKFLOW',
    chatbot: 'CHATBOT',
    agent: 'AGENT',
} as const

export const APP_TYPE_REVERSE_MAP: Record<AppTypeEnum, AppType> = {
    WORKFLOW: 'workflow',
    CHATBOT: 'chatbot',
    AGENT: 'agent',
} as const

// ============================================================
// 应用数据结构
// ============================================================

/**
 * 应用基本信息
 */
export interface AppInfo {
    id: string
    name: string
    description: string
    icon: string
    type: AppType
    tags: string[]
    updatedAt: string
    createdAt: string
    author?: string
    isPublished?: boolean
}

/**
 * 应用详细信息
 */
export interface AppDetail {
    id: string
    name: string
    description: string | null
    icon: string
    type: AppType
    tags: string[]
    updatedAt: string
    createdAt: string
    author?: string
    isPublished: boolean
    version: number
    publishedAt: string | null
    config: unknown
}

/**
 * 创建应用请求
 */
export interface CreateAppRequest {
    name: string
    description?: string
    icon?: string
    type?: AppType
    tags?: string[]
}

/**
 * 更新应用请求
 */
export interface UpdateAppRequest {
    name?: string
    description?: string
    icon?: string
    type?: AppType
    tags?: string[]
    config?: unknown
}

/**
 * 应用列表查询参数
 */
export interface AppListQuery {
    search?: string
    type?: AppType | 'all'
    page?: number
    pageSize?: number
}

/**
 * 应用列表响应
 */
export interface AppListResponse {
    items: AppInfo[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

// ============================================================
// 类型转换工具
// ============================================================

/**
 * 将数据库模型转换为前端应用信息
 */
export function toAppInfo(app: {
    id: string
    name: string
    description: string | null
    icon: string
    type: AppTypeEnum | AppType
    tags: string[]
    updatedAt: Date
    createdAt: Date
    isPublished: boolean
    user?: { name: string | null } | null
}): AppInfo {
    return {
        id: app.id,
        name: app.name,
        description: app.description ?? '',
        icon: app.icon,
        type: typeof app.type === 'string' ? (APP_TYPE_REVERSE_MAP[app.type as AppTypeEnum] ?? 'workflow') : app.type,
        tags: app.tags ?? [],
        updatedAt: app.updatedAt.toISOString(),
        createdAt: app.createdAt.toISOString(),
        author: app.user?.name ?? undefined,
        isPublished: app.isPublished,
    }
}

/**
 * 格式化日期为本地字符串
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}/${month}/${day} ${hours}:${minutes}`
}
