'use client'

import { PlayIcon, RotateCcwIcon } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { ExecutionState, InputField, NodeExecution, SSEEvent } from '@/lib/types'
import { cn } from '@/lib/utils'

import { ExecutionPanel } from './execution-panel'

interface WorkflowRunnerProps {
    appId: string
    appName: string
    appIcon: string
    inputs: InputField[]
}

// Initial execution state
const initialExecutionState: ExecutionState = {
    executionId: null,
    status: 'idle',
    nodes: [],
}

export function WorkflowRunner({ appId, appName, appIcon, inputs }: WorkflowRunnerProps) {
    const [inputValues, setInputValues] = useState<Record<string, string | number>>({})
    const [execution, setExecution] = useState<ExecutionState>(initialExecutionState)
    const cancelRef = useRef<(() => void) | null>(null)

    // Update input value
    const updateInput = (name: string, value: string | number) => {
        setInputValues(prev => ({ ...prev, [name]: value }))
    }

    // Clear inputs
    const clearInputs = () => {
        setInputValues({})
        setExecution(initialExecutionState)
    }

    // Handle SSE events
    const handleEvent = useCallback((event: SSEEvent) => {
        switch (event.type) {
            case 'node:start':
                setExecution(prev => {
                    const existingNode = prev.nodes.find(n => n.nodeId === event.data.nodeId)
                    if (existingNode) {
                        return {
                            ...prev,
                            nodes: prev.nodes.map(n => (n.nodeId === event.data.nodeId ? { ...n, status: 'running' as const } : n)),
                        }
                    }
                    const newNode: NodeExecution = {
                        nodeId: event.data.nodeId,
                        nodeType: event.data.nodeType,
                        nodeName: event.data.nodeName,
                        status: 'running',
                    }
                    return {
                        ...prev,
                        executionId: event.data.executionId,
                        nodes: [...prev.nodes, newNode],
                    }
                })
                break

            case 'node:end':
                setExecution(prev => ({
                    ...prev,
                    nodes: prev.nodes.map(n =>
                        n.nodeId === event.data.nodeId
                            ? {
                                  ...n,
                                  status: event.data.success ? ('success' as const) : ('error' as const),
                                  outputs: event.data.outputs,
                                  duration: event.data.duration,
                              }
                            : n
                    ),
                }))
                break

            case 'complete':
                setExecution(prev => ({
                    ...prev,
                    status: event.data.status === 'SUCCESS' ? 'success' : 'error',
                    outputs: event.data.outputs,
                    duration: event.data.duration,
                }))
                break

            case 'error':
                setExecution(prev => ({
                    ...prev,
                    status: 'error',
                    error: event.data.message,
                    duration: event.data.duration,
                }))
                toast.error(event.data.message)
                break
        }
    }, [])

    // Run workflow
    const handleRun = async () => {
        // Reset state
        setExecution({
            executionId: null,
            status: 'running',
            nodes: [],
        })

        // Build input parameters
        const workflowInputs: Record<string, unknown> = {}
        for (const field of inputs) {
            const value = inputValues[field.name]
            if (field.type === 'number' && typeof value === 'string') {
                workflowInputs[field.name] = parseFloat(value) || 0
            } else {
                workflowInputs[field.name] = value ?? ''
            }
        }

        const controller = new AbortController()
        cancelRef.current = () => controller.abort()

        try {
            const response = await fetch(`/api/workflow/${appId}/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: workflowInputs }),
                signal: controller.signal,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `请求失败: ${response.status}`)
            }

            const reader = response.body?.getReader()
            if (!reader) {
                throw new Error('无法获取响应流')
            }

            const decoder = new TextDecoder()
            let buffer = ''

            // Read SSE stream
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // Parse SSE events
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                let eventType: string | null = null
                let eventData: string | null = null

                for (const line of lines) {
                    if (line.startsWith('event:')) {
                        eventType = line.slice(6).trim()
                    } else if (line.startsWith('data:')) {
                        eventData = line.slice(5).trim()
                    } else if (line === '' && eventType && eventData) {
                        try {
                            const data = JSON.parse(eventData)
                            handleEvent({ type: eventType, data } as SSEEvent)
                        } catch {
                            // Ignore parse errors
                        }
                        eventType = null
                        eventData = null
                    }
                }
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                toast.error((error as Error).message)
                setExecution(prev => ({
                    ...prev,
                    status: 'error',
                    error: (error as Error).message,
                }))
            }
        }
    }

    const isRunning = execution.status === 'running'

    return (
        <div className="flex min-h-screen">
            {/* Left: Input area */}
            <div className="flex w-165 shrink-0 flex-col border-r bg-white p-8">
                {/* App title */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 text-lg">
                        {appIcon}
                    </div>
                    <h1 className="text-lg font-semibold">{appName}</h1>
                </div>

                {/* Input form */}
                <div className="flex-1 space-y-4">
                    {inputs.map(field => (
                        <div key={field.name}>
                            <label className="mb-1.5 block text-sm font-medium">{field.label || field.name}</label>
                            {field.type === 'number' ? (
                                <input
                                    type="number"
                                    value={inputValues[field.name] ?? ''}
                                    onChange={e => updateInput(field.name, e.target.value)}
                                    className="w-full rounded-lg border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                    disabled={isRunning}
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={inputValues[field.name] ?? ''}
                                    onChange={e => updateInput(field.name, e.target.value)}
                                    className="w-full rounded-lg border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                    disabled={isRunning}
                                />
                            )}
                        </div>
                    ))}

                    {inputs.length === 0 && (
                        <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                            此工作流没有输入参数
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div className="mt-8 flex items-center justify-between">
                    <button
                        onClick={clearInputs}
                        disabled={isRunning}
                        className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                    >
                        <RotateCcwIcon className="size-4" />
                        清空
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors',
                            isRunning ? 'bg-blue-400' : 'bg-primary hover:bg-primary/90'
                        )}
                    >
                        <PlayIcon className="size-4" />
                        {isRunning ? '运行中...' : '运行'}
                    </button>
                </div>
            </div>

            {/* Right: Execution status */}
            <div className="flex w-full flex-col bg-gradient-to-br from-violet-50 to-blue-50 p-8">
                <ExecutionPanel execution={execution} />
            </div>
        </div>
    )
}
