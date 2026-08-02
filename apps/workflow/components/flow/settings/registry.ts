import {
    ConditionSettingsForm,
    EndSettingsForm,
    HttpSettingsForm,
    KnowledgeSettingsForm,
    LLMSettingsForm,
    StartSettingsForm,
} from './forms'
import { NodeKind, NodeSettingsFormComponent, NodeSettingsStrategy } from './types'

/**
 * 节点设置表单注册器 - 策略模式实现
 */
class NodeSettingsRegistry implements NodeSettingsStrategy {
    private strategies: Map<NodeKind, NodeSettingsFormComponent>

    constructor() {
        this.strategies = new Map()
    }

    /**
     * 注册节点类型的设置表单组件
     */
    register(nodeType: NodeKind, component: NodeSettingsFormComponent): void {
        this.strategies.set(nodeType, component)
    }

    /**
     * 获取指定节点类型的设置表单组件
     */
    getFormComponent(nodeType: NodeKind): NodeSettingsFormComponent | null {
        return this.strategies.get(nodeType) || null
    }

    /**
     * 检查是否支持该节点类型
     */
    supports(nodeType: NodeKind): boolean {
        return this.strategies.has(nodeType)
    }

    /**
     * 获取所有已注册的节点类型
     */
    getRegisteredTypes(): NodeKind[] {
        return Array.from(this.strategies.keys())
    }
}

// 创建全局单例
export const nodeSettingsRegistry = new NodeSettingsRegistry()

// 注册所有节点类型的设置表单
nodeSettingsRegistry.register('start', StartSettingsForm)
nodeSettingsRegistry.register('llm', LLMSettingsForm)
nodeSettingsRegistry.register('http', HttpSettingsForm)
nodeSettingsRegistry.register('condition', ConditionSettingsForm)
nodeSettingsRegistry.register('end', EndSettingsForm)
nodeSettingsRegistry.register('knowledge', KnowledgeSettingsForm)
