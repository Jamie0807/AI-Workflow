export { NodeRegistry, createNodeRegistry } from './registry'
export { BaseNodeExecutor } from './base-executor'
export { StartExecutor } from './executors/start-executor'
export { LLMExecutor } from './executors/llm-executor'
export { HTTPExecutor } from './executors/http-executor'
export { ConditionExecutor } from './executors/condition-executor'
export { EndExecutor } from './executors/end-executor'
export { KnowledgeExecutor } from './executors/knowledge-executor'

import { ConditionExecutor } from './executors/condition-executor'
import { EndExecutor } from './executors/end-executor'
import { HTTPExecutor } from './executors/http-executor'
import { KnowledgeExecutor } from './executors/knowledge-executor'
import { LLMExecutor } from './executors/llm-executor'
import { StartExecutor } from './executors/start-executor'
import { NodeRegistry } from './registry'

/**
 * 创建默认注册中心（包含所有内置节点）
 */
export function createDefaultRegistry(): NodeRegistry {
    // 创建默认注册中心
    const registry = new NodeRegistry()

    // 注册内置节点执行器
    registry.register('start', new StartExecutor())
    registry.register('llm', new LLMExecutor())
    registry.register('http', new HTTPExecutor())
    registry.register('condition', new ConditionExecutor())
    registry.register('end', new EndExecutor())
    registry.register('knowledge', new KnowledgeExecutor())

    return registry
}
