import { createWorkflowEngine, NodeKind, WorkflowDefinition } from '@ai-workflow/ai-engine'
import { NextRequest } from 'next/server'

import { ExecutionStatus } from '@/app/generated/prisma/enums'
import { apiError, ErrorCode } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type {
    ErrorEventData,
    NodeEndEventData,
    NodeStartEventData,
    SSEEvent,
    WorkflowEndEventData,
    WorkflowStartEventData,
} from '@/lib/types/test-run'

// NodeTrace for storing in database
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

// ============================================================
// Types
// ============================================================

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

interface RunWorkflowRequest {
    nodes: FlowNode[]
    edges: FlowEdge[]
    inputs: Record<string, unknown>
}

// ============================================================
// POST /api/apps/[id]/workflow/run - Execute workflow with SSE
// ============================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: appId } = await params
        const userId = await getCurrentUserId()

        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED, '请先登录')
        }

        // Verify app ownership
        const app = await prisma.app.findFirst({
            where: {
                id: appId,
                userId,
                isDeleted: false,
            },
        })

        if (!app) {
            return apiError(ErrorCode.APP_NOT_FOUND, '应用不存在')
        }

        const body = (await request.json()) as RunWorkflowRequest
        const { nodes, edges, inputs } = body

        if (!nodes || !Array.isArray(nodes)) {
            return apiError(ErrorCode.VALIDATION_ERROR, '节点数据格式错误')
        }

        if (!edges || !Array.isArray(edges)) {
            return apiError(ErrorCode.VALIDATION_ERROR, '边数据格式错误')
        }

        // Convert to ai-engine WorkflowDefinition format
        const workflow: WorkflowDefinition = {
            id: `test-${appId}-${Date.now()}`,
            name: `${app.name} - 测试运行`,
            nodes: nodes.map(n => ({
                id: n.id,
                type: n.type as NodeKind,
                data: {
                    label: n.data?.label,
                    config: n.data?.config,
                },
            })),
            edges: edges.map(e => ({
                id: e.id,
                source: e.source,
                sourceHandle: e.sourceHandle,
                target: e.target,
            })),
        }

        // Create SSE stream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()

                // Helper to send SSE events
                const send = <T>(event: SSEEvent<T>) => {
                    try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
                    } catch {
                        // Controller might be closed
                    }
                }

                const startTime = Date.now()
                let totalTokens = 0
                const nodeTraces: Record<string, NodeTraceRecord> = {}

                // Generate execution ID
                const executionId = `exec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`

                // Create execution record in database
                const execution = await prisma.workflowExecution.create({
                    data: {
                        executionId,
                        status: ExecutionStatus.RUNNING,
                        inputs: inputs as object,
                        appId,
                        startedAt: new Date(),
                    },
                })

                try {
                    const engine = createWorkflowEngine({ verbose: true })

                    // Send workflow start event
                    send<WorkflowStartEventData>({
                        type: 'workflow:start',
                        data: { executionId },
                        timestamp: new Date().toISOString(),
                    })

                    // Execute workflow with callbacks
                    const result = await engine.execute(workflow, inputs, {
                        onNodeStart: (nodeId, nodeType, nodeName) => {
                            // Track node trace
                            nodeTraces[nodeId] = {
                                nodeId,
                                nodeName: nodeName || nodeId,
                                nodeType,
                                status: 'running',
                                startTime: new Date().toISOString(),
                            }

                            send<NodeStartEventData>({
                                type: 'node:start',
                                data: { nodeId, nodeType, nodeName },
                                timestamp: new Date().toISOString(),
                            })
                        },
                        onNodeEnd: (nodeId, nodeResult) => {
                            // Track tokens if available
                            if (nodeResult.outputs?.tokens && typeof nodeResult.outputs.tokens === 'number') {
                                totalTokens += nodeResult.outputs.tokens
                            }

                            // Update node trace
                            if (nodeTraces[nodeId]) {
                                nodeTraces[nodeId].status = nodeResult.success ? 'success' : 'error'
                                nodeTraces[nodeId].endTime = new Date().toISOString()
                                nodeTraces[nodeId].duration = nodeResult.duration
                                nodeTraces[nodeId].inputs = nodeResult.inputs
                                nodeTraces[nodeId].outputs = nodeResult.outputs
                                if (nodeResult.error) {
                                    nodeTraces[nodeId].error = nodeResult.error.message
                                }
                            }

                            send<NodeEndEventData>({
                                type: 'node:end',
                                data: {
                                    nodeId,
                                    success: nodeResult.success,
                                    inputs: nodeResult.inputs,
                                    outputs: nodeResult.outputs,
                                    error: nodeResult.error,
                                    duration: nodeResult.duration,
                                    matchedBranch: nodeResult.matchedBranch,
                                },
                                timestamp: new Date().toISOString(),
                            })
                        },
                        onLog: entry => {
                            send({
                                type: 'log',
                                data: {
                                    ...entry,
                                    // Serialize Date to string for JSON
                                    timestamp: entry.timestamp.toISOString(),
                                },
                                timestamp: new Date().toISOString(),
                            })
                        },
                    })

                    const duration = Date.now() - startTime

                    // Update execution record with success
                    await prisma.workflowExecution.update({
                        where: { id: execution.id },
                        data: {
                            status: result.success ? ExecutionStatus.SUCCESS : ExecutionStatus.ERROR,
                            outputs: result.outputs as object,
                            error: result.error?.message,
                            duration,
                            totalTokens,
                            nodeTraces: nodeTraces as object,
                            completedAt: new Date(),
                        },
                    })

                    // Send workflow end event
                    send<WorkflowEndEventData>({
                        type: 'workflow:end',
                        data: {
                            success: result.success,
                            outputs: result.outputs,
                            duration,
                            totalTokens,
                            error: result.error?.message,
                        },
                        timestamp: new Date().toISOString(),
                    })
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error('Workflow execution error:', error)

                    const duration = Date.now() - startTime
                    const errorMessage = error instanceof Error ? error.message : '执行工作流失败'

                    // Update execution record with error
                    await prisma.workflowExecution.update({
                        where: { id: execution.id },
                        data: {
                            status: ExecutionStatus.ERROR,
                            error: errorMessage,
                            duration,
                            totalTokens,
                            nodeTraces: nodeTraces as object,
                            completedAt: new Date(),
                        },
                    })

                    send<ErrorEventData>({
                        type: 'error',
                        data: {
                            message: errorMessage,
                        },
                        timestamp: new Date().toISOString(),
                    })
                } finally {
                    controller.close()
                }
            },
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        })
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('执行工作流失败:', error)
        return apiError(ErrorCode.INTERNAL_SERVER_ERROR, error instanceof Error ? error.message : '执行工作流失败')
    }
}
