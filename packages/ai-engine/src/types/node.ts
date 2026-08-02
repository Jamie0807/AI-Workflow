import type { ExecutionLogger, NodeExecutionResult } from './logger'
import type { NodeKind, WorkflowDefinition, WorkflowInput } from './workflow'

/**
 * 输出变量 schema
 */
export interface OutputVariableSchema {
    name: string
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any'
    description?: string
}

/**
 * 变量存储接口
 */
export interface VariableStore {
    /** 获取变量值 */
    get(nodeId: string, variableName: string): unknown

    /** 设置变量值 */
    set(nodeId: string, variableName: string, value: unknown): void

    /** 获取节点所有输出 */
    getNodeOutputs(nodeId: string): Record<string, unknown> | undefined

    /** 设置节点所有输出 */
    setNodeOutputs(nodeId: string, outputs: Record<string, unknown>): void

    /** 获取所有变量（用于调试） */
    getAll(): Map<string, Record<string, unknown>>
}

/**
 * 执行上下文接口
 */
export interface ExecutionContext {
    /** 执行ID */
    readonly executionId: string

    /** 工作流定义 */
    readonly workflow: WorkflowDefinition

    /** 变量存储 */
    readonly variables: VariableStore

    /** 工作流输入参数 */
    readonly inputs: WorkflowInput

    /** 开始时间 */
    readonly startTime: Date

    /** 解析变量表达式 */
    resolveVariable(expression: string): unknown

    /** 解析文本中的所有变量 */
    resolveText(text: string): string

    /** 获取上游节点ID列表 */
    getUpstreamNodes(nodeId: string): string[]

    /** 检查节点是否已执行完成 */
    isNodeCompleted(nodeId: string): boolean

    /** 标记节点完成 */
    markNodeCompleted(nodeId: string): void
}

/**
 * 节点执行器接口
 */
export interface NodeExecutor<TConfig = Record<string, unknown>> {
    /** 节点类型 */
    readonly type: NodeKind

    /**
     * 执行节点
     * @param nodeId 节点ID
     * @param config 节点配置
     * @param context 执行上下文
     * @param logger 执行日志器
     */
    execute(nodeId: string, config: TConfig, context: ExecutionContext, logger: ExecutionLogger): Promise<NodeExecutionResult>

    /**
     * 验证节点配置
     */
    validate?(config: TConfig): { valid: boolean; errors?: string[] }

    /**
     * 获取节点的输出变量定义
     */
    getOutputSchema?(config: TConfig): OutputVariableSchema[]
}

// ============== 节点配置类型定义 ==============

/**
 * 参数类型
 */
export type ParamType = 'string' | 'number' | 'boolean' | 'array' | 'object'

/**
 * 输入参数
 */
export interface InputParam {
    name: string
    type: ParamType
    defaultValue?: string
    required?: boolean
    description?: string
}

/**
 * START 节点配置
 */
export interface StartNodeConfig {
    inputs: InputParam[]
}

/**
 * LLM 节点配置
 */
export interface LLMNodeConfig {
    model: string
    systemPrompt?: string
    userPrompt: string
    assistantPrompt?: string
    temperature?: number
    maxTokens?: number
}

/**
 * HTTP 方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * Body 类型
 */
export type BodyType = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'json' | 'raw' | 'binary'

/**
 * 键值对
 */
export interface KeyValuePair {
    key: string
    value: string
}

/**
 * HTTP 节点配置
 */
export interface HttpNodeConfig {
    url: string
    method: HttpMethod
    headers: KeyValuePair[]
    params: KeyValuePair[]
    bodyType: BodyType
    body: string
    formData: KeyValuePair[]
    timeout?: number
}

/**
 * 意图定义
 */
export interface Intent {
    name: string
    description?: string
    condition?: string
}

/**
 * CONDITION 节点配置
 */
export interface ConditionNodeConfig {
    model: string
    intents: Intent[]
}

/**
 * 输出参数
 */
export interface OutputParam {
    name: string
    type: ParamType
    value: string
    description?: string
}

/**
 * END 节点配置
 */
export interface EndNodeConfig {
    outputs: OutputParam[]
}

/**
 * 知识库检索模式
 */
export type KnowledgeRetrievalMode = 'vector' | 'fulltext' | 'hybrid'

/**
 * 知识库检索输出格式
 */
export type KnowledgeOutputFormat = 'text' | 'json'

/**
 * KNOWLEDGE 节点配置
 */
export interface KnowledgeNodeConfig {
    /** 知识库 ID 列表 */
    knowledgeBaseIds: string[]
    /** 查询内容（支持变量引用） */
    query: string
    /** 检索模式 */
    retrievalMode: KnowledgeRetrievalMode
    /** 返回结果数量 */
    topK: number
    /** 相似度阈值 (0-1) */
    threshold?: number
    /** 输出格式 */
    outputFormat: KnowledgeOutputFormat
}
