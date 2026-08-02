export { DefaultWorkflowValidator } from './workflow-validator'
export { StartValidator, EndValidator, LLMValidator, ConditionValidator, HTTPValidator, KnowledgeValidator } from './node-validators'
export type { NodeValidator, WorkflowValidator } from './types'

import { ConditionValidator, EndValidator, HTTPValidator, KnowledgeValidator, LLMValidator, StartValidator } from './node-validators'
import { DefaultWorkflowValidator } from './workflow-validator'

/**
 * 创建默认的工作流验证器
 * 包含所有内置节点的验证器
 */
export function createDefaultWorkflowValidator(): DefaultWorkflowValidator {
    return new DefaultWorkflowValidator([
        new StartValidator(),
        new EndValidator(),
        new LLMValidator(),
        new ConditionValidator(),
        new HTTPValidator(),
        new KnowledgeValidator(),
    ])
}
