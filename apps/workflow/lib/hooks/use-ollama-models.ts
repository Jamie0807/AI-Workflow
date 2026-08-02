'use client'

import { useEffect, useMemo, useState } from 'react'

export const LEGACY_STATIC_MODELS = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'qwen3:0.6b', 'qwen-max'] as const

export interface ModelOption {
    value: string
    label: string
}

interface ModelsApiResponse {
    success: boolean
    message?: string
    data?: {
        models?: string[]
    }
}

export function useOllamaModels(currentModel?: string) {
    const [models, setModels] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let ignore = false

        async function loadModels() {
            try {
                setIsLoading(true)
                setError(null)

                const response = await fetch('/api/models', { cache: 'no-store' })
                const data = (await response.json()) as ModelsApiResponse

                if (!response.ok || !data.success) {
                    throw new Error(data.message || '读取模型列表失败')
                }

                if (!ignore) {
                    setModels(data.data?.models ?? [])
                }
            } catch (loadError) {
                if (!ignore) {
                    setError(loadError instanceof Error ? loadError.message : '读取模型列表失败')
                    setModels([])
                }
            } finally {
                if (!ignore) {
                    setIsLoading(false)
                }
            }
        }

        loadModels()

        return () => {
            ignore = true
        }
    }, [])

    const options = useMemo<ModelOption[]>(() => {
        const installedOptions = models.map(model => ({
            value: model,
            label: model,
        }))

        if (!currentModel || models.includes(currentModel)) {
            return installedOptions
        }

        return [
            {
                value: currentModel,
                label: `${currentModel} (当前配置)`,
            },
            ...installedOptions,
        ]
    }, [currentModel, models])

    return {
        models,
        options,
        isLoading,
        error,
    }
}
