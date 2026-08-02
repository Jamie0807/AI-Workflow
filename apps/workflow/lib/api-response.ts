/* eslint-disable no-console */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

// ============================================================
// 类型定义
// ============================================================

/**
 * API 成功响应数据结构
 */
export interface ApiSuccessData<T = unknown> {
    data: T
    success: true
    message?: string
}

/**
 * API 错误响应数据结构
 */
export interface ApiErrorData {
    code: string
    message: string
    details?: Record<string, unknown>
}

/**
 * API 分页响应元数据
 */
export interface ApiPaginationMeta {
    page: number
    pageSize: number
    total: number
    totalPages: number
}

/**
 * API 分页响应数据结构
 */
export interface ApiPaginatedData<T> {
    items: T[]
    meta: ApiPaginationMeta
}

// ============================================================
// 错误码枚举
// ============================================================

/**
 * 统一错误码枚举
 */
export enum ErrorCode {
    // 通用错误 (1xxx)
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_REQUEST = 'INVALID_REQUEST',
    NOT_FOUND = 'NOT_FOUND',

    // 认证错误 (2xxx)
    UNAUTHORIZED = 'UNAUTHORIZED',
    TOKEN_INVALID = 'TOKEN_INVALID',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    PASSWORD_INCORRECT = 'PASSWORD_INCORRECT',

    // 业务错误 (3xxx)
    EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
    EMAIL_ALREADY_VERIFIED = 'EMAIL_ALREADY_VERIFIED',
    EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
    EMAIL_NOT_FOUND = 'EMAIL_NOT_FOUND',
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    INVALID_VERIFY_TOKEN = 'INVALID_VERIFY_TOKEN',

    // 应用错误 (4xxx)
    APP_NOT_FOUND = 'APP_NOT_FOUND',
    APP_ALREADY_EXISTS = 'APP_ALREADY_EXISTS',
    APP_NAME_INVALID = 'APP_NAME_INVALID',
    APP_DELETE_FAILED = 'APP_DELETE_FAILED',
    APP_UPDATE_FAILED = 'APP_UPDATE_FAILED',

    // 工作流错误
    INVALID_WORKFLOW = 'INVALID_WORKFLOW',
    INVALID_OPERATION = 'INVALID_OPERATION',

    // API Key 错误
    API_KEY_NOT_FOUND = 'API_KEY_NOT_FOUND',
    API_KEY_INVALID = 'API_KEY_INVALID',
    API_KEY_EXPIRED = 'API_KEY_EXPIRED',
    API_KEY_DISABLED = 'API_KEY_DISABLED',
    API_KEY_LIMIT_EXCEEDED = 'API_KEY_LIMIT_EXCEEDED',

    // 知识库错误
    KNOWLEDGE_BASE_NOT_FOUND = 'KNOWLEDGE_BASE_NOT_FOUND',
    KNOWLEDGE_BASE_NAME_INVALID = 'KNOWLEDGE_BASE_NAME_INVALID',
    DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
    DOCUMENT_UPLOAD_FAILED = 'DOCUMENT_UPLOAD_FAILED',
    DOCUMENT_PROCESSING_FAILED = 'DOCUMENT_PROCESSING_FAILED',

    // 资源错误 (4xxx)
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

    // 服务器错误 (5xxx)
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    EMAIL_SEND_ERROR = 'EMAIL_SEND_ERROR',
}

/**
 * 错误码对应的 HTTP 状态码映射
 */
