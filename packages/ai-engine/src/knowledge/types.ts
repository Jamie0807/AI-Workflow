// ============================================================
// 文本切分相关类型
// ============================================================

/**
 * 文本块
 */
export interface TextChunk {
    /** 块内容 */
    content: string
    /** 块索引（在文档中的顺序） */
    index: number
    /** 起始字符位置 */
    startOffset: number
    /** 结束字符位置 */
    endOffset: number
    /** 元数据 */
    metadata?: Record<string, unknown>
}

/**
 * 切分配置
 */
export interface ChunkingConfig {
    /** 每块最大字符数 */
    chunkSize: number
    /** 相邻块重叠字符数 */
    chunkOverlap: number
}

/**
 * 文本切分器接口
 */
export interface TextSplitterService {
    /**
     * 将文本切分为多个块
     */
    split(text: string, config?: Partial<ChunkingConfig>): TextChunk[]
}

// ============================================================
// 嵌入相关类型
// ============================================================

/**
 * 嵌入配置
 */
export interface EmbeddingConfig {
    /** 模型名称 */
    model: string
    /** 服务地址 */
    baseUrl: string
    /** 向量维度 */
    dimensions: number
}

/**
 * 嵌入服务接口
 */
export interface EmbeddingService {
    /**
     * 获取单个文本的嵌入向量
     */
    embedText(text: string): Promise<number[]>

    /**
     * 批量获取文本的嵌入向量
     */
    embedTexts(texts: string[]): Promise<number[][]>

    /**
     * 获取向量维度
     */
    getDimensions(): number
}

// ============================================================
// 向量存储相关类型
// ============================================================

/**
 * 带向量的文本块
 */
export interface ChunkWithVector extends TextChunk {
    /** 块 ID */
    id: string
    /** 文档 ID */
    documentId: string
    /** 知识库 ID */
    knowledgeBaseId: string
    /** 嵌入向量 */
    vector: number[]
}

/**
 * 向量存储配置
 */
export interface VectorStoreConfig {
    /** 服务地址 */
    url: string
    /** 集合名称 */
    collectionName: string
}

/**
 * 向量存储接口
 */
export interface VectorStoreService {
    /**
     * 确保集合存在
     */
    ensureCollection(dimensions: number): Promise<void>

    /**
     * 插入或更新向量
     */
    upsertVectors(chunks: ChunkWithVector[]): Promise<void>

    /**
     * 按文档 ID 删除向量
     */
    deleteByDocumentId(documentId: string): Promise<void>

    /**
     * 按知识库 ID 删除所有向量
     */
    deleteByKnowledgeBaseId(knowledgeBaseId: string): Promise<void>

    /**
     * 向量搜索
     */
    search(options: VectorSearchOptions): Promise<VectorSearchResult[]>
}

/**
 * 向量搜索选项
 */
export interface VectorSearchOptions {
    /** 查询向量 */
    vector: number[]
    /** 知识库 ID 列表 */
    knowledgeBaseIds: string[]
    /** 返回数量 */
    topK: number
    /** 相似度阈值 (0-1) */
    threshold?: number
}

/**
 * 向量搜索结果
 */
export interface VectorSearchResult {
    /** 块 ID */
    chunkId: string
    /** 块内容 */
    content: string
    /** 块索引 */
    chunkIndex: number
    /** 文档 ID */
    documentId: string
    /** 知识库 ID */
    knowledgeBaseId: string
    /** 相似度分数 (0-1) */
    score: number
    /** 元数据 */
    metadata?: Record<string, unknown>
}

// ============================================================
// 检索相关类型
// ============================================================

/**
 * 检索模式
 */
export type RetrievalMode = 'vector' | 'fulltext' | 'hybrid'

/**
 * 检索选项
 */
export interface RetrievalOptions {
    /** 查询文本 */
    query: string
    /** 知识库 ID 列表 */
    knowledgeBaseIds: string[]
    /** 检索模式 */
    mode: RetrievalMode
    /** 返回数量 */
    topK: number
    /** 相似度阈值 */
    threshold?: number
    /** 混合模式下向量权重 (0-1) */
    vectorWeight?: number
}

/**
 * 检索结果
 */
export interface RetrievalResult {
    /** 块 ID */
    chunkId: string
    /** 块内容 */
    content: string
    /** 块索引 */
    chunkIndex: number
    /** 文档 ID */
    documentId: string
    /** 文档名称 */
    documentName?: string
    /** 知识库 ID */
    knowledgeBaseId: string
    /** 相似度/相关性分数 */
    score: number
    /** 元数据 */
    metadata?: Record<string, unknown>
}

/**
 * 检索器接口
 */
export interface RetrieverService {
    /**
     * 执行检索
     */
    retrieve(options: RetrievalOptions): Promise<RetrievalResult[]>
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
    chunkSize: 500,
    chunkOverlap: 50,
}

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
    model: 'mxbai-embed-large:latest',
    baseUrl: 'http://localhost:11434',
    dimensions: 1024,
}

export const DEFAULT_VECTOR_STORE_CONFIG: VectorStoreConfig = {
    url: 'http://localhost:6333',
    collectionName: 'knowledge_chunks',
}
