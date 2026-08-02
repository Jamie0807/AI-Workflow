// ============================================================
// API Key 类型定义
// ============================================================

/**
 * API Key 基本信息（列表展示用，不包含完整 key）
 */
export interface ApiKeyInfo {
    id: string
    name: string
    keyPrefix: string // 显示为 sk-xxx...xxx 形式
    isActive: boolean
    expiresAt: string | null
    lastUsedAt: string | null
    usageCount: number
    createdAt: string
}

/**
 * API Key 完整信息（创建后返回一次）
 */
export interface ApiKeyWithSecret extends ApiKeyInfo {
    key: string // 完整的 API Key，仅在创建时返回
}

/**
 * 创建 API Key 请求
 */
export interface CreateApiKeyRequest {
    name: string
    expiresAt?: string // ISO 日期字符串，可选
}

/**
 * 更新 API Key 请求
 */
export interface UpdateApiKeyRequest {
    name?: string
    isActive?: boolean
    expiresAt?: string | null
}

/**
 * API Key 列表响应
 */
export interface ApiKeyListResponse {
    items: ApiKeyInfo[]
    total: number
}

// ============================================================
// 类型转换工具
// ============================================================

/**
 * 将数据库模型转换为 API Key 信息（不包含完整 key）
 */
export function toApiKeyInfo(apiKey: {
    id: string
    name: string
    keyPrefix: string
    isActive: boolean
    expiresAt: Date | null
    lastUsedAt: Date | null
    usageCount: number
    createdAt: Date
}): ApiKeyInfo {
    return {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        isActive: apiKey.isActive,
        expiresAt: apiKey.expiresAt?.toISOString() ?? null,
        lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
        usageCount: apiKey.usageCount,
        createdAt: apiKey.createdAt.toISOString(),
    }
}

/**
 * 将数据库模型转换为包含完整 key 的 API Key 信息
 */
export function toApiKeyWithSecret(apiKey: {
    id: string
    name: string
    key: string
    keyPrefix: string
    isActive: boolean
    expiresAt: Date | null
    lastUsedAt: Date | null
    usageCount: number
    createdAt: Date
}): ApiKeyWithSecret {
    return {
        ...toApiKeyInfo(apiKey),
        key: apiKey.key,
    }
}

// ============================================================
// API Key 生成工具
// ============================================================

/**
 * 生成随机 API Key
 * 格式: sk-{32位随机字符串}
 */
export function generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'sk-'
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

/**
 * 生成 API Key 前缀（用于显示）
 * 格式: sk-xxx...xxx（前6位 + ... + 后4位）
 */
export function generateKeyPrefix(key: string): string {
    if (key.length <= 10) {
        return key
    }
    return `${key.slice(0, 6)}...${key.slice(-4)}`
}
