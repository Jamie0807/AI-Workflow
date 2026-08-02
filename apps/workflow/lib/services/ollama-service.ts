const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

interface OllamaModelInfo {
    name?: string
    model?: string
}

interface OllamaTagsResponse {
    models?: OllamaModelInfo[]
}

function getOllamaBaseUrl() {
    return process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_OLLAMA_BASE_URL
}

export async function listOllamaModels(): Promise<string[]> {
    const response = await fetch(`${getOllamaBaseUrl()}/api/tags`, {
        method: 'GET',
        cache: 'no-store',
    })

    if (!response.ok) {
        throw new Error(`读取 Ollama 模型失败: HTTP ${response.status}`)
    }

    const data = (await response.json()) as OllamaTagsResponse
    const models = data.models ?? []

    return Array.from(new Set(models.map(model => model.name?.trim() || model.model?.trim() || '').filter(Boolean)))
}
