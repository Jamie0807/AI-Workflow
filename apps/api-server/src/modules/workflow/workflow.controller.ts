import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common'
import type { Request, Response } from 'express'

import { ApiKeyGuard } from '../../common/guards/api-key.guard'
import { RunWorkflowDto, WorkflowExecutionResultDto } from './dto/run-workflow.dto'
import { type ExecutionContext, type SSEEvent, WorkflowService } from './workflow.service'

@Controller('v1/apps')
@UseGuards(ApiKeyGuard)
export class WorkflowController {
    constructor(private readonly workflowService: WorkflowService) {}

    /**
     * 运行工作流
     * POST /api/v1/apps/run
     *
     * 通过 API Key 鉴权后，自动获取对应的应用信息并执行工作流
     * 支持两种模式：
     * - stream=false（默认）：同步返回执行结果
     * - stream=true：SSE 流式返回执行过程
     */
    @Post('run')
    async runWorkflow(
        @Body() dto: RunWorkflowDto,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<WorkflowExecutionResultDto | void> {
        // 构建执行上下文
        const context: ExecutionContext = {
            appId: request.appContext!.id,
            activePublishedId: request.appContext!.activePublishedId,
            apiKeyId: request.apiKeyContext!.id,
        }

        // 流式模式：SSE 响应
        if (dto.stream) {
            // 设置 SSE 响应头 （确保流式传输）
            response.setHeader('Content-Type', 'text/event-stream')
            // 禁用缓存，确保实时性
            response.setHeader('Cache-Control', 'no-cache')
            // 保持连接，确保事件流能够及时发送
            response.setHeader('Connection', 'keep-alive')
            // 禁用 nginx 缓冲，确保实时性
            response.setHeader('X-Accel-Buffering', 'no') // 禁用 nginx 缓冲
            // 刷新响应头，确保立即发送
            response.flushHeaders()

            // SSE 事件发送函数
            const sendEvent = (event: SSEEvent) => {
                // 发送事件数据
                response.write(`event: ${event.type}\n`)
                // 发送事件数据
                response.write(`data: ${JSON.stringify(event.data)}\n\n`)
            }

            // 执行工作流并流式返回
            await this.workflowService.runWorkflowStream(context, dto, sendEvent)

            // 结束 SSE 连接
            response.end()
            return
        }

        // 同步模式：直接返回结果
        return this.workflowService.runWorkflow(context, dto)
    }
}
