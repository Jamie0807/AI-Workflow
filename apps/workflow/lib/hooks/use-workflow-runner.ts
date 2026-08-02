'use client'

import type { ExecutionLogEntry, NodeKind } from '@ai-workflow/ai-engine'
import { useCallback, useRef, useState } from 'react'

import type {
    ErrorEventData,
    NodeEndEventData,
    NodeStartEventData,
    NodeTraceInfo,
    SSEEvent,
    TestRunState,
    WorkflowEndEventData,
    WorkflowStartEventData,
} from '@/lib/types/test-run'
import { createInitialTestRunState } from '@/lib/types/test-run'

interface FlowNode {
    id: string
    type: string
    position: { x: number; y: number }
    data?: {
        label?: string
        config?: Record<string, unknown>
    }
}

interface FlowEdge {
    id: string
    source: string
    sourceHandle?: string
    target: string
}

interface UseWorkflowRunnerOptions {
    appId: string
    nodes: FlowNode[]
    edges: FlowEdge[]
}

interface UseWorkflowRunnerReturn {
    state: TestRunState
    execute: (inputs: Record<string, unknown>) => Promise<void>
    reset: () => void
    isRunning: boolean
    abort: () => void
}

/**
 * Hook for executing workflows with real-time SSE updates
 */
export function useWorkflowRunner({ appId, nodes, edges }: UseWorkflowRunnerOptions): UseWorkflowRunnerReturn {
    const [state, setState] = useState<TestRunState>(createInitialTestRunState())
    const abortControllerRef = useRef<AbortController | null>(null)

    const execute = useCallback(
        async (inputs: Record<string, unknown>) => {
            // Abort any existing request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }

            // Create new abort controller
            abortControllerRef.current = new AbortController()

            // Initialize node traces based on nodes (set all to pending)
            const initialNodeTraces = new Map<string, NodeTraceInfo>()
            for (const node of nodes) {
                initialNodeTraces.set(node.id, {
                    nodeId: node.id,
                    nodeName: (node.data?.label as string) || node.id,
                    nodeType: node.type as NodeKind,
                    status: 'pending',
                    logs: [],
                })
            }

            // Set initial running state
            setState({
                status: 'running',
                inputs,
                result: null,
                startTime: new Date(),
                endTime: null,
                duration: 0,
                executionId: null,
                nodeTraces: initialNodeTraces,
                totalTokens: 0,
            })

            try {
                const response = await fetch(`/api/apps/${appId}/workflow/run`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ nodes, edges, inputs }),
                    signal: abortControllerRef.current.signal,
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.message || `HTTP ${response.status}`)
                }

                if (!response.body) {
                    throw new Error('No response body')
                }

                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })

                    // Process complete SSE messages
                    const lines = buffer.split('\n\n')
                    buffer = lines.pop() || '' // Keep incomplete message in buffer

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const eventData = JSON.parse(line.slice(6)) as SSEEvent
                                handleSSEEvent(eventData)
                            } catch {
                                // Ignore parse errors
                            }
                        }
                    }
                }

                // Process any remaining buffer
                if (buffer.startsWith('data: ')) {
                    try {
                        const eventData = JSON.parse(buffer.slice(6)) as SSEEvent
                        handleSSEEvent(eventData)
                    } catch {
                        // Ignore parse errors
                    }
                }
            } catch (error) {
                if ((error as Error).name === 'AbortError') {
                    // Request was aborted, don't update state
                    return
                }

                setState(prev => ({
                    ...prev,
                    status: 'error',
                    endTime: new Date(),
                    duration: prev.startTime ? Date.now() - prev.startTime.getTime() : 0,
                    result: {
                        success: false,
                        outputs: {},
                        error: error instanceof Error ? error : new Error(String(error)),
                        executionId: prev.executionId || '',
                        duration: prev.startTime ? Date.now() - prev.startTime.getTime() : 0,
                        logs: [],
                    },
                }))
            }
        },
        [appId, nodes, edges]
    )

    const handleSSEEvent = useCallback((event: SSEEvent) => {
        switch (event.type) {
            case 'workflow:start': {
                const data = event.data as WorkflowStartEventData
                setState(prev => ({
                    ...prev,
                    executionId: data.executionId,
                }))
                break
            }

            case 'node:start': {
                const data = event.data as NodeStartEventData
                setState(prev => {
                    const newTraces = new Map(prev.nodeTraces)
                    const existing = newTraces.get(data.nodeId)
                    newTraces.set(data.nodeId, {
                        nodeId: data.nodeId,
                        nodeName: data.nodeName,
                        nodeType: data.nodeType,
                        status: 'running',
                        startTime: new Date(event.timestamp),
                        logs: existing?.logs || [],
                    })
                    return { ...prev, nodeTraces: newTraces }
                })
                break
            }

            case 'node:end': {
                const data = event.data as NodeEndEventData
                setState(prev => {
                    const newTraces = new Map(prev.nodeTraces)
                    const existing = newTraces.get(data.nodeId)
                    if (existing) {
                        newTraces.set(data.nodeId, {
                            ...existing,
                            status: data.success ? 'success' : 'error',
                            endTime: new Date(event.timestamp),
                            duration: data.duration,
                            inputs: data.inputs,
                            outputs: data.outputs,
                            error: data.error?.message,
                        })
                    }
                    return { ...prev, nodeTraces: newTraces }
                })
                break
            }

            case 'log': {
                const logData = event.data as ExecutionLogEntry & { timestamp: string }
                if (logData.nodeId) {
                    setState(prev => {
                        const newTraces = new Map(prev.nodeTraces)
                        const existing = newTraces.get(logData.nodeId!)
                        if (existing) {
                            newTraces.set(logData.nodeId!, {
                                ...existing,
                                logs: [
                                    ...existing.logs,
                                    {
                                        ...logData,
                                        timestamp: new Date(logData.timestamp),
                                    },
                                ],
                            })
                        }
                        return { ...prev, nodeTraces: newTraces }
                    })
                }
                break
            }

            case 'workflow:end': {
                const data = event.data as WorkflowEndEventData
                setState(prev => ({
                    ...prev,
                    status: data.success ? 'success' : 'error',
                    endTime: new Date(event.timestamp),
                    duration: data.duration,
                    totalTokens: data.totalTokens || 0,
                    result: {
                        success: data.success,
                        outputs: data.outputs,
                        error: data.error ? new Error(data.error) : undefined,
                        executionId: prev.executionId || '',
                        duration: data.duration,
                        logs: [],
                    },
                }))
                break
            }

            case 'error': {
                const data = event.data as ErrorEventData
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    endTime: new Date(event.timestamp),
                    duration: prev.startTime ? Date.now() - prev.startTime.getTime() : 0,
                    result: {
                        success: false,
                        outputs: {},
                        error: new Error(data.message),
                        executionId: prev.executionId || '',
                        duration: prev.startTime ? Date.now() - prev.startTime.getTime() : 0,
                        logs: [],
                    },
                }))
                break
            }
        }
    }, [])

    const reset = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setState(createInitialTestRunState())
    }, [])

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setState(prev => ({
            ...prev,
            status: 'error',
            endTime: new Date(),
            duration: prev.startTime ? Date.now() - prev.startTime.getTime() : 0,
        }))
    }, [])

    return {
        state,
        execute,
        reset,
        isRunning: state.status === 'running',
        abort,
    }
}
