import type { EndNodeConfig, ExecutionContext, ExecutionLogger, NodeExecutionResult, OutputVariableSchema } from '../../types'
import { BaseNodeExecutor } from '../base-executor'

/**
 * END 节点执行器
 * 收集工作流输出
 */
export class EndExecutor extends BaseNodeExecutor<EndNodeConfig> {
    readonly type = 'end' as const

    protected async doExecute(
        _nodeId: string,
        config: EndNodeConfig,
        context: ExecutionContext,
        logger: ExecutionLogger
    ): Promise<NodeExecutionResult> {
        const outputs: Record<string, unknown> = {}

        for (const output of config.outputs || []) {
            // 解析变量表达式
            let value: unknown
            if (output.value && output.value.startsWith('${')) {
                value = context.resolveVariable(output.value)
                if (value === undefined) {
                    logger.warn(`Variable not resolved: ${output.value}`)
                    value = output.value // 保留原始表达式
                } else {
                    logger.variableResolve(output.value, output.value, value)
                }
            } else {
                value = context.resolveText(output.value || '')
            }

            // 类型转换
            outputs[output.name] = this.convertType(value, output.type)

            logger.debug(`Output parameter collected: ${output.name}`, {
                name: output.name,
                expression: output.value,
                value: outputs[output.name],
                type: output.type,
            })
        }

        return {
            success: true,
            outputs,
            duration: 0,
        }
    }

    private convertType(value: unknown, type: string): unknown {
        if (value === undefined || value === null) {
            return value
        }

        switch (type) {
            case 'number': {
                if (typeof value === 'number') return value
                const num = parseFloat(String(value))
                return isNaN(num) ? 0 : num
            }
            case 'boolean':
                if (typeof value === 'boolean') return value
                return String(value).toLowerCase() === 'true'
            case 'array':
                if (Array.isArray(value)) return value
                try {
                    const parsed = JSON.parse(String(value))
                    return Array.isArray(parsed) ? parsed : [value]
                } catch {
                    return [value]
                }
            case 'object':
                if (typeof value === 'object' && !Array.isArray(value)) return value
                try {
                    return JSON.parse(String(value))
                } catch {
                    return { value }
                }
            case 'string':
            default:
                // 如果值是对象或数组，使用 JSON.stringify
                if (typeof value === 'object') {
                    return JSON.stringify(value)
                }
                return String(value)
        }
    }

    override validate(config: EndNodeConfig): { valid: boolean; errors?: string[] } {
        const errors: string[] = []

        if (config.outputs) {
            for (const output of config.outputs) {
                if (!output.name) {
                    errors.push('Each output must have a name')
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        }
    }

    override getOutputSchema(config: EndNodeConfig): OutputVariableSchema[] {
        return (config.outputs || []).map(output => ({
            name: output.name,
            type: output.type || 'string',
            description: output.description,
        }))
    }
}
