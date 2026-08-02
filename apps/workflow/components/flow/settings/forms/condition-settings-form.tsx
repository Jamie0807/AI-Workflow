'use client'

import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LEGACY_STATIC_MODELS, useOllamaModels } from '@/lib/hooks/use-ollama-models'

import { getAvailableNodeOutputs } from '../node-outputs'
import { NodeSettingsFormProps } from '../types'
import { VariableEditor } from '../variable-editor'

/**
 * 意图配置
 */
export interface Intent {
    name: string
    description?: string
}

/**
 * 意图识别节点配置数据类型
 */
export interface ConditionNodeConfig {
    model: string
    intents: Intent[]
}

/**
 * 单个意图编辑卡片
 */
function IntentCard({
    intent,
    index,
    onChange,
    onDelete,
    availableOutputs,
}: {
    intent: Intent
    index: number
    onChange: (index: number, data: Partial<Intent>) => void
    onDelete: (index: number) => void
    availableOutputs: ReturnType<typeof getAvailableNodeOutputs>
}) {
    return (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                    意图 {index + 1}
                    <span className="ml-2 text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">分支 {index + 1}</span>
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(index)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                >
                    <Trash2Icon size={14} />
                </Button>
            </div>

            <Field>
                <FieldLabel className="text-xs">意图名称</FieldLabel>
                <FieldContent>
                    <Input
                        value={intent.name}
                        onChange={e => onChange(index, { name: e.target.value })}
                        placeholder="例如: 查询订单、咨询价格"
                        className="h-8 text-sm"
                    />
                </FieldContent>
            </Field>

            <Field>
                <FieldLabel className="text-xs">意图描述</FieldLabel>
                <FieldContent>
                    <VariableEditor
                        value={intent.description || ''}
                        onChange={value => onChange(index, { description: value })}
                        availableOutputs={availableOutputs}
                        placeholder="描述意图特征，可使用 / 插入变量..."
                        minHeight="60px"
                    />
                </FieldContent>
            </Field>
        </div>
    )
}

/**
 * 意图识别节点设置表单
 */
export function ConditionSettingsForm({ node, onSave, onCancel, flowContext }: NodeSettingsFormProps<ConditionNodeConfig>) {
    const defaultConfig = (node.data?.config as any) || {}
    const [model, setModel] = useState<string>(defaultConfig.model || 'gpt-3.5-turbo')
    const [intents, setIntents] = useState<Intent[]>(defaultConfig.intents || [])
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const lastSavedDataRef = useRef<string>('')
    const { models, options, isLoading, error } = useOllamaModels(model)
    const resolvedModel = useMemo(() => {
        if (models.length === 0) return model

        if (!model || (LEGACY_STATIC_MODELS.includes(model as (typeof LEGACY_STATIC_MODELS)[number]) && !models.includes(model))) {
            return models[0]
        }

        return model
    }, [model, models])

    // 自动保存 - 当 model 或 intents 变化时保存
    useEffect(() => {
        const currentDataStr = JSON.stringify({ model: resolvedModel, intents })

        // 检查数据是否真的变化了
        if (currentDataStr === lastSavedDataRef.current) {
            return
        }

        // 清除之前的定时器
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
        }

        // 设置新的定时器
        autoSaveTimerRef.current = setTimeout(() => {
            // 过滤掉空的意图名
            const validIntents = intents.filter(i => i.name.trim())
            onSave?.({ model: resolvedModel, intents: validIntents })
            lastSavedDataRef.current = JSON.stringify({ model: resolvedModel, intents: validIntents })
        }, 500)

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
        }
    }, [resolvedModel, intents, onSave])

    // 获取可用的上游节点输出
    const availableOutputs = useMemo(() => {
        if (!flowContext) return []
        return getAvailableNodeOutputs(node.id, flowContext.nodes, flowContext.edges)
    }, [node.id, flowContext])

    const handleAddIntent = () => {
        setIntents([
            ...intents,
            {
                name: '',
                description: '',
            },
        ])
    }

    const handleChangeIntent = (index: number, data: Partial<Intent>) => {
        setIntents(intents.map((intent, i) => (i === index ? { ...intent, ...data } : intent)))
    }

    const handleDeleteIntent = (index: number) => {
        setIntents(intents.filter((_, i) => i !== index))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // 过滤掉空的意图名
        const validIntents = intents.filter(i => i.name.trim())
        onSave?.({ model: resolvedModel, intents: validIntents })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
                <FieldLabel htmlFor="model">识别模型</FieldLabel>
                <Select value={resolvedModel} onValueChange={setModel}>
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
                <p className="text-xs text-muted-foreground mt-1">选择用于意图识别的模型</p>
                {isLoading && <p className="text-xs text-muted-foreground">正在读取本地 Ollama 模型...</p>}
                {!isLoading && error && <p className="text-xs text-red-500">{error}</p>}
                {!isLoading && !error && options.length === 0 && (
                    <p className="text-xs text-muted-foreground">未读取到可用的 Ollama 模型</p>
                )}
            </Field>

            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">意图列表</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddIntent} className="h-7">
                    <PlusIcon size={14} className="mr-1" />
                    添加
                </Button>
            </div>

            <div className="space-y-3">
                {intents.length > 0 ? (
                    intents.map((intent, index) => (
                        <IntentCard
                            key={index}
                            intent={intent}
                            index={index}
                            onChange={handleChangeIntent}
                            onDelete={handleDeleteIntent}
                            availableOutputs={availableOutputs}
                        />
                    ))
                ) : (
                    <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p className="text-sm">暂无意图配置</p>
                        <p className="text-xs mt-1">点击"添加"配置意图分支</p>
                    </div>
                )}
            </div>

            <p className="text-xs text-muted-foreground">大模型会根据输入内容识别用户意图，并路由到对应分支。无法识别时将走"其他"分支。</p>
        </form>
    )
}
