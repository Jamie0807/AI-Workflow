import type { StartNodeConfig, ValidationResult, WorkflowDefinition, WorkflowNode } from '../../types'
import type { NodeValidator } from '../types'

/**
 * START 节点验证器
 */
export class StartValidator implements NodeValidator<StartNodeConfig> {
    readonly type = 'start' as const

    validate(config: StartNodeConfig): ValidationResult {
        const errors: string[] = []

        if (!config.inputs || !Array.isArray(config.inputs)) {
            errors.push('inputs must be an array')
        } else {
            for (const input of config.inputs) {
                if (!input.name) {
                    errors.push('Each input must have a name')
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        }
    }

    validateInWorkflow(_node: WorkflowNode, workflow: WorkflowDefinition): ValidationResult {
        const errors: string[] = []

        // 检查是否只有一个 start 节点
        const startNodes = workflow.nodes.filter(n => n.type === 'start')
        if (startNodes.length > 1) {
            errors.push('Workflow can only have one start node')
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        }
    }
}
