import { apiSuccess, handleApiError } from '@/lib/api-response'
import { listOllamaModels } from '@/lib/services/ollama-service'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const models = await listOllamaModels()
        return apiSuccess({ models })
    } catch (error) {
        return handleApiError(error)
    }
}
