import { createWorkflowEngine, type ExecutionLogEntry, type WorkflowDefinition } from '@ai-workflow/ai-engine'
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'crypto'

import { PrismaService } from '../../prisma/prisma.service'
import type { RunWorkflowDto, WorkflowExecutionResultDto } from './dto/run-workflow.dto'

// SSE 事件类型
export interface SSEEvent {
    type: 'node:start' | 'node:end' | 'log' | 'complete' | 'error'
    data: unknown
}

// SSE 回调函数类型
export type SSECallback = (event: SSEEvent) => void

// 执行上下文
export interface ExecutionContext {
    appId: string
    activePublishedId: string | null
    apiKeyId: string
}

@Injectable()
export class WorkflowService {
    private readonly logger = new Logger(WorkflowService.name)

    constructor(private readonly prisma: PrismaService) {}

    /**
     * 执行工作流（同步模式）
     * 使用 PublishedApp 获取工作流定义，执行记录存入 AppExecution
     */
    async runWorkflow(context: ExecutionContext, dto: RunWorkflowDto): Promise<WorkflowExecutionResultDto> {
        const { appId, activePublishedId, apiKeyId } = context

        // 检查是否有激活的发布版本
        if (!activePublishedId) {
            throw new BadRequestException({
                code: 'APP_NOT_PUBLISHED',
                message: '应用未发布，请先发布应用',
            })
        }

        // 获取发布的应用版本
        const publishedApp = await this.prisma.publishedApp.findUnique({
            where: { id: activePublishedId },
        })

        if (!publishedApp) {
            throw new NotFoundException({
                code: 'PUBLISHED_APP_NOT_FOUND',
                message: '发布版本不存在',
            })
        }

        // 生成执行 ID
        const executionId = `exec_${randomUUID().replace(/-/g, '').slice(0, 16)}`
        const startTime = Date.now()

        // 创建执行记录（使用 AppExecution）
        const execution = await this.prisma.appExecution.create({
            data: {
                executionId,
                publishedAppId: activePublishedId,
                apiKeyId,
                inputs: dto.inputs as object,
                status: 'RUNNING',
            },
        })

        try {
            this.logger.log(`Starting app execution: ${executionId} (published: ${publishedApp.name} v${publishedApp.version})`)

            // 创建工作流引擎
            const engine = createWorkflowEngine({
                ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
                verbose: process.env.NODE_ENV === 'development',
            })

            // 构建工作流定义（从 PublishedApp 快照获取）
            const workflowDefinition: WorkflowDefinition = {
                id: publishedApp.id,
                name: publishedApp.name,
                nodes: publishedApp.nodes as unknown as WorkflowDefinition['nodes'],
                edges: publishedApp.edges as unknown as WorkflowDefinition['edges'],
            }

            // 执行工作流
            const result = await engine.execute(workflowDefinition, dto.inputs)

            const duration = Date.now() - startTime

            // 更新执行记录
            await this.prisma.appExecution.update({
                where: { id: execution.id },
                data: {
                    status: result.success ? 'SUCCESS' : 'ERROR',
                    outputs: result.outputs as object,
                    error: result.error?.message,
                    duration,
                    nodeTraces: result.logs as object,
                    completedAt: new Date(),
                },
            })

            return {
                executionId,
                status: result.success ? 'SUCCESS' : 'ERROR',
                outputs: result.outputs,
                error: result.error?.message,
                duration,
                totalTokens: 0, // TODO: 从日志中统计 token
            }
        } catch (error) {
            const duration = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : '执行失败'

            // 更新执行记录
            await this.prisma.appExecution.update({
                where: { id: execution.id },
                data: {
                    status: 'ERROR',
                    error: errorMessage,
                    duration,
                    completedAt: new Date(),
                },
            })

            this.logger.error(`App execution failed: ${executionId}`, error)

            return {
                executionId,
                status: 'ERROR',
                error: errorMessage,
                duration,
            }
        }
    }

