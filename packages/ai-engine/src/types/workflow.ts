/**
 * 节点类型枚举
 */
export type NodeKind = 'start' | 'llm' | 'http' | 'condition' | 'end' | 'knowledge'

/**
 * 工作流节点定义 （用于定义工作流中的节点）
 * @param id 节点ID
 * @param type 节点类型（start、llm、http、condition、end、knowledge）
 * @param data 节点数据（包含标签和配置）
 */
export interface WorkflowNode {
    id: string
    type: NodeKind
    data: {
        label?: string
        config?: Record<string, unknown>
    }
}

/**
 * 工作流边定义 （用于连接节点）
 * @param id 边ID
 * @param source 源节点ID
 * @param sourceHandle 源节点句柄（用于条件节点的多输出）
 * @param target 目标节点ID
 * @param targetHandle 目标节点句柄（用于条件节点的多输入）
 */
export interface WorkflowEdge {
    id: string
    source: string
    sourceHandle?: string // 用于条件节点的多输出句柄
    target: string
}

/**
 * 工作流定义 （用于定义工作流的结构）
 * @param id 工作流ID
 * @param name 工作流名称
 * @param nodes 工作流节点列表
 * @param edges 工作流边列表
 */
export interface WorkflowDefinition {
    id: string
    name: string
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
}

/**
 * 工作流执行输入
 */
export type WorkflowInput = Record<string, unknown>

/**
 * 验证结果
 */
export interface ValidationResult {
    valid: boolean
    errors?: string[]
}

/**
 * 工作流执行结果
 */
export interface WorkflowResult {
    success: boolean
    outputs: Record<string, unknown>
    error?: Error
    executionId: string
    duration: number
    logs: import('./logger').ExecutionLogEntry[]
}

/**
 * 工作流执行选项（用于实时回调）
 */
export interface ExecuteOptions {
    /** 节点开始执行回调 */
    onNodeStart?: (nodeId: string, nodeType: NodeKind, nodeName: string) => void
    /** 节点执行完成回调 */
    onNodeEnd?: (nodeId: string, result: import('./logger').NodeExecutionResult) => void
    /** 日志记录回调 */
    onLog?: (entry: import('./logger').ExecutionLogEntry) => void
}
