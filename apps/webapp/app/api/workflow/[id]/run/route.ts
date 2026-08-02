import { createWorkflowEngine, NodeKind, WorkflowDefinition } from '@ai-workflow/ai-engine'
import { NextRequest, NextResponse } from 'next/server'

import { ExecutionStatus } from '@/app/generated/prisma/enums'
import { prisma } from '@/lib/prisma'

// Node trace record for database storage
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: appId } = await params
        const body = await request.json()
        const { inputs } = body as { inputs: Record<string, unknown> }

        // Get published app
        const app = await prisma.app.findFirst({
            where: {
                id: appId,
                isDeleted: false,
                isPublished: true,
                activePublishedId: { not: null },
            },
            include: {
                activePublished: true,
            },
        })

        if (!app || !app.activePublished) {
            return NextResponse.json({ error: '应用不存在或未发布' }, { status: 404 })
        }

        const publishedApp = app.activePublished
        const nodes = publishedApp.nodes as unknown as FlowNode[]
        const edges = publishedApp.edges as unknown as FlowEdge[]

        // Convert to ai-engine WorkflowDefinition format
        const workflow: WorkflowDefinition = {
            id: `webapp-${appId}-${Date.now()}`,
            name: `${app.name} - Web 执行`,
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
                const send = (type: string, data: unknown) => {
                    try {
                        controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`))
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
                const execution = await prisma.appExecution.create({
                    data: {
                        executionId,
                        status: ExecutionStatus.RUNNING,
                        inputs: inputs as object,
                        publishedAppId: publishedApp.id,
                        startedAt: new Date(),
                    },
                })

                try {
                    const engine = createWorkflowEngine({ verbose: true })

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

                            send('node:start', {
                                executionId,
                                nodeId,
                                nodeType,
                                nodeName,
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

                            send('node:end', {
                                nodeId,
                                success: nodeResult.success,
                                outputs: nodeResult.outputs,
                                duration: nodeResult.duration,
                            })
                        },
                    })

                    const duration = Date.now() - startTime

                    // Update execution record with success
                    await prisma.appExecution.update({
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

                    // Send complete event
                    send('complete', {
                        status: result.success ? 'SUCCESS' : 'ERROR',
                        outputs: result.outputs,
                        duration,
                    })
                } catch (error) {
                    console.error('Workflow execution error:', error)

                    const duration = Date.now() - startTime
                    const errorMessage = error instanceof Error ? error.message : '执行工作流失败'

                    // Update execution record with error
                    await prisma.appExecution.update({
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

                    send('error', {
                        message: errorMessage,
                        duration,
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
        console.error('执行工作流失败:', error)
        return NextResponse.json({ error: error instanceof Error ? error.message : '执行工作流失败' }, { status: 500 })
    }
}