    /**
     * 执行工作流（流式模式，支持 SSE）
     * 使用 PublishedApp 获取工作流定义，执行记录存入 AppExecution
     */
    async runWorkflowStream(context: ExecutionContext, dto: RunWorkflowDto, onEvent: SSECallback): Promise<void> {
        const { appId, activePublishedId, apiKeyId } = context

        // 检查是否有激活的发布版本
        if (!activePublishedId) {
            onEvent({
                type: 'error',
                data: { code: 'APP_NOT_PUBLISHED', message: '应用未发布，请先发布应用' },
            })
            return
        }

        // 获取发布的应用版本
        const publishedApp = await this.prisma.publishedApp.findUnique({
            where: { id: activePublishedId },
        })

        if (!publishedApp) {
            onEvent({
                type: 'error',
                data: { code: 'PUBLISHED_APP_NOT_FOUND', message: '发布版本不存在' },
            })
            return
        }

        // 生成执行 ID
        const executionId = `exec_${randomUUID().replace(/-/g, '').slice(0, 16)}`
        const startTime = Date.now()

        // 创建执行记录（使用 AppExecution）
        const execution = await this.prisma.appExecution.create({
            data: {
                executionId,
                publishedAppId: activePublishedId,
                apiKeyId,
                inputs: dto.inputs as object,
                status: 'RUNNING',
            },
        })

        try {
            this.logger.log(`Starting app stream execution: ${executionId} (published: ${publishedApp.name} v${publishedApp.version})`)

            // 创建工作流引擎
            const engine = createWorkflowEngine({
                ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
                verbose: true,
            })

            // 构建工作流定义（从 PublishedApp 快照获取）
            const workflowDefinition: WorkflowDefinition = {
                id: publishedApp.id,
                name: publishedApp.name,
                nodes: publishedApp.nodes as unknown as WorkflowDefinition['nodes'],
                edges: publishedApp.edges as unknown as WorkflowDefinition['edges'],
            }

            // 执行工作流（带实时回调）
            const result = await engine.execute(workflowDefinition, dto.inputs, {
                onNodeStart: (nodeId, nodeType, nodeName) => {
                    onEvent({
                        type: 'node:start',
                        data: { nodeId, nodeType, nodeName, executionId },
                    })
                },
                onNodeEnd: (nodeId, nodeResult) => {
                    onEvent({
                        type: 'node:end',
                        data: {
                            nodeId,
                            success: nodeResult.success,
                            outputs: nodeResult.outputs,
                            duration: nodeResult.duration,
                            executionId,
                        },
                    })
                },
                onLog: (entry: ExecutionLogEntry) => {
                    onEvent({
                        type: 'log',
                        data: {
                            timestamp: entry.timestamp,
                            level: entry.level,
                            phase: entry.phase,
                            message: entry.message,
                            nodeId: entry.nodeId,
                            executionId,
                        },
                    })
                },
            })

            const duration = Date.now() - startTime

            // 更新执行记录
            await this.prisma.appExecution.update({
                where: { id: execution.id },
                data: {
                    status: result.success ? 'SUCCESS' : 'ERROR',
                    outputs: result.outputs as object,
                    error: result.error?.message,
                    duration,
                    nodeTraces: result.logs as object,
                    completedAt: new Date(),
                },
            })

            // 发送完成事件
            onEvent({
                type: 'complete',
                data: {
                    executionId,
                    status: result.success ? 'SUCCESS' : 'ERROR',
                    outputs: result.outputs,
                    error: result.error?.message,
                    duration,
                },
            })
        } catch (error) {
            const duration = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : '执行失败'

            // 更新执行记录
            await this.prisma.appExecution.update({
                where: { id: execution.id },
                data: {
                    status: 'ERROR',
                    error: errorMessage,
                    duration,
                    completedAt: new Date(),
                },
            })

            this.logger.error(`App stream execution failed: ${executionId}`, error)

            // 发送错误事件
            onEvent({
                type: 'error',
                data: {
                    executionId,
                    code: 'EXECUTION_ERROR',
                    message: errorMessage,
                    duration,
                },
            })
        }
    }
}
