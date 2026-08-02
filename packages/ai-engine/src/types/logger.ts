import type { NodeKind } from './workflow'

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * 日志阶段
 */
export type LogPhase =
    | 'workflow:start'
    | 'workflow:end'
    | 'node:start'
    | 'node:end'
    | 'variable:resolve'
    | 'llm:request'
    | 'llm:response'
    | 'http:request'
    | 'http:response'
    | 'condition:evaluate'

/**
 * 日志条目
 */
export interface ExecutionLogEntry {
    timestamp: Date
    level: LogLevel
    nodeId?: string
    phase: LogPhase
    message: string
    data?: Record<string, unknown>
    duration?: number
}

/**
 * LLM 请求日志
 */
export interface LLMRequestLog {
    model: string
    messages: Array<{ role: string; content: string }>
    temperature?: number
    maxTokens?: number
}

/**
 * LLM 响应日志
 */
export interface LLMResponseLog {
    content: string
    tokens: number
    duration: number
}

/**
 * HTTP 请求日志
 */
export interface HTTPRequestLog {
    method: string
    url: string
    headers: Record<string, string>
    body?: unknown
}

/**
 * HTTP 响应日志
 */
export interface HTTPResponseLog {
    status: number
    headers: Record<string, string>
    data: unknown
    duration: number
}

/**
 * 节点执行结果
 */
export interface NodeExecutionResult {
    success: boolean
    outputs: Record<string, unknown>
    error?: Error
    duration: number
    /** 节点输入（从上游节点输出解析后的值） */
    inputs?: Record<string, unknown>
    /** 条件节点专用：匹配的意图分支ID */
    matchedBranch?: string
}

/**
 * 执行日志器接口
 */
export interface ExecutionLogger {
    /** 记录调试日志 */
    debug(message: string, data?: Record<string, unknown>): void

    /** 记录信息日志 */
    info(message: string, data?: Record<string, unknown>): void

    /** 记录警告日志 */
    warn(message: string, data?: Record<string, unknown>): void

    /** 记录错误日志 */
    error(message: string, data?: Record<string, unknown>): void

    /** 记录节点开始 */
    nodeStart(nodeId: string, nodeType: NodeKind, config: unknown): void

    /** 记录节点结束 */
    nodeEnd(nodeId: string, result: NodeExecutionResult): void

    /** 记录变量解析 */
    variableResolve(expression: string, originalValue: string, resolvedValue: unknown): void

    /** 记录 LLM 请求 */
    llmRequest(nodeId: string, request: LLMRequestLog): void

    /** 记录 LLM 响应 */
    llmResponse(nodeId: string, response: LLMResponseLog): void

    /** 记录 HTTP 请求 */
    httpRequest(nodeId: string, request: HTTPRequestLog): void

    /** 记录 HTTP 响应 */
    httpResponse(nodeId: string, response: HTTPResponseLog): void

    /** 获取所有日志条目 */
    getEntries(): ExecutionLogEntry[]

    /** 设置当前节点上下文 */
    setCurrentNode(nodeId: string | null): void
}
