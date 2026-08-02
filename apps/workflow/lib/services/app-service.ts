import type { AppDetail, AppInfo, AppListQuery, AppListResponse, CreateAppRequest, UpdateAppRequest } from '@/lib/types/app'

// ============================================================
// API 响应类型
// ============================================================

interface ApiSuccessResponse<T> {
    success: true
    data: T
    message?: string
}

interface ApiErrorResponse {
    success: false
    code: string
    message: string
    details?: Record<string, unknown>
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// ============================================================
// API 客户端类
// ============================================================

/**
 * 应用 API 服务类
 */
class AppService {
    private baseUrl = '/api/apps'

    /**
     * 通用请求处理
     */
    private async request<T>(url: string, options?: RequestInit): Promise<T> {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        })

        const data: ApiResponse<T> = await response.json()

        if (!response.ok || !data.success) {
            const error = data as ApiErrorResponse
            throw new Error(error.message || '请求失败')
        }

        return (data as ApiSuccessResponse<T>).data
    }

    /**
     * 获取应用列表
     */
    async getList(query?: AppListQuery): Promise<AppListResponse> {
        const params = new URLSearchParams()

        if (query?.search) params.append('search', query.search)
        if (query?.type) params.append('type', query.type)
        if (query?.page) params.append('page', query.page.toString())
        if (query?.pageSize) params.append('pageSize', query.pageSize.toString())

        const url = `${this.baseUrl}${params.toString() ? `?${params}` : ''}`
        const response = await this.request<{
            items: AppInfo[]
            meta: { total: number; page: number; pageSize: number; totalPages: number }
        }>(url)

        return {
            items: response.items,
            total: response.meta.total,
            page: response.meta.page,
            pageSize: response.meta.pageSize,
            totalPages: response.meta.totalPages,
        }
    }

    /**
     * 获取应用详情
     */
    async getById(id: string): Promise<AppDetail> {
        return this.request<AppDetail>(`${this.baseUrl}/${id}`)
    }

    /**
     * 创建应用
     */
    async create(data: CreateAppRequest): Promise<AppInfo> {
        return this.request<AppInfo>(this.baseUrl, {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    /**
     * 更新应用
     */
    async update(id: string, data: UpdateAppRequest): Promise<AppInfo> {
        return this.request<AppInfo>(`${this.baseUrl}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
    }

    /**
     * 删除应用
     */
    async delete(id: string): Promise<{ id: string }> {
        return this.request<{ id: string }>(`${this.baseUrl}/${id}`, {
            method: 'DELETE',
        })
    }

    /**
     * 发布应用
     */
    async publish(id: string): Promise<AppInfo> {
        return this.request<AppInfo>(`${this.baseUrl}/${id}/publish`, {
            method: 'POST',
        })
    }

    /**
     * 取消发布应用
     */
    async unpublish(id: string): Promise<AppInfo> {
        return this.request<AppInfo>(`${this.baseUrl}/${id}/unpublish`, {
            method: 'POST',
        })
    }
}

// 导出单例
export const appService = new AppService()
