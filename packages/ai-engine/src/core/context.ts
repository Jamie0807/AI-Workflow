import type { ExecutionContext, VariableStore, WorkflowDefinition, WorkflowInput } from '../types'
import { GraphBuilder } from './graph-builder'
import { VariableResolver } from './variable-resolver'

/**
 * 变量存储实现
 */
class DefaultVariableStore implements VariableStore {
    private store: Map<string, Record<string, unknown>> = new Map()

    get(nodeId: string, variableName: string): unknown {
        const nodeOutputs = this.store.get(nodeId)
        return nodeOutputs?.[variableName]
    }

    set(nodeId: string, variableName: string, value: unknown): void {
        const nodeOutputs = this.store.get(nodeId) || {}
        nodeOutputs[variableName] = value
        this.store.set(nodeId, nodeOutputs)
    }

    getNodeOutputs(nodeId: string): Record<string, unknown> | undefined {
        return this.store.get(nodeId)
    }

    setNodeOutputs(nodeId: string, outputs: Record<string, unknown>): void {
        this.store.set(nodeId, outputs)
    }

    getAll(): Map<string, Record<string, unknown>> {
        return new Map(this.store)
    }
}

/**
 * 执行上下文实现
 */
class DefaultExecutionContext implements ExecutionContext {
    readonly executionId: string
    readonly workflow: WorkflowDefinition
    readonly variables: VariableStore
    readonly inputs: WorkflowInput
    readonly startTime: Date

    private completedNodes: Set<string> = new Set()
    private graphBuilder: GraphBuilder
    private variableResolver: VariableResolver

    constructor(executionId: string, workflow: WorkflowDefinition, inputs: WorkflowInput) {
        this.executionId = executionId
        this.workflow = workflow
        this.inputs = inputs
        this.startTime = new Date()
        this.variables = new DefaultVariableStore()
        this.graphBuilder = new GraphBuilder(workflow)
        this.variableResolver = new VariableResolver()
    }
    // 解析变量表达式，返回变量值
    resolveVariable(expression: string): unknown {
        const { value, found } = this.variableResolver.resolveExpression(expression, this.variables)
        return found ? value : undefined
    }
    // 解析文本中的变量占位符，返回解析后的文本
    resolveText(text: string): string {
        return this.variableResolver.resolveText(text, this.variables)
    }
    // 获取上游节点 ID 列表
    getUpstreamNodes(nodeId: string): string[] {
        return this.graphBuilder.getUpstreamNodes(nodeId)
    }
    // 获取下游节点
    isNodeCompleted(nodeId: string): boolean {
        return this.completedNodes.has(nodeId)
    }
    // 标记节点完成
    markNodeCompleted(nodeId: string): void {
        this.completedNodes.add(nodeId)
    }
}

/**
 * 创建执行上下文
 */
export function createExecutionContext(executionId: string, workflow: WorkflowDefinition, inputs: WorkflowInput): ExecutionContext {
    return new DefaultExecutionContext(executionId, workflow, inputs)
}
