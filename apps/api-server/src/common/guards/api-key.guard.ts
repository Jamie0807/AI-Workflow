import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'

import { PrismaService } from '../../prisma/prisma.service'

// 扩展 Request 类型，添加自定义属性
export interface AppContext {
    id: string
    name: string
    activePublishedId: string | null // 当前激活的发布版本 ID
}

export interface ApiKeyContext {
    id: string
    name: string
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            appContext?: AppContext
            apiKeyContext?: ApiKeyContext
        }
    }
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>()
        const authHeader = request.headers.authorization

        // 检查 Authorization header
        if (!authHeader) {
            throw new UnauthorizedException({
                code: 'API_KEY_MISSING',
                message: '缺少 API Key，请在 Authorization header 中提供 Bearer token',
            })
        }

        // 解析 Bearer token
        const [type, token] = authHeader.split(' ')
        if (type !== 'Bearer' || !token) {
            throw new UnauthorizedException({
                code: 'API_KEY_INVALID',
                message: '无效的 Authorization header 格式，应为 Bearer <API_KEY>',
            })
        }

        // 查找 API Key
        const apiKey = await this.prisma.apiKey.findUnique({
            where: { key: token },
            include: {
                app: {
                    select: {
                        id: true,
                        name: true,
                        isPublished: true,
                        isDeleted: true,
                        activePublishedId: true,
                    },
                },
            },
        })

        // API Key 不存在
        if (!apiKey) {
            throw new UnauthorizedException({
                code: 'API_KEY_INVALID',
                message: '无效的 API Key',
            })
        }

        // API Key 已禁用
        if (!apiKey.isActive) {
            throw new UnauthorizedException({
                code: 'API_KEY_DISABLED',
                message: 'API Key 已禁用',
            })
        }

        // API Key 已过期
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            throw new UnauthorizedException({
                code: 'API_KEY_EXPIRED',
                message: 'API Key 已过期',
            })
        }

        // 应用不存在或已删除
        if (!apiKey.app || apiKey.app.isDeleted) {
            throw new UnauthorizedException({
                code: 'APP_NOT_FOUND',
                message: '应用不存在',
            })
        }

        // 应用未发布
        if (!apiKey.app.isPublished) {
            throw new UnauthorizedException({
                code: 'APP_NOT_PUBLISHED',
                message: '应用尚未发布，请先发布应用',
            })
        }

        // 更新 API Key 使用统计（异步，不阻塞请求）
        this.prisma.apiKey
            .update({
                where: { id: apiKey.id },
                data: {
                    lastUsedAt: new Date(),
                    usageCount: { increment: 1 },
                },
            })
            .catch(() => {
                // 忽略统计更新错误
            })

        // 将应用信息和 API Key 信息附加到请求对象
        request.appContext = {
            id: apiKey.app.id,
            name: apiKey.app.name,
            activePublishedId: apiKey.app.activePublishedId,
        }
        request.apiKeyContext = {
            id: apiKey.id,
            name: apiKey.name,
        }

        return true
    }
}
