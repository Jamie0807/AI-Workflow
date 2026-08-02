import type { ValidationResult, WorkflowDefinition } from '../types'
import type { NodeValidator, WorkflowValidator } from './types'

/**
 * 默认工作流验证器
 * 协调所有节点验证器和工作流级别的验证
 */
export class DefaultWorkflowValidator implements WorkflowValidator {
    private nodeValidators: Map<string, NodeValidator>

    constructor(validators: NodeValidator[]) {
        this.nodeValidators = new Map()
        for (const validator of validators) {
            this.nodeValidators.set(validator.type, validator)
        }
    }

    validate(workflow: WorkflowDefinition): ValidationResult {
        const errors: string[] = []

        // 1. 检查必须有节点
        if (!workflow.nodes || workflow.nodes.length === 0) {
            errors.push('Workflow must have at least one node')
            return {
                valid: false,
                errors,
            }
        }

        // 2. 检查必须有开始节点
        const startNodes = workflow.nodes.filter(n => n.type === 'start')
        if (startNodes.length === 0) {
            errors.push('Workflow must have at least one start node')
        }
        if (startNodes.length > 1) {
            errors.push('Workflow can only have one start node')
        }

        // 3. 检查必须有结束节点
        const endNodes = workflow.nodes.filter(n => n.type === 'end')
        if (endNodes.length === 0) {
            errors.push('Workflow must have at least one end node')
        }

        // 4. 检查所有节点类型是否已注册
        for (const node of workflow.nodes) {
            if (!this.nodeValidators.has(node.type)) {
                errors.push(`Unknown node type: ${node.type}`)
            }
        }

        // 5. 检查边的有效性
        const nodeIds = new Set(workflow.nodes.map(n => n.id))
        for (const edge of workflow.edges) {
            if (!nodeIds.has(edge.source)) {
                errors.push(`Edge source node not found: ${edge.source}`)
            }
            if (!nodeIds.has(edge.target)) {
                errors.push(`Edge target node not found: ${edge.target}`)
            }
        }

        // 6. 验证每个节点的配置
        for (const node of workflow.nodes) {
            const validator = this.nodeValidators.get(node.type)
            if (validator) {
                // 验证节点配置
                const nodeValidation = validator.validate(node.data.config || {})
                if (!nodeValidation.valid && nodeValidation.errors) {
                    for (const err of nodeValidation.errors) {
                        errors.push(`Node ${node.id}: ${err}`)
                    }
                }

                // 验证节点在工作流中的上下文（如果有的话）
                if (validator.validateInWorkflow) {
                    const contextValidation = validator.validateInWorkflow(node, workflow)
                    if (!contextValidation.valid && contextValidation.errors) {
                        for (const err of contextValidation.errors) {
                            errors.push(`Node ${node.id}: ${err}`)
                        }
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        }
    }

    /**
     * 注册节点验证器
     */
    registerValidator(validator: NodeValidator): void {
        this.nodeValidators.set(validator.type, validator)
    }

    /**
     * 获取节点验证器
     */
    getValidator(type: string): NodeValidator | undefined {
        return this.nodeValidators.get(type)
    }
}
