import type { ValidationResult, WorkflowDefinition, WorkflowNode } from '../types'

/**
 * 节点验证器接口
 */
export interface NodeValidator<TConfig = unknown> {
    /**
     * 节点类型
     */
    readonly type: string

    /**
     * 验证节点配置
     */
    validate(config: TConfig): ValidationResult

    /**
     * 验证节点在工作流中的上下文（可选）
     * 例如：验证节点的连接关系、前置条件等
     */
    validateInWorkflow?(node: WorkflowNode, workflow: WorkflowDefinition): ValidationResult
}

/**
 * 工作流验证器接口
 */
export interface WorkflowValidator {
    /**
     * 验证工作流定义
     */
    validate(workflow: WorkflowDefinition): ValidationResult
}
