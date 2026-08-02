'use client'

import type { NodeKind } from '@ai-workflow/ai-engine'
import type { Edge, Node } from '@xyflow/react'
import { HistoryIcon, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { ExecutionStatus } from '@/app/generated/prisma/enums'
import { DetailsTab } from '@/components/flow/test-run/tabs/details-tab'
import { ResultTab } from '@/components/flow/test-run/tabs/result-tab'
import { TraceTab } from '@/components/flow/test-run/tabs/trace-tab'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TestRunState } from '@/lib/types/test-run'

interface ExecutionDetail {
    id: string
    executionId: string
    status: ExecutionStatus
    inputs: Record<string, unknown> | null
    outputs: Record<string, unknown> | null
    error: string | null
    duration: number | null
    totalTokens: number
    nodeTraces: Record<string, NodeTraceRecord> | null
    startedAt: string
    completedAt: string | null
}

interface NodeTraceRecord {
    nodeId: string
    nodeName: string
    nodeType: string
    status: 'pending' | 'running' | 'success' | 'error'
    startTime?: string
    endTime?: string
    duration?: number
    inputs?: Record<string, unknown>
    outputs?: Record<string, unknown>
    error?: string
}

interface ExecutionDetailPanelProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    appId: string
    executionId: string | null
    nodes: Node[]
    edges: Edge[]
}

/**
 * Convert ExecutionDetail to TestRunState format
 */
function convertToTestRunState(detail: ExecutionDetail | null, nodes: Node[]): TestRunState {
    if (!detail) {
        return {
            status: 'idle',
            inputs: {},
            result: null,
            startTime: null,
            endTime: null,
            duration: 0,
            executionId: null,
            nodeTraces: new Map(),
            totalTokens: 0,
        }
    }

    // Create node map for getting node types
    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    // Convert nodeTraces from object to Map
    const nodeTracesMap = new Map<string, import('@/lib/types/test-run').NodeTraceInfo>()
    if (detail.nodeTraces) {
        Object.entries(detail.nodeTraces).forEach(([nodeId, trace]) => {
            const node = nodeMap.get(nodeId)
            nodeTracesMap.set(nodeId, {
                nodeId: trace.nodeId,
                nodeName: trace.nodeName,
                nodeType: (node?.type as NodeKind) || (trace.nodeType as NodeKind),
                status: trace.status,
                startTime: trace.startTime ? new Date(trace.startTime) : undefined,
                endTime: trace.endTime ? new Date(trace.endTime) : undefined,
                duration: trace.duration,
                inputs: trace.inputs,
                outputs: trace.outputs,
                error: trace.error,
                logs: [],
            })
        })
    }

    // Build WorkflowResult - create proper Error object
    let error = undefined
    if (detail.error) {
        const err = new Error(detail.error)
        err.name = 'ExecutionError'
        error = err
    }

    const result = {
        success: detail.status === 'SUCCESS',
        outputs: detail.outputs || {},
        executionId: detail.executionId,
        duration: detail.duration || 0,
        logs: [],
        ...(error && { error }),
    }

    return {
        status: detail.status === 'RUNNING' ? 'running' : detail.status === 'SUCCESS' ? 'success' : 'error',
        inputs: detail.inputs || {},
        result,
        startTime: new Date(detail.startedAt),
        endTime: detail.completedAt ? new Date(detail.completedAt) : null,
        duration: detail.duration || 0,
        executionId: detail.executionId,
        totalTokens: detail.totalTokens,
        nodeTraces: nodeTracesMap as any, // Type assertion to avoid incompatibility
    }
}

/**
 * Execution Detail Panel Component
 */
export function ExecutionDetailPanel({ open, onOpenChange, appId, executionId, nodes, edges }: ExecutionDetailPanelProps) {
    const [detail, setDetail] = useState<ExecutionDetail | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Fetch execution detail
    const fetchDetail = useCallback(async () => {
        if (!executionId) {
            setDetail(null)
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch(`/api/apps/${appId}/workflow/executions/${executionId}`)
            const data = await response.json()

            if (data.success) {
                setDetail(data.data)
            } else {
                toast.error(data.error || '获取执行详情失败')
            }
        } catch {
            toast.error('获取执行详情失败')
        } finally {
            setIsLoading(false)
        }
    }, [appId, executionId])

    // Fetch detail when panel opens or executionId changes
    useEffect(() => {
        if (open && executionId) {
            fetchDetail()
        }
    }, [open, executionId, fetchDetail])

    const handleClose = () => {
        onOpenChange(false)
    }

    if (!open) return null

    const testRunState = convertToTestRunState(detail, nodes)

    return (
        <div className="w-[420px] flex flex-col items-end max-h-screen">
            <div className="w-full bg-white rounded-md shadow-md flex flex-col max-h-[calc(100vh-80px)]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-lg p-2 shadow-sm">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HistoryIcon className="h-4 w-4" />}
                        </div>
                        <div>
                            <h3 className="text-sm font-medium">执行详情</h3>
                            <p className="text-xs text-muted-foreground">{detail?.executionId || '加载中...'}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={handleClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {isLoading && !detail ? (
                        <div className="flex items-center justify-center h-[calc(100vh-218px)]">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                            <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3 shrink-0">
                                <TabsTrigger value="details">详情</TabsTrigger>
                                <TabsTrigger value="result">结果</TabsTrigger>
                                <TabsTrigger value="trace">追踪</TabsTrigger>
                            </TabsList>

                            <ScrollArea className="h-[calc(100vh-218px)]">
                                <TabsContent value="details" className="px-4 py-4 mt-0">
                                    <DetailsTab state={testRunState} />
                                </TabsContent>

                                <TabsContent value="result" className="px-4 py-4 mt-0">
                                    <ResultTab result={testRunState.result} status={testRunState.status} />
                                </TabsContent>

                                <TabsContent value="trace" className="px-4 py-4 mt-0">
                                    <TraceTab nodeTraces={testRunState.nodeTraces} nodes={nodes} edges={edges} />
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    )
}
