'use client'

import { AlertCircleIcon, CheckCircleIcon, ChevronDownIcon, CircleIcon, LoaderIcon } from 'lucide-react'
import { useState } from 'react'

import type { ExecutionState, NodeExecution, NodeStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ExecutionPanelProps {
    execution: ExecutionState
}

const TEXT_OUTPUT_KEYS = ['translation', 'result', 'output', 'content', 'text', 'answer']

function getPrimaryTextOutput(outputs: Record<string, unknown> | undefined): string | null {
    if (!outputs) return null

    for (const key of TEXT_OUTPUT_KEYS) {
        const value = outputs[key]
        if (typeof value === 'string' && value.trim()) {
            return value
        }
    }

    const entries = Object.entries(outputs)
    if (entries.length === 1 && typeof entries[0][1] === 'string') {
        return entries[0][1]
    }

    return null
}

// 节点图标映射
const nodeTypeIcons: Record<string, string> = {
    start: '🚀',
    end: '🏁',
    llm: '🤖',
    http: '🌐',
    condition: '🔀',
    code: '💻',
}

// 状态图标组件
function StatusIcon({ status }: { status: NodeStatus }) {
    switch (status) {
        case 'success':
            return <CheckCircleIcon className="size-4 text-green-500" />
        case 'running':
            return <LoaderIcon className="size-4 animate-spin text-blue-500" />
        case 'error':
            return <AlertCircleIcon className="size-4 text-red-500" />
        default:
            return <CircleIcon className="size-4 text-muted-foreground/30" />
    }
}

// 单个节点状态行
function NodeStatusRow({ node }: { node: NodeExecution }) {
    const icon = nodeTypeIcons[node.nodeType] || '📦'

    return (
        <div
            className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2',
                node.status === 'running' && 'bg-blue-50',
                node.status === 'error' && 'bg-red-50'
            )}
        >
            <div className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <span className="text-sm font-medium">{node.nodeName || node.nodeId}</span>
            </div>
            <div className="flex items-center gap-2">
                {node.duration !== undefined && <span className="text-muted-foreground text-xs">{node.duration}ms</span>}
                <StatusIcon status={node.status} />
            </div>
        </div>
    )
}

export function ExecutionPanel({ execution }: ExecutionPanelProps) {
    const [expanded, setExpanded] = useState(true)
    const primaryTextOutput = getPrimaryTextOutput(execution.outputs)

    // 计算状态摘要
    const summary = {
        total: execution.nodes.length,
        success: execution.nodes.filter(n => n.status === 'success').length,
        running: execution.nodes.filter(n => n.status === 'running').length,
        error: execution.nodes.filter(n => n.status === 'error').length,
    }

    // 面板标题颜色
    const panelColor =
        execution.status === 'error'
            ? 'border-red-200 bg-red-50'
            : execution.status === 'success'
              ? 'border-green-200 bg-green-50'
              : execution.status === 'running'
                ? 'border-blue-200 bg-blue-50'
                : 'border-muted bg-muted/30'

    return (
        <div className={cn('overflow-hidden rounded-xl border', panelColor)}>
            {/* 标题栏 */}
            <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                <div className="flex items-center gap-2">
                    {execution.status === 'running' && <LoaderIcon className="size-4 animate-spin text-blue-500" />}
                    {execution.status === 'success' && <CheckCircleIcon className="size-4 text-green-500" />}
                    {execution.status === 'error' && <AlertCircleIcon className="size-4 text-red-500" />}
                    {execution.status === 'idle' && <CircleIcon className="size-4 text-muted-foreground" />}
                    <span className="font-medium">工作流</span>
                    {execution.nodes.length > 0 && (
                        <span className="text-muted-foreground text-sm">
                            ({summary.success}/{summary.total})
                        </span>
                    )}
                </div>
                <ChevronDownIcon className={cn('size-5 transition-transform', expanded && 'rotate-180')} />
            </button>

            {/* 节点列表 */}
            {expanded && (
                <div className="space-y-1 bg-white/50 p-2">
                    {execution.nodes.length === 0 ? (
                        <div className="text-muted-foreground px-3 py-4 text-center text-sm">点击"运行"开始执行</div>
                    ) : (
                        execution.nodes.map(node => <NodeStatusRow key={node.nodeId} node={node} />)
                    )}
                </div>
            )}

            {/* 执行结果 */}
            {execution.status === 'success' && execution.outputs && (
                <div className="border-t bg-white/80 p-4">
                    <h4 className="mb-2 text-sm font-medium">输出结果</h4>
                    {primaryTextOutput ? (
                        <div className="rounded-lg bg-muted/50 p-3 text-sm leading-7 whitespace-pre-wrap break-words">
                            {primaryTextOutput}
                        </div>
                    ) : (
                        <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-wrap break-words">
                            {JSON.stringify(execution.outputs, null, 2)}
                        </pre>
                    )}
                </div>
            )}

            {/* 错误信息 */}
            {execution.status === 'error' && execution.error && (
                <div className="border-t bg-red-50/50 p-4">
                    <h4 className="mb-2 text-sm font-medium text-red-600">错误信息</h4>
                    <p className="text-sm text-red-600">{execution.error}</p>
                </div>
            )}

            {/* 执行时间 */}
            {execution.duration !== undefined && (
                <div className="text-muted-foreground border-t bg-white/50 px-4 py-2 text-right text-xs">
                    总耗时: {execution.duration}ms
                </div>
            )}
        </div>
    )
}
