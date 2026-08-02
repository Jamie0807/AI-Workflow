import { IsBoolean, IsObject, IsOptional } from 'class-validator'

export class RunWorkflowDto {
    /**
     * 工作流输入参数，对应开始节点定义的变量
     */
    @IsObject()
    inputs: Record<string, unknown>

    /**
     * 是否使用流式响应
     */
    @IsOptional()
    @IsBoolean()
    stream?: boolean
}

export class WorkflowExecutionResultDto {
    /**
     * 执行唯一标识
     */
    executionId: string

    /**
     * 执行状态
     */
    status: 'RUNNING' | 'SUCCESS' | 'ERROR'

    /**
     * 输出结果
     */
    outputs?: Record<string, unknown>

    /**
     * 错误信息
     */
    error?: string

    /**
     * 执行耗时（毫秒）
     */
    duration?: number

    /**
     * Token 消耗
     */
    totalTokens?: number
}
