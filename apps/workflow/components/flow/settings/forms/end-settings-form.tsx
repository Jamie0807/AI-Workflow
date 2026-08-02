'use client'

import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

import { getAvailableNodeOutputs } from '../node-outputs'
import { NodeSettingsFormProps } from '../types'
import { VariableEditor } from '../variable-editor'
import { VariableRenderer } from '../variable-renderer'

/**
 * 输出参数类型
 */
export type OutputParamType = 'string' | 'number' | 'boolean' | 'array' | 'object'

/**
 * 输出参数配置
 */
export interface OutputParam {
    name: string
    type: OutputParamType
    value: string // 使用表达式引用其他节点的输出，如 ${llm-1.output}
    description?: string
}

/**
 * 结束节点配置数据类型
 */
export interface EndNodeConfig {
    outputs: OutputParam[]
}

/**
 * 单个输出参数编辑卡片
 */
function OutputParamCard({
    param,
    index,
    onChange,
    onDelete,
    availableOutputs,
}: {
    param: OutputParam
    index: number
    onChange: (index: number, data: Partial<OutputParam>) => void
    onDelete: (index: number) => void
    availableOutputs: ReturnType<typeof getAvailableNodeOutputs>
}) {
    return (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">参数 {index + 1}</span>
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

            <div className="flex flex-col items-center gap-2">
                <Field className="w-full">
                    <FieldLabel className="text-xs">参数名</FieldLabel>
                    <FieldContent>
                        <Input
                            value={param.name}
                            onChange={e => onChange(index, { name: e.target.value })}
                            placeholder="result"
                            className="h-8 text-sm"
                        />
                    </FieldContent>
                </Field>

                <Field className="w-full">
                    <FieldLabel className="text-xs">参数值</FieldLabel>
                    <FieldContent>
                        <VariableEditor
                            value={param.value}
                            onChange={value => onChange(index, { value })}
                            availableOutputs={availableOutputs}
                            placeholder="选择上游变量"
                            singleVariable
                        />
                    </FieldContent>
                </Field>
            </div>
        </div>
    )
}

/**
 * 结束节点设置表单
 */
export function EndSettingsForm({ node, onSave, onCancel, flowContext }: NodeSettingsFormProps<EndNodeConfig>) {
    const configOutputs = (node.data?.config as any)?.outputs || []
    const [outputs, setOutputs] = useState<OutputParam[]>(configOutputs)
    const currentNodeIdRef = useRef(node.id)

    // 当切换到不同节点时，重新加载数据
    useEffect(() => {
        if (node.id !== currentNodeIdRef.current) {
            currentNodeIdRef.current = node.id
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setOutputs(configOutputs)
        }
    }, [node.id, configOutputs])

    // 获取可用的上游节点输出
    const availableOutputs = useMemo(() => {
        if (!flowContext) return []
        return getAvailableNodeOutputs(node.id, flowContext.nodes, flowContext.edges)
    }, [node.id, flowContext])

    // 自动保存 - 当 outputs 变化时保存
    const lastSavedRef = useRef<string>('')
    useEffect(() => {
        const currentDataStr = JSON.stringify({ outputs })
        // 首次渲染或数据没变化时不保存
        if (lastSavedRef.current === '' || currentDataStr === lastSavedRef.current) {
            lastSavedRef.current = currentDataStr
            return
        }
        // 500ms 防抖保存
        const timer = setTimeout(() => {
            // 过滤掉空的参数名
            const validOutputs = outputs.filter(o => o.name.trim())
            onSave?.({ outputs: validOutputs })
            lastSavedRef.current = JSON.stringify({ outputs: validOutputs })
        }, 500)
        return () => clearTimeout(timer)
    }, [outputs, onSave])

    const handleAddParam = () => {
        setOutputs([
            ...outputs,
            {
                name: '',
                type: 'string',
                value: '',
            },
        ])
    }

    const handleChangeParam = (index: number, data: Partial<OutputParam>) => {
        setOutputs(outputs.map((output, i) => (i === index ? { ...output, ...data } : output)))
    }

    const handleDeleteParam = (index: number) => {
        setOutputs(outputs.filter((_, i) => i !== index))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // 过滤掉空的参数名
        const validOutputs = outputs.filter(o => o.name.trim())
        onSave?.({ outputs: validOutputs })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">输出参数</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddParam} className="h-7">
                    <PlusIcon size={14} className="mr-1" />
                    添加
                </Button>
            </div>

            <div className="space-y-3">
                {outputs.length > 0 ? (
                    outputs.map((output, index) => (
                        <OutputParamCard
                            key={index}
                            param={output}
                            index={index}
                            onChange={handleChangeParam}
                            onDelete={handleDeleteParam}
                            availableOutputs={availableOutputs}
                        />
                    ))
                ) : (
                    <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p className="text-sm">暂无输出参数</p>
                        <p className="text-xs mt-1">点击"添加"配置输出</p>
                    </div>
                )}
            </div>

            <p className="text-xs text-muted-foreground">配置工作流结束时返回的输出参数</p>
        </form>
    )
}
