import type { ApiPaginatedData, ApiPaginationMeta, ApiSuccessData } from '@/lib/api-response'

// 知识库类型
export interface KnowledgeBase {
    id: string
    name: string
    description: string | null
    icon: string
    documentCount: number
    chunkCount: number
    status: 'READY' | 'INDEXING' | 'ERROR'
    retrievalMode: 'VECTOR' | 'FULLTEXT' | 'HYBRID'
    createdAt: string
    updatedAt: string
}

// 知识库详情类型
export interface KnowledgeBaseDetail extends KnowledgeBase {
    embeddingModel: string
    embeddingProvider: string
    dimensions: number
    chunkSize: number
    chunkOverlap: number
    vectorWeight: number
    topK: number
    threshold: number
}

// 文档类型
export interface Document {
    id: string
    name: string
    originalName: string
    mimeType: string
    size: number
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
    errorMessage: string | null
    chunkCount: number
    processedAt: string | null
    createdAt: string
}

// 检索结果类型
export interface SearchResult {
    chunkId: string
    content: string
    score: number
    chunkIndex: number
    documentId: string
    documentName: string
    metadata?: Record<string, unknown>
}

export interface SearchResponse {
    query: string
    mode: string
    topK: number
    threshold: number
    duration: number
    total: number
    results: SearchResult[]
}

// 切片 Embedding 统计
export interface EmbeddingStats {
    dimensions: number
    mean: number
    std: number
    min: number
    max: number
    norm: number
    preview: number[]
}

// 切片类型
export interface DocumentChunk {
    chunkId: string
    content: string
    chunkIndex: number
    startOffset: number
    endOffset: number
    charCount: number
    wordCount: number
    embeddingStats: EmbeddingStats | null
}

// 文档统计
export interface DocumentStats {
    totalChars: number
    totalWords: number
    embeddingModel: string
    embeddingDimensions: number
}

export interface DocumentChunksResponse {
    documentId: string
    documentName: string
    total: number
    documentStats: DocumentStats
    chunks: DocumentChunk[]
}

// 知识库服务
class KnowledgeService {
    private baseUrl = '/api/knowledge'

    // 获取知识库列表
    async list(params?: { search?: string; page?: number; pageSize?: number }): Promise<{
        items: KnowledgeBase[]
        meta: ApiPaginationMeta
    }> {
        const searchParams = new URLSearchParams()
        if (params?.search) searchParams.set('search', params.search)
        if (params?.page) searchParams.set('page', String(params.page))
        if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))

        const url = `${this.baseUrl}?${searchParams.toString()}`
        const res = await fetch(url)
        const data: ApiSuccessData<ApiPaginatedData<KnowledgeBase>> = await res.json()

        if (!res.ok) {
            throw new Error((data as unknown as { message: string }).message || '获取知识库列表失败')
        }

        return data.data
    }

    // 创建知识库
    async create(params: { name: string; description?: string; icon?: string }): Promise<KnowledgeBase> {
        const res = await fetch(this.baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        })
        const data: ApiSuccessData<KnowledgeBase> = await res.json()

        if (!res.ok) {
            throw new Error((data as unknown as { message: string }).message || '创建知识库失败')
        }

        return data.data
    }

    // 获取知识库详情
    async getById(id: string): Promise<KnowledgeBaseDetail> {
        const res = await fetch(`${this.baseUrl}/${id}`)
        const data: ApiSuccessData<KnowledgeBaseDetail> = await res.json()

        if (!res.ok) {
            throw new Error((data as unknown as { message: string }).message || '获取知识库详情失败')
        }

        return data.data
    }

    // 更新知识库
    async update(id: string, params: Partial<KnowledgeBaseDetail>): Promise<KnowledgeBaseDetail> {
        const res = await fetch(`${this.baseUrl}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        })
        const data: ApiSuccessData<KnowledgeBaseDetail> = await res.json()

        if (!res.ok) {
            throw new Error((data as unknown as { message: string }).message || '更新知识库失败')
        }

        return data.data
    }

    // 删除知识库
    async delete(id: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/${id}`, {
            method: 'DELETE',
        })

        if (!res.ok) {
            const data = await res.json()
            throw new Error(data.message || '删除知识库失败')
        }
    }

    // 获取文档列表
    async listDocuments(
        knowledgeBaseId: string,
        params?: { status?: string; page?: number; pageSize?: number }
    ): Promise<{ items: Document[]; meta: ApiPaginationMeta }> {
        const searchParams = new URLSearchParams()
        if (params?.status) searchParams.set('status', params.status)
        if (params?.page) searchParams.set('page', String(params.page))
        if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))

        const url = `${this.baseUrl}/${knowledgeBaseId}/documents?${searchParams.toString()}`
        const res = await fetch(url)
        const data: ApiSuccessData<ApiPaginatedData<Document>> = await res.json()

        if (!res.ok) {
            throw new Error((data as unknown as { message: string }).message || '获取文档列表失败')
        }

        return data.data
    }

    // 上传文档
    async uploadDocument(knowledgeBaseId: string, file: File): Promise<Document> {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`${this.baseUrl}/${knowledgeBaseId}/documents`, {
            method: 'POST',
            body: formData,
        })
        const data: ApiSuccessData<Document> = await res.json()

        if (!res.ok) {
            throw new Error((data as unknown as { message: string }).message || '上传文档失败')
        }

        return data.data
    }

    // 删除文档
    async deleteDocument(knowledgeBaseId: string, documentId: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/${knowledgeBaseId}/documents/${documentId}`, {
            method: 'DELETE',
        })

        if (!res.ok) {
            const data = await res.json()
            throw new Error(data.message || '删除文档失败')
        }
    }

    // 检索
    async search(
        knowledgeBaseId: string,
        params: { query: string; topK?: number; threshold?: number; mode?: 'vector' | 'fulltext' | 'hybrid' }
    ): Promise<SearchResponse> {
        const res = await fetch(`${this.baseUrl}/${knowledgeBaseId}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        })
        const data: ApiSuccessData<SearchResponse> = await res.json()

        if (!res.ok) {
            throw new Error((data as unknown as { message: string }).message || '检索失败')
        }

        return data.data
    }

    // 获取文档切片
    async getDocumentChunks(knowledgeBaseId: string, documentId: string): Promise<DocumentChunksResponse> {
        const res = await fetch(`${this.baseUrl}/${knowledgeBaseId}/documents/${documentId}/chunks`)
        const data: ApiSuccessData<DocumentChunksResponse> = await res.json()

        if (!res.ok) {
            throw new Error((data as unknown as { message: string }).message || '获取切片失败')
        }

        return data.data
    }
}

export const knowledgeService = new KnowledgeService()
