import type { ExecutionContext, ExecutionLogger, NodeExecutionResult, OutputVariableSchema, StartNodeConfig } from '../../types'
import { BaseNodeExecutor } from '../base-executor'

/**
 * START 节点执行器
 * 处理工作流输入参数
 */
export class StartExecutor extends BaseNodeExecutor<StartNodeConfig> {
    readonly type = 'start' as const

    protected async doExecute(
        _nodeId: string,
        config: StartNodeConfig,
        context: ExecutionContext,
        logger: ExecutionLogger
    ): Promise<NodeExecutionResult> {
        const outputs: Record<string, unknown> = {}

        for (const input of config.inputs || []) {
            let value = context.inputs[input.name]

            // 使用默认值
            if (value === undefined && input.defaultValue !== undefined) {
                value = this.parseDefaultValue(input.defaultValue, input.type)
                logger.debug(`Using default value for input: ${input.name}`, {
                    name: input.name,
                    defaultValue: input.defaultValue,
                    parsedValue: value,
                })
            }

            // 检查必填
            if (value === undefined && input.required) {
                throw new Error(`Required input parameter missing: ${input.name}`)
            }

            outputs[input.name] = value

            logger.debug(`Input parameter resolved: ${input.name}`, {
                name: input.name,
                value,
                type: input.type,
            })
        }

        return {
            success: true,
            outputs,
            duration: 0,
        }
    }

    private parseDefaultValue(value: string, type: string): unknown {
        switch (type) {
            case 'number':
                return parseFloat(value)
            case 'boolean':
                return value.toLowerCase() === 'true'
            case 'array':
            case 'object':
                try {
                    return JSON.parse(value)
                } catch {
                    return value
                }
            default:
                return value
        }
    }

    override validate(config: StartNodeConfig): { valid: boolean; errors?: string[] } {
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

    override getOutputSchema(config: StartNodeConfig): OutputVariableSchema[] {
        return (config.inputs || []).map(input => ({
            name: input.name,
            type: input.type || 'string',
            description: input.description,
        }))
    }
}
