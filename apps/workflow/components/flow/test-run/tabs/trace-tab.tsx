'use client'

import type { ExecutionLogEntry, NodeKind } from '@ai-workflow/ai-engine'
import type { Edge, Node } from '@xyflow/react'
import { AlertCircleIcon, CheckCircle2Icon, ChevronDownIcon, ClockIcon, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { getColor, ICON_MAP } from '@/components/flow/icon-map'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { NodeTraceInfo, NodeTraceStatus } from '@/lib/types/test-run'
import { cn } from '@/lib/utils'

interface TraceTabProps {
    nodeTraces: Map<string, NodeTraceInfo>
    nodes: Node[]
    edges: Edge[]
}

/**
 * Format duration
 */
function formatDuration(ms?: number): string {
    if (ms === undefined) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Status icon component
 */
function StatusIcon({ status }: { status: NodeTraceStatus }) {
    switch (status) {
        case 'running':
            return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
        case 'success':
            return <CheckCircle2Icon className="h-3 w-3 text-green-500" />
        case 'error':
            return <AlertCircleIcon className="h-3 w-3 text-red-500" />
        default:
            return <ClockIcon className="h-3 w-3 text-gray-400" />
    }
}

/**
 * Log level badge
 */
function LogLevelBadge({ level }: { level: ExecutionLogEntry['level'] }) {
    const colors: Record<string, string> = {
        debug: 'bg-gray-100 text-gray-600',
        info: 'bg-blue-100 text-blue-600',
        warn: 'bg-yellow-100 text-yellow-600',
        error: 'bg-red-100 text-red-600',
    }
    return <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${colors[level] || colors.info}`}>{level}</span>
}

/**
 * Node type icon component
 */
function NodeTypeIcon({ type }: { type: NodeKind }) {
    const Icon = ICON_MAP[type] || ICON_MAP.llm
    const colorClass = getColor(type) || 'bg-gray-700'

    return (
        <div className={cn('rounded p-1', colorClass)}>
            <Icon className="h-3 w-3 text-white" />
        </div>
    )
}

/**
 * Detail section component
 */
function DetailSection({ label, children, badge }: { label: string; children: React.ReactNode; badge?: React.ReactNode }) {
    return (
        <div className="overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                {badge}
            </div>
            {children}
        </div>
    )
}

/**
 * Node Trace Item Component
 */
function NodeTraceItem({ trace, nodeType }: { trace: NodeTraceInfo; nodeType: NodeKind }) {
    const [isOpen, setIsOpen] = useState(false)

    const hasDetails =
        (trace.inputs && Object.keys(trace.inputs).length > 0) ||
        (trace.outputs && Object.keys(trace.outputs).length > 0) ||
        trace.error ||
        (trace.logs && trace.logs.length > 0)

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="rounded-md overflow-hidden shadow-md">
                <CollapsibleTrigger asChild>
                    <button
                        className="flex items-center justify-between w-full px-2 py-1.5 text-left hover:bg-black/5 transition-colors"
                        disabled={!hasDetails}
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <NodeTypeIcon type={nodeType} />
                            <span className="text-sm font-medium truncate">{trace.nodeName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {trace.duration !== undefined && (
                                <span className="text-xs text-muted-foreground">{formatDuration(trace.duration)}</span>
                            )}
                            <StatusIcon status={trace.status} />
                            {hasDetails && (
                                <ChevronDownIcon
                                    className={cn('h-3 w-3 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                                />
                            )}
                        </div>
                    </button>
                </CollapsibleTrigger>

                {hasDetails && (
                    <CollapsibleContent>
                        <div className="bg-muted/30 p-2 space-y-2">
                            {/* Error */}
                            {trace.error && (
                                <DetailSection label="错误">
                                    <div className="bg-red-50 border border-red-200 rounded p-2 overflow-hidden">
                                        <p className="text-xs font-mono text-red-600 break-all">{trace.error}</p>
                                    </div>
                                </DetailSection>
                            )}

                            {/* Inputs */}
                            {trace.inputs && Object.keys(trace.inputs).length > 0 && (
                                <DetailSection
                                    label="输入"
                                    badge={<span className="text-xs text-muted-foreground">({Object.keys(trace.inputs).length})</span>}
                                >
                                    <pre className="text-xs font-mono bg-white p-2 rounded border overflow-auto max-h-[150px] whitespace-pre-wrap break-all">
                                        {JSON.stringify(trace.inputs, null, 2)}
                                    </pre>
                                </DetailSection>
                            )}

                            {/* Outputs */}
                            {trace.outputs && Object.keys(trace.outputs).length > 0 && (
                                <DetailSection
                                    label="输出"
                                    badge={<span className="text-xs text-muted-foreground">({Object.keys(trace.outputs).length})</span>}
                                >
                                    <pre className="text-xs font-mono bg-white p-2 rounded border overflow-auto max-h-[150px] whitespace-pre-wrap break-all">
                                        {JSON.stringify(trace.outputs, null, 2)}
                                    </pre>
                                </DetailSection>
                            )}

                            {/* Logs */}
                            {trace.logs && trace.logs.length > 0 && (
                                <DetailSection
                                    label="日志"
                                    badge={<span className="text-xs text-muted-foreground">({trace.logs.length})</span>}
                                >
                                    <div className="space-y-1 max-h-[120px] overflow-auto">
                                        {trace.logs.map((log, idx) => (
                                            <div
                                                key={idx}
                                                className="text-xs font-mono bg-white p-1.5 rounded border flex gap-2 items-start"
                                            >
                                                <LogLevelBadge level={log.level} />
                                                <span className="flex-1 break-all">{log.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </DetailSection>
                            )}
                        </div>
                    </CollapsibleContent>
                )}
            </div>
        </Collapsible>
    )
}

/**
 * Compute topological order of nodes based on edges
 * This gives us the execution order of the workflow
 */
function getExecutionOrder(nodes: Node[], edges: Edge[]): Node[] {
    // Build adjacency list and in-degree count
    const inDegree = new Map<string, number>()
    const adjacency = new Map<string, string[]>()
    const nodeSet = new Set(nodes.map(n => n.id))

    // Initialize all nodes with in-degree 0
    for (const node of nodes) {
        inDegree.set(node.id, 0)
        adjacency.set(node.id, [])
    }

    // Build graph from edges
    for (const edge of edges) {
        if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
            const targets = adjacency.get(edge.source) || []
            targets.push(edge.target)
            adjacency.set(edge.source, targets)
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
        }
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = []
    const result: Node[] = []

    // Start with nodes that have no incoming edges
    for (const [nodeId, degree] of inDegree) {
        if (degree === 0) {
            queue.push(nodeId)
        }
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    while (queue.length > 0) {
        const nodeId = queue.shift()!
        const node = nodeMap.get(nodeId)
        if (node) {
            result.push(node)
        }

        // Reduce in-degree for neighbors
        const neighbors = adjacency.get(nodeId) || []
        for (const neighbor of neighbors) {
            const newDegree = (inDegree.get(neighbor) || 0) - 1
            inDegree.set(neighbor, newDegree)
            if (newDegree === 0) {
                queue.push(neighbor)
            }
        }
    }

    return result
}

/**
 * Trace Tab Component
 * Displays real-time node execution traces in workflow execution order
 */
export function TraceTab({ nodeTraces, nodes, edges }: TraceTabProps) {
    // Order traces based on workflow execution order (topological sort)
    const orderedTraces = useMemo(() => {
        // Use topological sort to get execution order
        const sortedNodes = getExecutionOrder(nodes, edges)

        const traces: Array<{ trace: NodeTraceInfo; nodeType: NodeKind }> = []

        for (const node of sortedNodes) {
            const trace = nodeTraces.get(node.id)
            if (trace) {
                traces.push({
                    trace,
                    nodeType: node.type as NodeKind,
                })
            }
        }

        return traces
    }, [nodeTraces, nodes, edges])

    // Calculate summary stats
    const stats = useMemo(() => {
        let pending = 0
        let running = 0
        let success = 0
        let error = 0

        for (const { trace } of orderedTraces) {
            switch (trace.status) {
                case 'pending':
                    pending++
                    break
                case 'running':
                    running++
                    break
                case 'success':
                    success++
                    break
                case 'error':
                    error++
                    break
            }
        }

        return { pending, running, success, error, total: orderedTraces.length }
    }, [orderedTraces])

    if (orderedTraces.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">运行工作流后查看执行追踪</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Summary */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
                <span>
                    共 <strong className="text-foreground">{stats.total}</strong> 个节点
                </span>
                {stats.success > 0 && (
                    <span className="flex items-center gap-1">
                        <CheckCircle2Icon className="h-3 w-3 text-green-500" />
                        {stats.success}
                    </span>
                )}
                {stats.running > 0 && (
                    <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                        {stats.running}
                    </span>
                )}
                {stats.error > 0 && (
                    <span className="flex items-center gap-1">
                        <AlertCircleIcon className="h-3 w-3 text-red-500" />
                        {stats.error}
                    </span>
                )}
                {stats.pending > 0 && (
                    <span className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3 text-gray-400" />
                        {stats.pending}
                    </span>
                )}
            </div>

            {/* Node Traces */}
            <div className="space-y-1.5">
                {orderedTraces.map(({ trace, nodeType }) => (
                    <NodeTraceItem key={trace.nodeId} trace={trace} nodeType={nodeType} />
                ))}
            </div>
        </div>
    )
}
