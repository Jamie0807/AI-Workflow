'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LEGACY_STATIC_MODELS, useOllamaModels } from '@/lib/hooks/use-ollama-models'

import { useFormAutoSaveWithControl } from '../form-auto-save-wrapper'
import { getAvailableNodeOutputs } from '../node-outputs'
import { NodeSettingsFormProps } from '../types'
import { VariableEditor } from '../variable-editor'

/**
 * LLM 节点配置数据类型
 */
export interface LLMNodeConfig {
    model: string
    systemPrompt?: string
    userPrompt: string
    assistantPrompt?: string
    temperature?: number
    maxTokens?: number
}

/**
 * LLM 节点设置表单
 * 使用 Controller 控制受控组件，避免不必要的重新渲染
 */
export function LLMSettingsForm({ node, onSave, onCancel, flowContext }: NodeSettingsFormProps<LLMNodeConfig>) {
    const defaultValues: LLMNodeConfig = {
        model: (node.data?.config as any)?.model || 'gpt-3.5-turbo',
        systemPrompt: (node.data?.config as any)?.systemPrompt || '',
        userPrompt: (node.data?.config as any)?.userPrompt || (node.data?.config as any)?.prompt || '',
        assistantPrompt: (node.data?.config as any)?.assistantPrompt || '',
        temperature: (node.data?.config as any)?.temperature || 0.7,
        maxTokens: (node.data?.config as any)?.maxTokens || 2000,
    }

    const {
        register,
        handleSubmit,
        formState: { errors },
        control,
        setValue,
        watch,
    } = useForm<LLMNodeConfig>({
        defaultValues,
    })

    const selectedModel = watch('model')
    const { models, options, isLoading, error } = useOllamaModels(selectedModel)

    // 自动保存 - 使用 control 配合 useWatch，避免父组件重新渲染
    useFormAutoSaveWithControl(control, onSave, true)

    // 获取可用的上游节点输出
    const availableOutputs = useMemo(() => {
        if (!flowContext) return []
        return getAvailableNodeOutputs(node.id, flowContext.nodes, flowContext.edges)
    }, [node.id, flowContext])

    const onSubmit = (data: LLMNodeConfig) => {
        onSave?.(data)
    }

    useEffect(() => {
        if (models.length === 0) return

        if (
            !selectedModel ||
            (LEGACY_STATIC_MODELS.includes(selectedModel as (typeof LEGACY_STATIC_MODELS)[number]) && !models.includes(selectedModel))
        ) {
            setValue('model', models[0], { shouldDirty: true })
        }
    }, [models, selectedModel, setValue])

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 模型选择 - 使用 Controller */}
            <Field>
                <FieldLabel htmlFor="model">
                    模型 <span className="text-red-500">*</span>
                </FieldLabel>
                <Controller
                    name="model"
                    control={control}
                    render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full" id="model" disabled={isLoading || options.length === 0}>
                                <SelectValue placeholder="请选择模型" />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.model && <p className="text-sm text-red-500">{errors.model.message}</p>}
                {isLoading && <p className="text-xs text-muted-foreground">正在读取本地 Ollama 模型...</p>}
                {!isLoading && error && <p className="text-xs text-red-500">{error}</p>}
                {!isLoading && !error && options.length === 0 && (
                    <p className="text-xs text-muted-foreground">未读取到可用的 Ollama 模型</p>
                )}
            </Field>

            {/* 系统提示词 - 使用 Controller */}
            <Field>
                <FieldLabel htmlFor="systemPrompt">系统提示词 (System)</FieldLabel>
                <Controller
                    name="systemPrompt"
                    control={control}
                    render={({ field }) => (
                        <VariableEditor
                            value={field.value || ''}
                            onChange={field.onChange}
                            availableOutputs={availableOutputs}
                            placeholder="设定 AI 的角色、行为规范和背景信息..."
                            minHeight="80px"
                        />
                    )}
                />
                <p className="text-xs text-muted-foreground mt-1">定义 AI 的角色和行为准则</p>
            </Field>

            {/* 用户提示词 - 使用 Controller */}
            <Field>
                <FieldLabel htmlFor="userPrompt">
                    用户提示词 (User) <span className="text-red-500">*</span>
                </FieldLabel>
                <Controller
                    name="userPrompt"
                    control={control}
                    rules={{ required: '用户提示词不能为空' }}
                    render={({ field }) => (
                        <VariableEditor
                            value={field.value || ''}
                            onChange={field.onChange}
                            availableOutputs={availableOutputs}
                            placeholder="用户的输入内容..."
                            minHeight="100px"
                        />
                    )}
                />
                {errors.userPrompt && <p className="text-sm text-red-500">{errors.userPrompt.message}</p>}
            </Field>

            {/* 助理提示词 - 使用 Controller */}
            <Field>
                <FieldLabel htmlFor="assistantPrompt">助理提示词 (Assistant)</FieldLabel>
                <Controller
                    name="assistantPrompt"
                    control={control}
                    render={({ field }) => (
                        <VariableEditor
                            value={field.value || ''}
                            onChange={field.onChange}
                            availableOutputs={availableOutputs}
                            placeholder="预设的助理回复开头..."
                            minHeight="60px"
                        />
                    )}
                />
                <p className="text-xs text-muted-foreground mt-1">可预设回复的开头内容，引导输出格式</p>
            </Field>

            {/* 温度 - 使用 register（原生 input 可以直接 register） */}
            <Field>
                <FieldLabel htmlFor="temperature">温度 (Temperature)</FieldLabel>
                <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    placeholder="0.7"
                    {...register('temperature', {
                        valueAsNumber: true,
                        min: { value: 0, message: '温度不能小于 0' },
                        max: { value: 2, message: '温度不能大于 2' },
                    })}
                />
                {errors.temperature && <p className="text-sm text-red-500">{errors.temperature.message}</p>}
            </Field>

            {/* 最大 Token 数 - 使用 register */}
            <Field>
                <FieldLabel htmlFor="maxTokens">最大 Token 数</FieldLabel>
                <Input
                    id="maxTokens"
                    type="number"
                    step="100"
                    min="1"
                    placeholder="2000"
                    {...register('maxTokens', {
                        valueAsNumber: true,
                        min: { value: 1, message: '最大 Token 数不能小于 1' },
                    })}
                />
                {errors.maxTokens && <p className="text-sm text-red-500">{errors.maxTokens.message}</p>}
            </Field>
        </form>
    )
}
