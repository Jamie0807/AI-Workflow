import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Response } from 'express'

interface ErrorResponse {
    code: string
    message: string
    details?: unknown
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name)

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()

        // 如果响应头已发送（如 SSE 流式模式），跳过错误响应处理
        // 因为 SSE 模式下错误已通过事件发送给客户端
        if (response.headersSent) {
            if (exception instanceof Error) {
                this.logger.warn(`Exception occurred after headers sent: ${exception.message}`)
            }
            return
        }

        let status = HttpStatus.INTERNAL_SERVER_ERROR
        let errorResponse: ErrorResponse = {
            code: 'INTERNAL_SERVER_ERROR',
            message: '服务器内部错误',
        }

        if (exception instanceof HttpException) {
            status = exception.getStatus()
            const exceptionResponse = exception.getResponse()

            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const resp = exceptionResponse as Record<string, unknown>
                errorResponse = {
                    code: (resp.code as string) || this.getDefaultCode(status),
                    message: (resp.message as string) || exception.message,
                }
                if (resp.details) {
                    errorResponse.details = resp.details
                }
            } else {
                errorResponse = {
                    code: this.getDefaultCode(status),
                    message: String(exceptionResponse),
                }
            }
        } else if (exception instanceof Error) {
            this.logger.error(`Unhandled error: ${exception.message}`, exception.stack)
            errorResponse = {
                code: 'INTERNAL_SERVER_ERROR',
                message: process.env.NODE_ENV === 'development' ? exception.message : '服务器内部错误',
            }
        }

        response.status(status).json(errorResponse)
    }

    private getDefaultCode(status: number): string {
        switch (status) {
            case HttpStatus.BAD_REQUEST:
                return 'BAD_REQUEST'
            case HttpStatus.UNAUTHORIZED:
                return 'UNAUTHORIZED'
            case HttpStatus.FORBIDDEN:
                return 'FORBIDDEN'
            case HttpStatus.NOT_FOUND:
                return 'NOT_FOUND'
            case HttpStatus.CONFLICT:
                return 'CONFLICT'
            case HttpStatus.UNPROCESSABLE_ENTITY:
                return 'VALIDATION_ERROR'
            case HttpStatus.TOO_MANY_REQUESTS:
                return 'RATE_LIMIT_EXCEEDED'
            default:
                return 'INTERNAL_SERVER_ERROR'
        }
    }
}
