import type { WorkflowDefinition, WorkflowNode } from '../types'

/**
 * 执行图构建器
 * 负责拓扑排序和分支选择
 */
export class GraphBuilder {
    private workflow: WorkflowDefinition
    private adjacencyList: Map<string, string[]>
    private reverseAdjacencyList: Map<string, string[]>
    private inDegree: Map<string, number>
    private excludedNodes: Set<string>

    constructor(workflow: WorkflowDefinition) {
        this.workflow = workflow
        this.adjacencyList = new Map()
        this.reverseAdjacencyList = new Map()
        this.inDegree = new Map()
        this.excludedNodes = new Set()

        this.buildGraph()
    }

    /**
     * 构建图结构
     */
    private buildGraph(): void {
        // 初始化节点
        for (const node of this.workflow.nodes) {
            this.adjacencyList.set(node.id, [])
            this.reverseAdjacencyList.set(node.id, [])
            this.inDegree.set(node.id, 0)
        }

        // 添加边
        for (const edge of this.workflow.edges) {
            const targets = this.adjacencyList.get(edge.source) || []
            targets.push(edge.target)
            this.adjacencyList.set(edge.source, targets)

            const sources = this.reverseAdjacencyList.get(edge.target) || []
            sources.push(edge.source)
            this.reverseAdjacencyList.set(edge.target, sources)

            const degree = this.inDegree.get(edge.target) || 0
            this.inDegree.set(edge.target, degree + 1)
        }
    }

    /**
     * 获取执行顺序（拓扑排序）
     * 排除被选中分支以外的节点
     * 如果有环，返回的顺序可能不完整，执行时会报错
     * 注意：执行顺序不一定唯一，可能有多个合法的拓扑排序结果
     * 实际执行时会根据这个顺序逐个执行节点，遇到条件节点时再动态选择分支并调整后续执行顺序
     */
    getExecutionOrder(): WorkflowNode[] {
        const result: WorkflowNode[] = []
        const visited = new Set<string>()
        // 使用队列进行 BFS，初始时将所有入度为0的节点加入队列
        const queue: string[] = []

        // 创建入度副本，因为后续会修改入度值来动态调整执行顺序
        const inDegreeCopy = new Map(this.inDegree)

        // 找到所有入度为0的节点（起始节点），并且不在排除列表中
        for (const [nodeId, degree] of inDegreeCopy) {
            if (degree === 0 && !this.excludedNodes.has(nodeId)) {
                queue.push(nodeId)
            }
        }
        // BFS 处理节点，每次处理一个节点后，更新其后续节点的入度，如果后续节点入度变为0且不在排除列表中，则加入队列
        while (queue.length > 0) {
            const nodeId = queue.shift()!
            // 跳过已访问或被排除的节点
            if (visited.has(nodeId) || this.excludedNodes.has(nodeId)) {
                continue
            }

            visited.add(nodeId)
            // 将节点添加到结果中
            const node = this.workflow.nodes.find(n => n.id === nodeId)
            if (node) {
                result.push(node)
            }

            // 更新后继节点的入度
            const successors = this.adjacencyList.get(nodeId) || []
            for (const successor of successors) {
                if (this.excludedNodes.has(successor)) continue
                // 入度减1
                const degree = inDegreeCopy.get(successor)! - 1
                inDegreeCopy.set(successor, degree)

                if (degree === 0) {
                    queue.push(successor)
                }
            }
        }

        return result
    }

    /**
     * 选择分支（用于条件节点）
     * 排除未选中分支的所有后续节点
     */
    selectBranch(conditionNodeId: string, selectedBranchId: string): void {
        const edges = this.workflow.edges.filter(e => e.source === conditionNodeId)

        for (const edge of edges) {
            // 如果不是选中的分支，排除该分支的所有后续节点
            if (edge.sourceHandle !== selectedBranchId) {
                this.excludeSubtree(edge.target)
            }
        }
    }

    /**
     * 排除子树（递归）
     */
    private excludeSubtree(nodeId: string): void {
        if (this.excludedNodes.has(nodeId)) return

        this.excludedNodes.add(nodeId)
        // 递归排除后续节点
        const successors = this.adjacencyList.get(nodeId) || []
        for (const successor of successors) {
            // 检查是否有其他未排除的入边
            const predecessors = this.reverseAdjacencyList.get(successor) || []
            const hasActiveInEdge = predecessors.some(p => !this.excludedNodes.has(p))

            if (!hasActiveInEdge) {
                this.excludeSubtree(successor)
            }
        }
    }

    /**
     * 获取上游节点
     */
    getUpstreamNodes(nodeId: string): string[] {
        return this.reverseAdjacencyList.get(nodeId) || []
    }

    /**
     * 获取所有上游节点（递归）
     */
    getAllUpstreamNodes(nodeId: string): string[] {
        const result = new Set<string>()
        const visited = new Set<string>()

        const dfs = (id: string) => {
            if (visited.has(id)) return
            visited.add(id)
            // 获取直接前驱节点
            const predecessors = this.reverseAdjacencyList.get(id) || []
            for (const pred of predecessors) {
                result.add(pred)
                dfs(pred)
            }
        }

        dfs(nodeId)
        return Array.from(result)
    }

    /**
     * 检查是否有环
     * 如果有环，执行时可能会出现死循环或无法完成的情况，所以在执行前必须调用这个方法进行校验
     * 如果 hasCycle() 返回 true，说明工作流定义有问题，需要修改工作流结构，确保没有环；
       如果返回 false，说明工作流结构合法，可以安全执行
     */
    hasCycle(): boolean {
        // 使用 DFS 检测环
        const visited = new Set<string>()
        const inStack = new Set<string>()

        // 递归函数
        const dfs = (nodeId: string): boolean => {
            if (inStack.has(nodeId)) return true
            if (visited.has(nodeId)) return false

            visited.add(nodeId)
            inStack.add(nodeId)

            // 遍历后继节点
            const successors = this.adjacencyList.get(nodeId) || []
            for (const successor of successors) {
                if (dfs(successor)) return true
            }

            inStack.delete(nodeId)
            return false
        }

        for (const node of this.workflow.nodes) {
            if (!visited.has(node.id)) {
                if (dfs(node.id)) return true
            }
        }

        return false
    }
}

/**
 * 创建图构建器实例
 */
export function createGraphBuilder(workflow: WorkflowDefinition): GraphBuilder {
    return new GraphBuilder(workflow)
}
