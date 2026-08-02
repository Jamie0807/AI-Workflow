import type { NodeExecutor, NodeKind } from '../types'

/**
 * 节点注册中心
 * 实现插件化的节点类型注册机制
 */
export class NodeRegistry {
    private executors: Map<NodeKind, NodeExecutor> = new Map()

    /**
     * 注册节点执行器
     */
    register<T = Record<string, unknown>>(type: NodeKind, executor: NodeExecutor<T>): void {
        if (this.executors.has(type)) {
            // eslint-disable-next-line no-console
            console.warn(`[NodeRegistry] Node executor for type "${type}" is being overwritten`)
        }
        this.executors.set(type, executor as NodeExecutor)
    }

    /**
     * 获取节点执行器
     */
    get(type: NodeKind): NodeExecutor | undefined {
        return this.executors.get(type)
    }

    /**
     * 检查是否支持某节点类型
     */
    has(type: NodeKind): boolean {
        return this.executors.has(type)
    }

    /**
     * 获取所有已注册的节点类型
     */
    getRegisteredTypes(): NodeKind[] {
        return Array.from(this.executors.keys())
    }

    /**
     * 注销节点执行器
     */
    unregister(type: NodeKind): boolean {
        return this.executors.delete(type)
    }

    /**
     * 清空所有注册
     */
    clear(): void {
        this.executors.clear()
    }
}

/**
 * 创建节点注册中心
 */
export function createNodeRegistry(): NodeRegistry {
    return new NodeRegistry()
}
