import type { ExecutionLogEntry, NodeExecutionResult, NodeKind, WorkflowResult } from '@ai-workflow/ai-engine'

/**
 * 测试运行状态
 */
export type TestRunStatus = 'idle' | 'running' | 'success' | 'error'

/**
 * 节点追踪状态
 */
export type NodeTraceStatus = 'pending' | 'running' | 'success' | 'error'

/**
 * 节点追踪信息
 */
export interface NodeTraceInfo {
    nodeId: string
    nodeName: string
    nodeType: NodeKind
    status: NodeTraceStatus
    startTime?: Date
    endTime?: Date
    duration?: number
    inputs?: Record<string, unknown>
    outputs?: Record<string, unknown>
    error?: string
    logs: ExecutionLogEntry[]
}

/**
 * 测试运行状态
 */
export interface TestRunState {
    status: TestRunStatus
    inputs: Record<string, unknown>
    result: WorkflowResult | null
    startTime: Date | null
    endTime: Date | null
    duration: number
    executionId: string | null
    nodeTraces: Map<string, NodeTraceInfo>
    totalTokens: number
}

/**
 * SSE 事件类型
 */
export type SSEEventType = 'workflow:start' | 'node:start' | 'node:end' | 'log' | 'workflow:end' | 'error'

/**
 * SSE 事件
 */
export interface SSEEvent<T = unknown> {
    type: SSEEventType
    data: T
    timestamp: string
}

/**
 * 工作流开始事件数据
 */
export interface WorkflowStartEventData {
    executionId: string
}

/**
 * 节点开始事件数据
 */
export interface NodeStartEventData {
    nodeId: string
    nodeType: NodeKind
    nodeName: string
}

/**
 * 节点结束事件数据
 */
export interface NodeEndEventData {
    nodeId: string
    success: boolean
    inputs?: Record<string, unknown>
    outputs: Record<string, unknown>
    error?: Error
    duration: number
    matchedBranch?: string
}

/**
 * 工作流结束事件数据
 */
export interface WorkflowEndEventData {
    success: boolean
    outputs: Record<string, unknown>
    duration: number
    totalTokens?: number
    error?: string
}

/**
 * 错误事件数据
 */
export interface ErrorEventData {
    message: string
}

/**
 * 初始测试运行状态
 */
export const initialTestRunState: TestRunState = {
    status: 'idle',
    inputs: {},
    result: null,
    startTime: null,
    endTime: null,
    duration: 0,
    executionId: null,
    nodeTraces: new Map(),
    totalTokens: 0,
}

/**
 * 创建初始状态的工厂函数
 */
export function createInitialTestRunState(): TestRunState {
    return {
        ...initialTestRunState,
        nodeTraces: new Map(),
    }
}
