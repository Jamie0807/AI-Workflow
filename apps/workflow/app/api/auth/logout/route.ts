import { apiSuccess, handleApiError } from '@/lib/api-response'
import { clearAuthCookie } from '@/lib/auth'

export async function POST() {
    try {
        await clearAuthCookie()

        return apiSuccess({ message: '已成功登出' })
    } catch (error) {
        return handleApiError(error)
    }
}