export const ErrorCodeHttpStatusMap: Record<ErrorCode, number> = {
    [ErrorCode.UNKNOWN_ERROR]: 500,
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.INVALID_REQUEST]: 400,
    [ErrorCode.NOT_FOUND]: 404,

    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.TOKEN_INVALID]: 401,
    [ErrorCode.TOKEN_EXPIRED]: 401,
    [ErrorCode.PASSWORD_INCORRECT]: 401,

    [ErrorCode.EMAIL_NOT_VERIFIED]: 403,
    [ErrorCode.EMAIL_ALREADY_VERIFIED]: 400,
    [ErrorCode.EMAIL_ALREADY_EXISTS]: 400,
    [ErrorCode.EMAIL_NOT_FOUND]: 404,
    [ErrorCode.USER_NOT_FOUND]: 404,
    [ErrorCode.INVALID_VERIFY_TOKEN]: 400,

    [ErrorCode.APP_NOT_FOUND]: 404,
    [ErrorCode.APP_ALREADY_EXISTS]: 400,
    [ErrorCode.APP_NAME_INVALID]: 400,
    [ErrorCode.APP_DELETE_FAILED]: 500,
    [ErrorCode.APP_UPDATE_FAILED]: 500,
    [ErrorCode.INVALID_WORKFLOW]: 400,
    [ErrorCode.INVALID_OPERATION]: 400,

    [ErrorCode.API_KEY_NOT_FOUND]: 404,
    [ErrorCode.API_KEY_INVALID]: 401,
    [ErrorCode.API_KEY_EXPIRED]: 401,
    [ErrorCode.API_KEY_DISABLED]: 403,
    [ErrorCode.API_KEY_LIMIT_EXCEEDED]: 429,

    [ErrorCode.KNOWLEDGE_BASE_NOT_FOUND]: 404,
    [ErrorCode.KNOWLEDGE_BASE_NAME_INVALID]: 400,
    [ErrorCode.DOCUMENT_NOT_FOUND]: 404,
    [ErrorCode.DOCUMENT_UPLOAD_FAILED]: 500,
    [ErrorCode.DOCUMENT_PROCESSING_FAILED]: 500,

    [ErrorCode.RESOURCE_NOT_FOUND]: 404,
    [ErrorCode.RESOURCE_ALREADY_EXISTS]: 400,

    [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
    [ErrorCode.DATABASE_ERROR]: 500,
    [ErrorCode.EMAIL_SEND_ERROR]: 500,
}

/**
 * 错误码对应的默认中文消息
 */
export const ErrorCodeMessageMap: Record<ErrorCode, string> = {
    [ErrorCode.UNKNOWN_ERROR]: '未知错误',
    [ErrorCode.VALIDATION_ERROR]: '输入数据验证失败',
    [ErrorCode.INVALID_REQUEST]: '无效的请求',
    [ErrorCode.NOT_FOUND]: '请求的资源不存在',

    [ErrorCode.UNAUTHORIZED]: '未登录或登录已过期',
    [ErrorCode.TOKEN_INVALID]: '无效的认证令牌',
    [ErrorCode.TOKEN_EXPIRED]: '认证令牌已过期',
    [ErrorCode.PASSWORD_INCORRECT]: '密码错误',

    [ErrorCode.EMAIL_NOT_VERIFIED]: '请先验证您的邮箱',
    [ErrorCode.EMAIL_ALREADY_VERIFIED]: '邮箱已经验证过',
    [ErrorCode.EMAIL_ALREADY_EXISTS]: '该邮箱已被注册',
    [ErrorCode.EMAIL_NOT_FOUND]: '邮箱不存在',
    [ErrorCode.USER_NOT_FOUND]: '用户不存在',
    [ErrorCode.INVALID_VERIFY_TOKEN]: '无效的验证令牌',

    [ErrorCode.APP_NOT_FOUND]: '应用不存在',
    [ErrorCode.APP_ALREADY_EXISTS]: '应用已存在',
    [ErrorCode.APP_NAME_INVALID]: '应用名称无效',
    [ErrorCode.APP_DELETE_FAILED]: '应用删除失败',
    [ErrorCode.APP_UPDATE_FAILED]: '应用更新失败',
    [ErrorCode.INVALID_WORKFLOW]: '工作流配置无效',
    [ErrorCode.INVALID_OPERATION]: '操作无效',

    [ErrorCode.API_KEY_NOT_FOUND]: 'API Key 不存在',
    [ErrorCode.API_KEY_INVALID]: '无效的 API Key',
    [ErrorCode.API_KEY_EXPIRED]: 'API Key 已过期',
    [ErrorCode.API_KEY_DISABLED]: 'API Key 已禁用',
    [ErrorCode.API_KEY_LIMIT_EXCEEDED]: 'API Key 调用次数超限',

    [ErrorCode.KNOWLEDGE_BASE_NOT_FOUND]: '知识库不存在',
    [ErrorCode.KNOWLEDGE_BASE_NAME_INVALID]: '知识库名称无效',
    [ErrorCode.DOCUMENT_NOT_FOUND]: '文档不存在',
    [ErrorCode.DOCUMENT_UPLOAD_FAILED]: '文档上传失败',
    [ErrorCode.DOCUMENT_PROCESSING_FAILED]: '文档处理失败',

    [ErrorCode.RESOURCE_NOT_FOUND]: '请求的资源不存在',
    [ErrorCode.RESOURCE_ALREADY_EXISTS]: '资源已存在',

    [ErrorCode.INTERNAL_SERVER_ERROR]: '服务器内部错误',
    [ErrorCode.DATABASE_ERROR]: '数据库错误',
    [ErrorCode.EMAIL_SEND_ERROR]: '邮件发送失败',
}

