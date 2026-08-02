import type { LLMNodeConfig, ValidationResult } from '../../types'
import type { NodeValidator } from '../types'

/**
 * LLM 节点验证器
 */
export class LLMValidator implements NodeValidator<LLMNodeConfig> {
    readonly type = 'llm' as const

    validate(config: LLMNodeConfig): ValidationResult {
        const errors: string[] = []

        if (!config.model) {
            errors.push('Model is required')
        }

        if (!config.userPrompt && !config.systemPrompt) {
            errors.push('At least one prompt (user or system) is required')
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        }
    }
}
