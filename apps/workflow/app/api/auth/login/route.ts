import { NextRequest } from 'next/server'
import { z } from 'zod'

import { apiError, apiSuccess, type ApiSuccessData, ErrorCode, handleApiError } from '@/lib/api-response'
import { generateToken, setAuthCookie } from '@/lib/auth'
import { verifyPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'

const loginSchema = z.object({
    email: z.email('请输入有效的邮箱地址'),
    password: z.string().min(1, '请输入密码'),
})

type LoginRequest = z.infer<typeof loginSchema>

interface UserResponse {
    id: string
    email: string
    name: string | null
    avatar: string | null
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // 验证输入
        const result = loginSchema.safeParse(body)
        if (!result.success) {
            return apiError(ErrorCode.VALIDATION_ERROR, result.error.issues[0].message)
        }

        const { email, password } = result.data

        // 查找用户
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return apiError(ErrorCode.PASSWORD_INCORRECT, '邮箱或密码错误')
        }

        // 验证密码
        const isValid = await verifyPassword(password, user.password)
        if (!isValid) {
            return apiError(ErrorCode.PASSWORD_INCORRECT, '邮箱或密码错误')
        }

        // 检查邮箱是否已验证
        if (!user.emailVerified) {
            return apiError(ErrorCode.EMAIL_NOT_VERIFIED)
        }

        // 生成令牌并设置 Cookie
        const token = generateToken(user.id)
        await setAuthCookie(token)

        const userData: UserResponse = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
        }

        return apiSuccess<{ user: UserResponse }>({ user: userData }, '登录成功')
    } catch (error) {
        return handleApiError(error)
    }
}
