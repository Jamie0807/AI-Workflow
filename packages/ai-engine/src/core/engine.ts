import { createExecutionLogger } from '../logger'
import { createDefaultRegistry, NodeRegistry } from '../nodes'
import type {
    ExecuteOptions,
    NodeExecutionResult,
    ValidationResult,
    WorkflowDefinition,
    WorkflowInput,
    WorkflowNode,
    WorkflowResult,
} from '../types'
import { createDefaultWorkflowValidator, DefaultWorkflowValidator } from '../validators'
import { createExecutionContext } from './context'
import { GraphBuilder } from './graph-builder'

/**
 * 工作流引擎配置
 */
export interface WorkflowEngineConfig {
    /** Ollama 服务地址 */
    ollamaBaseUrl?: string
    /** 默认超时时间（毫秒） */
    defaultTimeout?: number
    /** 是否启用详细日志 */
    verbose?: boolean
}

/**
 * 工作流引擎接口
 */
export interface IWorkflowEngine {
    /**
     * 执行工作流
     * @param workflow 工作流定义
     * @param inputs 输入参数
     * @param options 执行选项（可选，用于实时回调）
     */
    execute(workflow: WorkflowDefinition, inputs: WorkflowInput, options?: ExecuteOptions): Promise<WorkflowResult>

    /**
     * 验证工作流定义
     */
    validate(workflow: WorkflowDefinition): ValidationResult

    /**
     * 获取节点注册中心
     */
    getRegistry(): NodeRegistry
}

/**
 * 工作流引擎实现
 */
export class WorkflowEngine implements IWorkflowEngine {
    private registry: NodeRegistry
    private config: Required<WorkflowEngineConfig>
    private workflowValidator: DefaultWorkflowValidator

    constructor(config: WorkflowEngineConfig = {}) {
        this.config = {
            ollamaBaseUrl: config.ollamaBaseUrl ?? 'http://localhost:11434',
            defaultTimeout: config.defaultTimeout ?? 30000,
            verbose: config.verbose ?? false,
        }

        this.registry = createDefaultRegistry()
        this.workflowValidator = createDefaultWorkflowValidator()
    }

    /**
     * 执行工作流
     * @param workflow 工作流定义
     * @param inputs 输入参数
     * @param options 执行选项（可选，用于实时回调）
     */
    async execute(workflow: WorkflowDefinition, inputs: WorkflowInput, options?: ExecuteOptions): Promise<WorkflowResult> {
        const executionId = this.generateExecutionId()
        const startTime = Date.now()
        const logger = createExecutionLogger(executionId, this.config.verbose, options?.onLog)

        logger.info('Workflow execution started', {
            workflowId: workflow.id,
            workflowName: workflow.name,
            inputs,
            nodeCount: workflow.nodes.length,
            edgeCount: workflow.edges.length,
        })

        try {
            // 1. 验证工作流
            const validation = this.validate(workflow)
            if (!validation.valid) {
                throw new Error(`Workflow validation failed: ${validation.errors?.join(', ')}`)
            }

            // 2. 创建执行上下文
            const context = createExecutionContext(executionId, workflow, inputs)

            // 3. 构建执行图（拓扑排序）
            const graphBuilder = new GraphBuilder(workflow)

            // 检查是否有环
            if (graphBuilder.hasCycle()) {
                throw new Error('Workflow contains a cycle')
            }

            let executionOrder = graphBuilder.getExecutionOrder()

            logger.debug('Execution order determined', {
                order: executionOrder.map(n => `${n.id}(${n.type})`),
            })

            // 4. 按顺序执行节点
            let finalOutputs: Record<string, unknown> = {}
            const executedNodes = new Set<string>()

            for (const node of executionOrder) {
                // 跳过已执行的节点
                if (executedNodes.has(node.id)) {
                    continue
                }

                logger.setCurrentNode(node.id)

                // 调用节点开始回调
                const nodeName = (node.data?.label as string) || node.id
                options?.onNodeStart?.(node.id, node.type, nodeName)

                const result = await this.executeNode(node, context, logger)

                // 调用节点结束回调
                options?.onNodeEnd?.(node.id, result)

                if (!result.success) {
                    throw result.error || new Error(`Node ${node.id} execution failed`)
                }

                executedNodes.add(node.id)

                // 标记节点完成
                context.markNodeCompleted(node.id)

                // 如果是结束节点，收集输出
                if (node.type === 'end') {
                    finalOutputs = { ...finalOutputs, ...result.outputs }
                }

                // 处理条件节点的分支选择
                if (node.type === 'condition' && result.matchedBranch) {
                    graphBuilder.selectBranch(node.id, result.matchedBranch)
                    // 重新获取执行顺序（排除未选中分支）
                    executionOrder = graphBuilder.getExecutionOrder()
                    logger.debug('Branch selected, execution order updated', {
                        selectedBranch: result.matchedBranch,
                        newOrder: executionOrder.map(n => `${n.id}(${n.type})`),
                    })
                }

                logger.setCurrentNode(null)
            }

            const duration = Date.now() - startTime

            logger.info('Workflow execution completed successfully', {
                duration,
                outputKeys: Object.keys(finalOutputs),
            })

            return {
                success: true,
                outputs: finalOutputs,
                executionId,
                duration,
                logs: logger.getEntries(),
            }
        } catch (error) {
            const duration = Date.now() - startTime

            logger.error('Workflow execution failed', {
                error: error instanceof Error ? error.message : String(error),
                duration,
            })

            return {
                success: false,
                outputs: {},
                error: error instanceof Error ? error : new Error(String(error)),
                executionId,
                duration,
                logs: logger.getEntries(),
            }
        }
    }

    /**
     * 执行单个节点
     */
    private async executeNode(
        node: WorkflowNode,
        context: ReturnType<typeof createExecutionContext>,
        logger: ReturnType<typeof createExecutionLogger>
    ): Promise<NodeExecutionResult> {
        const executor = this.registry.get(node.type)

        if (!executor) {
            throw new Error(`No executor registered for node type: ${node.type}`)
        }

        // Capture node inputs from upstream nodes before execution
        const nodeInputs: Record<string, unknown> = {}
        const upstreamNodes = context.getUpstreamNodes(node.id)

        for (const upstreamId of upstreamNodes) {
            const outputs = context.variables.getNodeOutputs(upstreamId)
            if (outputs) {
                // Merge upstream outputs into node inputs
                Object.assign(nodeInputs, outputs)
            }
        }

        // Also include workflow inputs for start node
        if (node.type === 'start') {
            Object.assign(nodeInputs, context.inputs)
        }

        const result = await executor.execute(node.id, node.data.config || {}, context, logger)

        // Add inputs to result
        result.inputs = nodeInputs

        return result
    }

    /**
     * 验证工作流
     */
    validate(workflow: WorkflowDefinition): ValidationResult {
        return this.workflowValidator.validate(workflow)
    }

    /**
     * 获取节点注册中心
     */
    getRegistry(): NodeRegistry {
        return this.registry
    }

    /**
     * 生成执行 ID
     */
    private generateExecutionId(): string {
        const timestamp = Date.now().toString(36)
        const random = Math.random().toString(36).substring(2, 8)
        return `exec-${timestamp}-${random}`
    }
}

/**
 * 创建工作流引擎实例
 */
export function createWorkflowEngine(config?: WorkflowEngineConfig): WorkflowEngine {
    return new WorkflowEngine(config)
}
