'use client'

import type { Edge, Node } from '@xyflow/react'
import { Loader2, PlayIcon, X } from 'lucide-react'
import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkflowRunner } from '@/lib/hooks/use-workflow-runner'
import type { TestRunState } from '@/lib/types/test-run'

import type { StartNodeConfig } from '../settings/forms/start-settings-form'
import { DetailsTab } from './tabs/details-tab'
import { InputTab } from './tabs/input-tab'
import { ResultTab } from './tabs/result-tab'
import { TraceTab } from './tabs/trace-tab'

interface TestRunPanelProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    appId: string
    nodes: Node[]
    edges: Edge[]
}

/**
 * Format time for display
 */
function formatTime(date: Date | null): string {
    if (!date) return ''
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/**
 * Get subtitle based on status
 */
function getSubtitle(state: TestRunState): string | null {
    switch (state.status) {
        case 'running':
            return '运行中...'
        case 'success':
        case 'error':
            return formatTime(state.startTime)
        default:
            return null
    }
}

/**
 * Test Run Panel Component
 * Displays a panel on the right side for testing workflow execution
 */
export function TestRunPanel({ open, onOpenChange, appId, nodes, edges }: TestRunPanelProps) {
    const { state, execute, reset, isRunning, abort } = useWorkflowRunner({
        appId,
        nodes: nodes as any,
        edges: edges as any,
    })

    // Get start node config to render input form
    const startNodeConfig = useMemo(() => {
        const startNode = nodes.find(n => n.type === 'start')
        if (!startNode) return null
        return (startNode.data?.config as StartNodeConfig) || { inputs: [] }
    }, [nodes])

    const handleRun = async (inputs: Record<string, unknown>) => {
        await execute(inputs)
    }

    const handleClose = () => {
        if (isRunning) {
            abort()
        }
        onOpenChange(false)
    }

    const handleReset = () => {
        reset()
    }

    if (!open) return null

    const subtitle = getSubtitle(state)

    return (
        <div className="w-[420px] flex flex-col items-end max-h-screen">
            <div className="w-full bg-white rounded-md shadow-md flex flex-col max-h-[calc(100vh-80px)]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg p-2 shadow-sm">
                            <PlayIcon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col justify-center h-9">
                            <h3 className="text-sm font-medium">测试运行</h3>
                            {subtitle && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={handleClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="input" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="mx-4 mt-3 grid w-auto grid-cols-4 shrink-0">
                        <TabsTrigger value="input">输入</TabsTrigger>
                        <TabsTrigger value="result" disabled={state.status === 'idle'}>
                            结果
                        </TabsTrigger>
                        <TabsTrigger value="details" disabled={state.status === 'idle'}>
                            详情
                        </TabsTrigger>
                        <TabsTrigger value="trace" disabled={state.status === 'idle'}>
                            追踪
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-[calc(100vh-218px)]">
                            <TabsContent value="input" className="px-4 py-4 mt-0">
                                <InputTab
                                    startNodeConfig={startNodeConfig}
                                    onRun={handleRun}
                                    isRunning={isRunning}
                                    onReset={handleReset}
                                    hasResult={state.status !== 'idle'}
                                />
                            </TabsContent>

                            <TabsContent value="result" className="px-4 py-4 mt-0">
                                <ResultTab result={state.result} status={state.status} />
                            </TabsContent>

                            <TabsContent value="details" className="px-4 py-4 mt-0">
                                <DetailsTab state={state} />
                            </TabsContent>

                            <TabsContent value="trace" className="px-4 py-4 mt-0">
                                <TraceTab nodeTraces={state.nodeTraces} nodes={nodes} edges={edges} />
                            </TabsContent>
                        </ScrollArea>
                    </div>
                </Tabs>
            </div>
        </div>
    )
}
