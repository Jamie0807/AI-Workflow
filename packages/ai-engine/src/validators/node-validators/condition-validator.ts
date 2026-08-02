import type { ConditionNodeConfig, ValidationResult } from '../../types'
import type { NodeValidator } from '../types'

/**
 * CONDITION 节点验证器
 */
export class ConditionValidator implements NodeValidator<ConditionNodeConfig> {
    readonly type = 'condition' as const

    validate(config: ConditionNodeConfig): ValidationResult {
        const errors: string[] = []

        if (!config.model) {
            errors.push('Model is required')
        }

        if (!config.intents || config.intents.length === 0) {
            errors.push('At least one intent is required')
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        }
    }
}
