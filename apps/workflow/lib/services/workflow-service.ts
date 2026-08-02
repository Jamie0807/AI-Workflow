import type { SaveWorkflowRequest, WorkflowData } from '@/lib/types/workflow'

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
 * 工作流 API 服务类
 */
class WorkflowService {
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
     * 获取应用工作流
     */
    async getByAppId(appId: string): Promise<WorkflowData> {
        return this.request<WorkflowData>(`/api/apps/${appId}/workflow`)
    }

    /**
     * 保存工作流
     */
    async save(appId: string, data: SaveWorkflowRequest): Promise<WorkflowData> {
        return this.request<WorkflowData>(`/api/apps/${appId}/workflow`, {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }
}

// 导出单例
export const workflowService = new WorkflowService()