// ============================================================
// 自定义错误类
// ============================================================

/**
 * API 错误基类
 */
export class ApiError extends Error {
    constructor(
        public code: ErrorCode,
        message?: string,
        public details?: Record<string, unknown>
    ) {
        super(message || ErrorCodeMessageMap[code])
        this.name = 'ApiError'
    }
}

/**
 * 验证错误
 */
export class ValidationError extends ApiError {
    constructor(message: string = '输入数据验证失败', details?: Record<string, unknown>) {
        super(ErrorCode.VALIDATION_ERROR, message, details)
        this.name = 'ValidationError'
    }
}

/**
 * 认证错误
 */
export class UnauthorizedError extends ApiError {
    constructor(message: string = '未登录或登录已过期') {
        super(ErrorCode.UNAUTHORIZED, message)
        this.name = 'UnauthorizedError'
    }
}

/**
 * 业务错误
 */
export class BusinessError extends ApiError {
    constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
        super(code, message, details)
        this.name = 'BusinessError'
    }
}

// ============================================================
// 响应构建器
// ============================================================

/**
 * 成功响应
 */
export function apiSuccess<T>(data: T, message?: string, status: number = 200) {
    const response: ApiSuccessData<T> = { data, success: true }
    if (message) {
        response.message = message
    }
    return NextResponse.json(response, { status })
}

/**
 * 分页响应
 */
export function apiPaginated<T>(items: T[], meta: ApiPaginationMeta, message?: string) {
    return apiSuccess<ApiPaginatedData<T>>({ items, meta }, message)
}

/**
 * 错误响应
 */
export function apiError(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    const status = ErrorCodeHttpStatusMap[code]
    const response: ApiErrorData = {
        code,
        message: message || ErrorCodeMessageMap[code],
    }
    if (details) {
        response.details = details
    }
    return NextResponse.json(response, { status })
}

/**
 * 从 ApiError 实例构建错误响应
 */
export function apiErrorFrom(error: ApiError) {
    return apiError(error.code, error.message, error.details)
}

// ============================================================
// 错误处理工具
// ============================================================

/**
 * 统一错误处理函数
 * 将各种类型的错误转换为标准的 API 错误响应
 */
export function handleApiError(error: unknown): ReturnType<typeof apiError> {
    // ApiError 及其子类
    if (error instanceof ApiError) {
        return apiErrorFrom(error)
    }

    // Zod 验证错误
    if (error instanceof ZodError) {
        return apiError(ErrorCode.VALIDATION_ERROR, error.issues[0]?.message || '输入数据验证失败', { issues: error.issues })
    }

    // 标准错误对象
    if (error instanceof Error) {
        console.error('Unhandled error:', error)
        return apiError(ErrorCode.INTERNAL_SERVER_ERROR, '服务器内部错误，请稍后重试')
    }

    // 未知类型
    console.error('Unknown error:', error)
    return apiError(ErrorCode.INTERNAL_SERVER_ERROR, '服务器内部错误，请稍后重试')
}

/**
 * API 路由包装器
 * 自动处理 try-catch 和错误响应
 */
export function withApiHandler<T = unknown>(
    handler: () => Promise<ReturnType<typeof apiSuccess<T>>>
): Promise<ReturnType<typeof apiSuccess<T>> | ReturnType<typeof apiError>> {
    return handler().catch(handleApiError)
}

/**
 * 带请求参数的 API 路由包装器
 */
export function withApiHandlerBody<T, R = unknown>(handler: (data: T) => Promise<ReturnType<typeof apiSuccess<R>>>) {
    return async (data: T): Promise<ReturnType<typeof apiSuccess<R>> | ReturnType<typeof apiError>> => {
        try {
            return await handler(data)
        } catch (error) {
            return handleApiError(error)
        }
    }
}
