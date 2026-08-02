import type { VariableStore } from '../types'

/**
 * 变量表达式正则
 * 匹配 ${nodeId.variableName} 格式
 */
const VARIABLE_REGEX = /\$\{([^.}]+)\.([^}]+)\}/g

/**
 * 变量解析器
 */
export class VariableResolver {
    /**
     * 解析单个变量表达式
     * @param expression 变量表达式，如 "${llm-1.output}"
     * @param variableStore 变量存储
     * @returns 解析后的值
     */
    resolveExpression(expression: string, variableStore: VariableStore): { value: unknown; found: boolean } {
        const match = expression.match(/^\$\{([^.}]+)\.([^}]+)\}$/)

        if (!match) {
            return { value: expression, found: false }
        }

        const [, nodeId, variableName] = match
        const value = variableStore.get(nodeId, variableName)

        return { value, found: value !== undefined }
    }

    /**
     * 解析文本中的所有变量
     * @param text 包含变量的文本
     * @param variableStore 变量存储
     * @returns 解析后的文本
     */
    resolveText(text: string, variableStore: VariableStore): string {
        // 重置正则的 lastIndex
        VARIABLE_REGEX.lastIndex = 0

        return text.replace(VARIABLE_REGEX, (match, nodeId, variableName) => {
            const value = variableStore.get(nodeId, variableName)

            if (value === undefined) {
                // 未找到变量，保留原始表达式
                return match
            }

            // 将值转换为字符串
            if (typeof value === 'object') {
                return JSON.stringify(value)
            }

            return String(value)
        })
    }

    /**
     * 提取文本中的所有变量引用
     */
    extractVariables(text: string): Array<{ nodeId: string; variableName: string }> {
        const variables: Array<{ nodeId: string; variableName: string }> = []

        // 重置正则的 lastIndex
        VARIABLE_REGEX.lastIndex = 0

        let match
        while ((match = VARIABLE_REGEX.exec(text)) !== null) {
            variables.push({
                nodeId: match[1],
                variableName: match[2],
            })
        }

        return variables
    }

    /**
     * 验证变量表达式格式
     */
    isValidExpression(expression: string): boolean {
        return /^\$\{[^.}]+\.[^}]+\}$/.test(expression)
    }
}

/**
 * 创建变量解析器实例
 */
export function createVariableResolver(): VariableResolver {
    return new VariableResolver()
}
