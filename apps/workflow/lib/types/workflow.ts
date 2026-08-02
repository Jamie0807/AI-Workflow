// ============================================================
// 工作流类型
// ============================================================

/**
 * 流程节点
 */
export interface FlowNode {
    id: string
    type: string
    position: { x: number; y: number }
    data?: Record<string, unknown>
}

/**
 * 流程边
 */
export interface FlowEdge {
    id: string
    source: string
    sourceHandle?: string
    target: string
    [key: string]: unknown
}

/**
 * 工作流数据
 */
export interface WorkflowData {
    nodes: FlowNode[]
    edges: FlowEdge[]
}

/**
 * 保存工作流请求
 */
export interface SaveWorkflowRequest {
    nodes: FlowNode[]
    edges: FlowEdge[]
}
