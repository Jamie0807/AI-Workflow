/* eslint-disable no-console */

import type {
    ExecutionLogEntry,
    ExecutionLogger,
    HTTPRequestLog,
    HTTPResponseLog,
    LLMRequestLog,
    LLMResponseLog,
    LogLevel,
    LogPhase,
    NodeExecutionResult,
    NodeKind,
} from '../types'

/**
 * 日志回调类型
 */
export type LogCallback = (entry: ExecutionLogEntry) => void

/**
 * 默认执行日志器实现
 */
export class DefaultExecutionLogger implements ExecutionLogger {
    private entries: ExecutionLogEntry[] = []
    private executionId: string
    private verbose: boolean
    private currentNodeId: string | null = null
    private onLog?: LogCallback

    constructor(executionId: string, verbose: boolean = false, onLog?: LogCallback) {
        this.executionId = executionId
        this.verbose = verbose
        this.onLog = onLog
    }

    private log(level: LogLevel, phase: LogPhase, message: string, data?: Record<string, unknown>): void {
        const entry: ExecutionLogEntry = {
            timestamp: new Date(),
            level,
            nodeId: this.currentNodeId || undefined,
            phase,
            message,
            data,
        }

        this.entries.push(entry)

        // 调用日志回调（用于实时推送）
        this.onLog?.(entry)

        // 控制台输出
        if (this.verbose || level === 'error') {
            const prefix = this.currentNodeId ? `[${this.currentNodeId}]` : ''
            const timestamp = entry.timestamp.toISOString().split('T')[1].split('.')[0]
            const logFn =
                level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.log

            const coloredLevel = this.getColoredLevel(level)
            const formattedMessage = `[${timestamp}][${this.executionId}]${prefix} ${coloredLevel} ${message}`

            if (data && Object.keys(data).length > 0) {
                logFn(formattedMessage)
                logFn('  └─', JSON.stringify(data, null, 2).replace(/\n/g, '\n     '))
            } else {
                logFn(formattedMessage)
            }
        }
    }

    private getColoredLevel(level: LogLevel): string {
        const colors = {
            debug: '\x1b[36m[DEBUG]\x1b[0m',
            info: '\x1b[32m[INFO]\x1b[0m',
            warn: '\x1b[33m[WARN]\x1b[0m',
            error: '\x1b[31m[ERROR]\x1b[0m',
        }
        return colors[level]
    }

    debug(message: string, data?: Record<string, unknown>): void {
        this.log('debug', 'node:start', message, data)
    }

    info(message: string, data?: Record<string, unknown>): void {
        this.log('info', 'workflow:start', message, data)
    }

    warn(message: string, data?: Record<string, unknown>): void {
        this.log('warn', 'workflow:start', message, data)
    }

    error(message: string, data?: Record<string, unknown>): void {
        this.log('error', 'workflow:end', message, data)
    }

    nodeStart(nodeId: string, nodeType: NodeKind, config: unknown): void {
        this.log('info', 'node:start', `Node ${nodeId} (${nodeType}) execution started`, {
            nodeType,
            config: this.sanitizeConfig(config),
        })
    }

    nodeEnd(nodeId: string, result: NodeExecutionResult): void {
        const level: LogLevel = result.success ? 'info' : 'error'
        const status = result.success ? 'completed' : 'failed'
        this.log(level, 'node:end', `Node ${nodeId} ${status} (${result.duration}ms)`, {
            success: result.success,
            duration: result.duration,
            outputs: this.truncateOutputs(result.outputs),
            error: result.error?.message,
            matchedBranch: result.matchedBranch,
        })
    }

    variableResolve(expression: string, _originalValue: string, resolvedValue: unknown): void {
        const displayValue =
            typeof resolvedValue === 'string' && resolvedValue.length > 100 ? resolvedValue.substring(0, 100) + '...' : resolvedValue
        this.log('debug', 'variable:resolve', `Variable resolved: ${expression}`, {
            expression,
            resolvedValue: displayValue,
        })
    }

    llmRequest(_nodeId: string, request: LLMRequestLog): void {
        this.log('debug', 'llm:request', `LLM request to model: ${request.model}`, {
            model: request.model,
            messageCount: request.messages.length,
            messages: request.messages.map(m => ({
                role: m.role,
                contentPreview: m.content.length > 200 ? m.content.substring(0, 200) + '...' : m.content,
            })),
            temperature: request.temperature,
            maxTokens: request.maxTokens,
        })
    }

    llmResponse(_nodeId: string, response: LLMResponseLog): void {
        this.log('debug', 'llm:response', `LLM response received (${response.duration}ms)`, {
            contentPreview: response.content.length > 200 ? response.content.substring(0, 200) + '...' : response.content,
            tokens: response.tokens,
            duration: response.duration,
        })
    }

    httpRequest(_nodeId: string, request: HTTPRequestLog): void {
        this.log('debug', 'http:request', `HTTP ${request.method} ${request.url}`, {
            method: request.method,
            url: request.url,
            headers: this.sanitizeHeaders(request.headers),
            body: request.body,
        })
    }

    httpResponse(_nodeId: string, response: HTTPResponseLog): void {
        this.log('debug', 'http:response', `HTTP response status: ${response.status} (${response.duration}ms)`, {
            status: response.status,
            headers: response.headers,
            dataPreview:
                typeof response.data === 'string' ? response.data.substring(0, 200) : JSON.stringify(response.data).substring(0, 200),
            duration: response.duration,
        })
    }

    getEntries(): ExecutionLogEntry[] {
        return [...this.entries]
    }

    setCurrentNode(nodeId: string | null): void {
        this.currentNodeId = nodeId
    }

    private sanitizeConfig(config: unknown): unknown {
        if (typeof config !== 'object' || config === null) {
            return config
        }

        const sanitized = { ...config } as Record<string, unknown>

        // 截断过长的字符串
        for (const [key, value] of Object.entries(sanitized)) {
            if (typeof value === 'string' && value.length > 500) {
                sanitized[key] = value.substring(0, 500) + '...'
            }
        }

        return sanitized
    }

    private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
        const sanitized = { ...headers }

        // 隐藏敏感头部
        const sensitiveHeaders = ['authorization', 'x-api-key', 'api-key', 'cookie', 'set-cookie']
        for (const key of Object.keys(sanitized)) {
            if (sensitiveHeaders.includes(key.toLowerCase())) {
                sanitized[key] = '***'
            }
        }

        return sanitized
    }

    private truncateOutputs(outputs: Record<string, unknown>): Record<string, unknown> {
        const truncated: Record<string, unknown> = {}

        for (const [key, value] of Object.entries(outputs)) {
            if (typeof value === 'string' && value.length > 200) {
                truncated[key] = value.substring(0, 200) + '...'
            } else if (typeof value === 'object' && value !== null) {
                const str = JSON.stringify(value)
                truncated[key] = str.length > 200 ? str.substring(0, 200) + '...' : value
            } else {
                truncated[key] = value
            }
        }

        return truncated
    }
}

/**
 * 创建执行日志器
 * @param executionId 执行ID
 * @param verbose 是否启用详细日志
 * @param onLog 日志回调（用于实时推送）
 */
export function createExecutionLogger(executionId: string, verbose: boolean = false, onLog?: LogCallback): ExecutionLogger {
    return new DefaultExecutionLogger(executionId, verbose, onLog)
}
