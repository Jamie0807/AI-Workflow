import type { ApiKeyInfo, ApiKeyListResponse, ApiKeyWithSecret, CreateApiKeyRequest, UpdateApiKeyRequest } from '@/lib/types/api-key'

/**
 * API Key 服务
 */
export const apiKeyService = {
    /**
     * 获取应用的所有 API Keys
     */
    async getList(appId: string): Promise<ApiKeyListResponse> {
        const response = await fetch(`/api/apps/${appId}/api-keys`)
        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message || '获取 API Key 列表失败')
        }

        return result.data
    },

    /**
     * 创建新的 API Key
     * 注意：返回的 key 字段是完整的 API Key，只会显示这一次
     */
    async create(appId: string, data: CreateApiKeyRequest): Promise<ApiKeyWithSecret> {
        const response = await fetch(`/api/apps/${appId}/api-keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message || '创建 API Key 失败')
        }

        return result.data
    },

    /**
     * 获取 API Key 详情
     */
    async get(appId: string, keyId: string): Promise<ApiKeyInfo> {
        const response = await fetch(`/api/apps/${appId}/api-keys/${keyId}`)
        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message || '获取 API Key 详情失败')
        }

        return result.data
    },

    /**
     * 更新 API Key
     */
    async update(appId: string, keyId: string, data: UpdateApiKeyRequest): Promise<ApiKeyInfo> {
        const response = await fetch(`/api/apps/${appId}/api-keys/${keyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message || '更新 API Key 失败')
        }

        return result.data
    },

    /**
     * 删除 API Key
     */
    async delete(appId: string, keyId: string): Promise<void> {
        const response = await fetch(`/api/apps/${appId}/api-keys/${keyId}`, {
            method: 'DELETE',
        })
        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message || '删除 API Key 失败')
        }
    },
}
