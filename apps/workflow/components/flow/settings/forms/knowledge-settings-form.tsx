/* eslint-disable no-console */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

import { useFormAutoSaveWithControl } from '../form-auto-save-wrapper'
import { getAvailableNodeOutputs } from '../node-outputs'
import { NodeSettingsFormProps } from '../types'
import { VariableEditor } from '../variable-editor'

/**
 * 检索模式
 */
export type KnowledgeRetrievalMode = 'vector' | 'fulltext' | 'hybrid'

/**
 * 输出格式
 */
export type KnowledgeOutputFormat = 'text' | 'json'

/**
 * 知识库节点配置数据类型
 */
export interface KnowledgeNodeConfig {
    knowledgeBaseIds: string[]
    query: string
    retrievalMode: KnowledgeRetrievalMode
    topK: number
    threshold: number
    outputFormat: KnowledgeOutputFormat
}

interface KnowledgeBaseItem {
    id: string
    name: string
    icon: string
    documentCount: number
    chunkCount: number
}

/**
 * 知识库节点设置表单
 */
export function KnowledgeSettingsForm({ node, onSave, onCancel, flowContext }: NodeSettingsFormProps<KnowledgeNodeConfig>) {
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([])
    console.log('🚀 ~ KnowledgeSettingsForm ~ knowledgeBases:', knowledgeBases)
    const [loading, setLoading] = useState(true)

    const defaultValues: KnowledgeNodeConfig = {
        knowledgeBaseIds: (node.data?.config as any)?.knowledgeBaseIds || [],
        query: (node.data?.config as any)?.query || '',
        retrievalMode: (node.data?.config as any)?.retrievalMode || 'vector',
        topK: (node.data?.config as any)?.topK || 5,
        threshold: (node.data?.config as any)?.threshold ?? 0.2,
        outputFormat: (node.data?.config as any)?.outputFormat || 'text',
    }

    const {
        register,
        handleSubmit,
        formState: { errors },
        control,
        watch,
        setValue,
    } = useForm<KnowledgeNodeConfig>({
        defaultValues,
    })

    // 自动保存
    useFormAutoSaveWithControl(control, onSave, true)

    // 获取可用的上游节点输出
    const availableOutputs = useMemo(() => {
        if (!flowContext) return []
        return getAvailableNodeOutputs(node.id, flowContext.nodes, flowContext.edges)
    }, [node.id, flowContext])

    // 获取知识库列表
    useEffect(() => {
        async function fetchKnowledgeBases() {
            try {
                const response = await fetch('/api/knowledge?pageSize=100')
                if (!response.ok) throw new Error('获取知识库列表失败')
                const result = await response.json()
                setKnowledgeBases(result.data?.items || [])
            } catch (error) {
                console.error('获取知识库列表失败:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchKnowledgeBases()
    }, [])

    const selectedIds = watch('knowledgeBaseIds')
    const threshold = watch('threshold')

    const onSubmit = (data: KnowledgeNodeConfig) => {
        onSave?.(data)
    }

    const toggleKnowledgeBase = (id: string, checked: boolean) => {
        const current = selectedIds || []
        if (checked) {
            setValue('knowledgeBaseIds', [...current, id])
        } else {
            setValue(
                'knowledgeBaseIds',
                current.filter((i: string) => i !== id)
            )
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 知识库选择 */}
            <Field>
                <FieldLabel>
                    知识库 <span className="text-red-500">*</span>
                </FieldLabel>
                {loading ? (
                    <div className="text-sm text-muted-foreground py-2">加载中...</div>
                ) : knowledgeBases.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-2">暂无知识库，请先创建</div>
                ) : (
                    <ScrollArea className="h-32 border rounded-md p-2">
                        <div className="space-y-2">
                            {knowledgeBases?.map(kb => (
                                <label key={kb.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                                    <Checkbox
                                        checked={selectedIds?.includes(kb.id)}
                                        onCheckedChange={checked => toggleKnowledgeBase(kb.id, !!checked)}
                                    />
                                    <span className="text-base">{kb.icon}</span>
                                    <span className="text-sm flex-1">{kb.name}</span>
                                    <span className="text-xs text-muted-foreground">{kb.chunkCount} 切片</span>
                                </label>
                            ))}
                        </div>
                    </ScrollArea>
                )}
                {(!selectedIds || selectedIds.length === 0) && <p className="text-xs text-muted-foreground mt-1">请选择至少一个知识库</p>}
            </Field>

            {/* 查询内容 */}
            <Field>
                <FieldLabel htmlFor="query">
                    查询内容 <span className="text-red-500">*</span>
                </FieldLabel>
                <Controller
                    name="query"
                    control={control}
                    rules={{ required: '查询内容不能为空' }}
                    render={({ field }) => (
                        <VariableEditor
                            value={field.value || ''}
                            onChange={field.onChange}
                            availableOutputs={availableOutputs}
                            placeholder="输入查询内容，可使用变量如 ${start.query}"
                            minHeight="80px"
                        />
                    )}
                />
                {errors.query && <p className="text-sm text-red-500">{errors.query.message}</p>}
            </Field>

            {/* 检索模式 */}
            <Field>
                <FieldLabel>检索模式</FieldLabel>
                <Controller
                    name="retrievalMode"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="vector" id="mode-vector" />
                                <Label htmlFor="mode-vector" className="font-normal cursor-pointer">
                                    向量检索
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="fulltext" id="mode-fulltext" />
                                <Label htmlFor="mode-fulltext" className="font-normal cursor-pointer">
                                    全文检索
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="hybrid" id="mode-hybrid" />
                                <Label htmlFor="mode-hybrid" className="font-normal cursor-pointer">
                                    混合检索
                                </Label>
                            </div>
                        </RadioGroup>
                    )}
                />
            </Field>

            {/* Top K */}
            <Field>
                <FieldLabel htmlFor="topK">返回结果数 (Top K)</FieldLabel>
                <Input
                    id="topK"
                    type="number"
                    min="1"
                    max="20"
                    {...register('topK', {
                        valueAsNumber: true,
                        min: { value: 1, message: '最少返回 1 条结果' },
                        max: { value: 20, message: '最多返回 20 条结果' },
                    })}
                />
                {errors.topK && <p className="text-sm text-red-500">{errors.topK.message}</p>}
            </Field>

            {/* 相似度阈值 */}
            <Field>
                <div className="flex items-center justify-between">
                    <FieldLabel>相似度阈值</FieldLabel>
                    <span className="text-sm text-muted-foreground">{((threshold ?? 0.2) * 100).toFixed(0)}%</span>
                </div>
                <Controller
                    name="threshold"
                    control={control}
                    render={({ field }) => (
                        <Slider
                            value={[field.value ?? 0.2]}
                            onValueChange={([value]) => field.onChange(value)}
                            min={0}
                            max={1}
                            step={0.05}
                            className="mt-2"
                        />
                    )}
                />
                <p className="text-xs text-muted-foreground mt-1">低于此阈值的结果将被过滤</p>
            </Field>

            {/* 输出格式 */}
            <Field>
                <FieldLabel>输出格式</FieldLabel>
                <Controller
                    name="outputFormat"
                    control={control}
                    render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择输出格式" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">文本格式（拼接所有内容）</SelectItem>
                                <SelectItem value="json">JSON 格式（包含详细信息）</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </Field>
        </form>
    )
}
