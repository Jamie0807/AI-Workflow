import { Edge, Node } from '@xyflow/react'

import { NodeKind } from './types'

/**
 * 节点输出变量定义
 */
export interface NodeOutputVariable {
    /** 变量路径，如 output, result, text */
    name: string
    /** 变量显示名称 */
    label: string
    /** 变量类型 */
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any'
    /** 变量描述 */
    description?: string
}

/**
 * 可用的上游节点及其输出变量
 */
export interface AvailableNodeOutput {
    /** 节点 ID */
    nodeId: string
    /** 节点类型 */
    nodeType: NodeKind
    /** 节点标签/名称 */
    nodeLabel: string
    /** 该节点的输出变量列表 */
    outputs: NodeOutputVariable[]
}

/**
 * 获取节点类型的标准输出变量
 */
export function getNodeTypeOutputs(nodeType: NodeKind, nodeData?: any): NodeOutputVariable[] {
    switch (nodeType) {
        case 'start': {
            // 开始节点输出其定义的入参
            const inputs = nodeData?.config?.inputs || []
            return inputs.map((input: any) => ({
                name: input.name,
                label: input.name,
                type: input.type || 'string',
                description: input.description,
            }))
        }

        case 'llm':
            return [
                { name: 'output', label: '输出内容', type: 'string', description: 'LLM 生成的文本内容' },
                { name: 'tokens', label: 'Token 数', type: 'number', description: '消耗的 token 数量' },
            ]

        case 'http':
            return [
                { name: 'data', label: '响应数据', type: 'any', description: 'HTTP 响应的 body 数据' },
                { name: 'status', label: '状态码', type: 'number', description: 'HTTP 响应状态码' },
                { name: 'headers', label: '响应头', type: 'object', description: 'HTTP 响应头' },
                { name: 'success', label: '是否成功', type: 'boolean', description: '请求是否成功（2xx 状态码）' },
                { name: 'error', label: '错误信息', type: 'string', description: '请求失败时的错误信息' },
            ]

        case 'condition':
            return [
                { name: 'matchedIntent', label: '匹配意图', type: 'string', description: '匹配到的意图名称' },
                { name: 'confidence', label: '置信度', type: 'number', description: '匹配的置信度' },
            ]

        case 'knowledge':
            return [
                { name: 'output', label: '输出内容', type: 'string', description: '检索结果（文本或 JSON 格式）' },
                { name: 'results', label: '结果数组', type: 'array', description: '检索结果数组，包含详细信息' },
                { name: 'count', label: '结果数量', type: 'number', description: '检索到的结果数量' },
                { name: 'query', label: '查询内容', type: 'string', description: '实际执行的查询内容' },
                { name: 'mode', label: '检索模式', type: 'string', description: '使用的检索模式' },
            ]

        case 'end':
            // 结束节点没有输出
            return []

        default:
            return []
    }
}

/**
 * 获取节点类型的中文名称
 */
export function getNodeTypeLabel(nodeType: NodeKind): string {
    const labels: Record<NodeKind, string> = {
        start: '开始',
        llm: '大模型',
        http: 'HTTP 请求',
        condition: '条件',
        end: '结束',
        knowledge: '知识库',
    }
    return labels[nodeType] || nodeType
}

/**
 * 根据边关系查找当前节点的所有上游节点
 * 使用拓扑排序思想，找到所有能到达当前节点的节点
 */
export function findUpstreamNodes(currentNodeId: string, nodes: Node[], edges: Edge[]): Node[] {
    const upstreamIds = new Set<string>()
    const visited = new Set<string>()

    // 建立反向边的映射: target -> sources
    const reverseEdgeMap = new Map<string, string[]>()
    edges.forEach(edge => {
        const sources = reverseEdgeMap.get(edge.target) || []
        sources.push(edge.source)
        reverseEdgeMap.set(edge.target, sources)
    })

    // DFS 遍历所有上游节点
    function dfs(nodeId: string) {
        if (visited.has(nodeId)) return
        visited.add(nodeId)

        const sources = reverseEdgeMap.get(nodeId) || []
        sources.forEach(sourceId => {
            upstreamIds.add(sourceId)
            dfs(sourceId)
        })
    }

    dfs(currentNodeId)

    // 返回上游节点，按拓扑顺序排序（离当前节点越近的越后面）
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const result: Node[] = []

    upstreamIds.forEach(id => {
        const node = nodeMap.get(id)
        if (node) {
            result.push(node)
        }
    })

    return result
}

/**
 * 获取当前节点可用的所有上游节点输出变量
 */
export function getAvailableNodeOutputs(currentNodeId: string, nodes: Node[], edges: Edge[]): AvailableNodeOutput[] {
    const upstreamNodes = findUpstreamNodes(currentNodeId, nodes, edges)

    return upstreamNodes
        .filter(node => node.type !== 'end') // 排除结束节点
        .map(node => ({
            nodeId: node.id,
            nodeType: node.type as NodeKind,
            nodeLabel: (node.data?.label as string) || getNodeTypeLabel(node.type as NodeKind),
            outputs: getNodeTypeOutputs(node.type as NodeKind, node.data),
        }))
        .filter(item => item.outputs.length > 0) // 只返回有输出的节点
}

/**
 * 将变量引用格式化为表达式
 */
export function formatVariableExpression(nodeId: string, variableName: string): string {
    return `\${${nodeId}.${variableName}}`
}

/**
 * 解析变量表达式
 */
export function parseVariableExpression(expression: string): { nodeId: string; variableName: string } | null {
    const match = expression.match(/\$\{([^.]+)\.([^}]+)\}/)
    if (match) {
        return {
            nodeId: match[1],
            variableName: match[2],
        }
    }
    return null
}
