// 输入字段定义
export interface InputField {
    name: string
    label?: string
    type: 'string' | 'number' | 'boolean'
    required?: boolean
    defaultValue?: string | number | boolean
}

// SSE 事件类型
export type SSEEventType = 'node:start' | 'node:end' | 'log' | 'complete' | 'error'

// 节点开始事件数据
export interface NodeStartData {
    nodeId: string
    nodeType: string
    nodeName: string
    executionId: string
}

// 节点结束事件数据
export interface NodeEndData {
    nodeId: string
    success: boolean
    outputs?: Record<string, unknown>
    duration?: number
    executionId: string
}

// 日志事件数据
export interface LogData {
    timestamp: string
    level: 'debug' | 'info' | 'warn' | 'error'
    phase: string
    message: string
    nodeId?: string
    executionId: string
}

// 完成事件数据
export interface CompleteData {
    executionId: string
    status: 'SUCCESS' | 'ERROR'
    outputs?: Record<string, unknown>
    duration?: number
}

// 错误事件数据
export interface ErrorData {
    executionId: string
    code: string
    message: string
    duration?: number
}

// SSE 事件
export type SSEEvent =
    | { type: 'node:start'; data: NodeStartData }
    | { type: 'node:end'; data: NodeEndData }
    | { type: 'log'; data: LogData }
    | { type: 'complete'; data: CompleteData }
    | { type: 'error'; data: ErrorData }

// 节点状态
export type NodeStatus = 'pending' | 'running' | 'success' | 'error'

// 节点执行状态
export interface NodeExecution {
    nodeId: string
    nodeType: string
    nodeName: string
    status: NodeStatus
    outputs?: Record<string, unknown>
    duration?: number
    error?: string
}

// 执行状态
export interface ExecutionState {
    executionId: string | null
    status: 'idle' | 'running' | 'success' | 'error'
    nodes: NodeExecution[]
    outputs?: Record<string, unknown>
    error?: string
    duration?: number
}
