import { NextRequest } from 'next/server'
import { z } from 'zod'

import { apiError, apiSuccess, ErrorCode, handleApiError } from '@/lib/api-response'
import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateDisplayName } from '@/lib/user-settings'

interface UserResponse {
    id: string
    email: string
    name: string | null
    avatar: string | null
    emailVerified: Date | null
    createdAt: Date
}

const updateProfileSchema = z.object({
    name: z.string().max(50, '姓名不能超过 50 个字符'),
})

export async function GET() {
    try {
        const userId = await getCurrentUserId()

        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED)
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                emailVerified: true,
                createdAt: true,
            },
        })

        if (!user) {
            return apiError(ErrorCode.USER_NOT_FOUND)
        }

        return apiSuccess<{ user: UserResponse }>({ user })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const userId = await getCurrentUserId()

        if (!userId) {
            return apiError(ErrorCode.UNAUTHORIZED)
        }

        const result = updateProfileSchema.safeParse(await request.json())
        if (!result.success) {
            return apiError(ErrorCode.VALIDATION_ERROR, result.error.issues[0].message)
        }

        const nameResult = validateDisplayName(result.data.name)
        if (!nameResult.valid) {
            return apiError(ErrorCode.VALIDATION_ERROR, nameResult.error)
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { name: nameResult.value },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                emailVerified: true,
                createdAt: true,
            },
        })

        return apiSuccess<{ user: UserResponse }>({ user }, '姓名已保存')
    } catch (error) {
        return handleApiError(error)
    }
}
