import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { ChatOllama } from '@langchain/ollama'

import type { ConditionNodeConfig, ExecutionContext, ExecutionLogger, NodeExecutionResult, OutputVariableSchema } from '../../types'
import { BaseNodeExecutor } from '../base-executor'

/**
 * CONDITION 节点执行器
 * 基于意图识别进行条件分支
 */
export class ConditionExecutor extends BaseNodeExecutor<ConditionNodeConfig> {
    readonly type = 'condition' as const

    protected async doExecute(
        nodeId: string,
        config: ConditionNodeConfig,
        context: ExecutionContext,
        logger: ExecutionLogger
    ): Promise<NodeExecutionResult> {
        const resolvedConfig = this.resolveConfigVariables(config, context, logger)

        // 获取上游输入（通常是 LLM 的输出或用户输入）
        const upstreamNodes = context.getUpstreamNodes(nodeId)
        let inputText = ''

        // 从上游节点获取输入文本
        for (const upstreamId of upstreamNodes) {
            const outputs = context.variables.getNodeOutputs(upstreamId)
            if (outputs?.output) {
                // 如果是对象或数组，转换为 JSON 字符串
                if (typeof outputs.output === 'object') {
                    inputText = JSON.stringify(outputs.output)
                } else {
                    inputText = String(outputs.output)
                }
                break
            }
        }

        // 如果没有找到 output，尝试获取其他可能的输入
        if (!inputText) {
            for (const upstreamId of upstreamNodes) {
                const outputs = context.variables.getNodeOutputs(upstreamId)
                if (outputs) {
                    // 获取第一个字符串类型的输出
                    for (const value of Object.values(outputs)) {
                        if (typeof value === 'string' && value.length > 0) {
                            inputText = value
                            break
                        }
                    }
                    if (inputText) break
                }
            }
        }

        if (!inputText) {
            logger.warn('No input text found for intent recognition, using empty string')
            inputText = ''
        }

        logger.debug('Condition evaluation started', {
            inputText: inputText.substring(0, 200),
            intents: resolvedConfig.intents.map(i => i.name),
        })

        // 构建意图识别提示词
        const intentList = resolvedConfig.intents
            .map((intent, i) => {
                const desc = intent.description || intent.condition || ''
                return `${i + 1}. ${intent.name}${desc ? `: ${desc}` : ''}`
            })
            .join('\n')

        const systemPrompt = `你是一个意图识别助手。分析用户输入并识别其意图。
可能的意图列表：
${intentList}

请严格按照以下 JSON 格式返回，不要添加任何其他内容：
{"intent": "意图名称", "confidence": 0.95}

注意：
1. intent 必须完全匹配意图列表中的某个意图名称（不要添加或修改任何字符）
2. confidence 是 0 到 1 之间的数字，表示置信度
3. 只返回 JSON，不要包含任何解释或其他文本`

        const userPrompt = `请分析以下用户输入，判断其意图：

用户输入：${inputText}

请返回 JSON 格式的结果。`

        const startTime = Date.now()

        // 创建 Ollama 实例
        const llm = new ChatOllama({
            model: resolvedConfig.model,
            temperature: 0,
        })

        const response = await llm.invoke([new SystemMessage(systemPrompt), new HumanMessage(userPrompt)])

        const duration = Date.now() - startTime
        const content = response.content as string

        // 解析响应
        let matchedIntent = ''
        let confidence = 0

        try {
            // 尝试从响应中提取 JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                matchedIntent = parsed.intent || ''
                confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0
            }
        } catch {
            // 如果解析失败，尝试匹配意图名称
            for (const intent of resolvedConfig.intents) {
                if (content.includes(intent.name)) {
                    matchedIntent = intent.name
                    confidence = 0.5
                    break
                }
            }
        }

        // 如果没有匹配到任何意图，使用第一个作为默认
        if (!matchedIntent && resolvedConfig.intents.length > 0) {
            matchedIntent = resolvedConfig.intents[0].name
            confidence = 0.3
            logger.warn('No intent matched, using first intent as default', {
                defaultIntent: matchedIntent,
            })
        }

        // 找到匹配的意图索引
        const intentIndex = resolvedConfig.intents.findIndex(i => i.name === matchedIntent)
        const branchId = intentIndex >= 0 ? `intent-${intentIndex}` : undefined

        logger.debug('Condition evaluation completed', {
            matchedIntent,
            confidence,
            branchId,
            duration,
        })

        return {
            success: true,
            outputs: {
                matchedIntent,
                confidence,
            },
            matchedBranch: branchId,
            duration,
        }
    }

    override validate(config: ConditionNodeConfig): { valid: boolean; errors?: string[] } {
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

    override getOutputSchema(): OutputVariableSchema[] {
        return [
            { name: 'matchedIntent', type: 'string', description: '匹配到的意图名称' },
            { name: 'confidence', type: 'number', description: '匹配的置信度' },
        ]
    }
}
