'use client'

import { Edit2Icon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { NodeSettingsFormProps } from '../types'

/**
 * 入参类型
 */
export type ParamType = 'string' | 'number' | 'boolean' | 'array' | 'object'

/**
 * 入参配置
 */
export interface InputParam {
    name: string
    type: ParamType
    defaultValue?: string
    required?: boolean
    description?: string
}

/**
 * 开始节点配置数据类型
 */
export interface StartNodeConfig {
    inputs: InputParam[]
}

const TYPE_LABELS: Record<ParamType, string> = {
    string: '字符串',
    number: '数字',
    boolean: '布尔值',
    array: '数组',
    object: '对象',
}

/**
 * 默认值输入框占位符映射
 */
const DEFAULT_VALUE_PLACEHOLDERS: Record<ParamType, string> = {
    string: '例如: Hello',
    number: '例如: 42',
    boolean: '例如: true 或 false',
    array: '例如: [1, 2, 3]',
    object: '例如: {"key": "value"}',
}

/**
 * 默认值输入框 - 使用 useWatch 监听 type 变化
 */
function DefaultValueInput({ control, register }: { control: any; register: any }) {
    // 使用 useWatch 局部监听 type 字段，只有 type 变化时才重新渲染此组件
    const paramType = useWatch({ control, name: 'type' }) as ParamType

    return (
        <Field>
            <FieldLabel htmlFor="defaultValue">默认值</FieldLabel>
            <Input id="defaultValue" placeholder={DEFAULT_VALUE_PLACEHOLDERS[paramType] || ''} {...register('defaultValue')} />
        </Field>
    )
}

/**
 * 参数编辑对话框
 * 使用 Controller 控制 Select 组件
 */
function ParamEditDialog({
    open,
    onOpenChange,
    param,
    onSave,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    param?: InputParam
    onSave: (data: InputParam) => void
}) {
    const isEdit = !!param

    const {
        register,
        handleSubmit,
        formState: { errors },
        control,
        reset,
    } = useForm<InputParam>({
        defaultValues: {
            name: '',
            type: 'string',
            defaultValue: '',
            required: false,
            description: '',
        },
    })

    // 当对话框打开时，使用参数数据重置表单
    useEffect(() => {
        if (open) {
            reset(
                param || {
                    name: '',
                    type: 'string',
                    defaultValue: '',
                    required: false,
                    description: '',
                }
            )
        }
    }, [open, param, reset])

    const onSubmit = (data: InputParam) => {
        onSave(data)
        reset()
        onOpenChange(false)
    }

    const handleCancel = () => {
        reset()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? '编辑参数' : '添加参数'}</DialogTitle>
                    <DialogDescription>配置工作流的入参信息</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* 参数名 - 使用 register */}
                    <Field>
                        <FieldLabel htmlFor="name">
                            参数名 <span className="text-red-500">*</span>
                        </FieldLabel>
                        <FieldContent>
                            <Input
                                id="name"
                                placeholder="例如: count, userName"
                                {...register('name', {
                                    required: '参数名不能为空',
                                    pattern: {
                                        value: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                                        message: '参数名必须以字母或下划线开头，只能包含字母、数字和下划线',
                                    },
                                })}
                            />
                        </FieldContent>
                        <FieldError errors={errors.name ? [errors.name] : undefined} />
                    </Field>

                    {/* 参数类型 - 使用 Controller */}
                    <Field>
                        <FieldLabel htmlFor="type">
                            参数类型 <span className="text-red-500">*</span>
                        </FieldLabel>
                        <FieldContent>
                            <Controller
                                name="type"
                                control={control}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={value => field.onChange(value as ParamType)}>
                                        <SelectTrigger className="w-full" id="type">
                                            <SelectValue placeholder="请选择参数类型" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="string">字符串 (string)</SelectItem>
                                            <SelectItem value="number">数字 (number)</SelectItem>
                                            <SelectItem value="boolean">布尔值 (boolean)</SelectItem>
                                            <SelectItem value="array">数组 (array)</SelectItem>
                                            <SelectItem value="object">对象 (object)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </FieldContent>
                    </Field>

                    {/* 默认值 - 提取为单独组件以优化渲染 */}
                    <DefaultValueInput control={control} register={register} />

                    {/* 参数描述 - 使用 register */}
                    <Field>
                        <FieldLabel htmlFor="description">参数描述</FieldLabel>
                        <FieldContent>
                            <Textarea
                                id="description"
                                placeholder="描述这个参数的用途..."
                                className="min-h-[80px]"
                                {...register('description')}
                            />
                        </FieldContent>
                    </Field>

                    {/* 必填参数 - 使用 Controller 控制 Checkbox */}
                    <Field>
                        <FieldLabel htmlFor="required" className="mb-0">
                            必填参数
                        </FieldLabel>
                        <FieldContent>
                            <Controller
                                name="required"
                                control={control}
                                render={({ field }) => <Checkbox id="required" checked={field.value} onCheckedChange={field.onChange} />}
                            />
                        </FieldContent>
                    </Field>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            取消
                        </Button>
                        <Button type="submit" variant="default">
                            保存
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

/**
 * 开始节点设置表单
 */
export function StartSettingsForm({ node, onSave, onCancel }: NodeSettingsFormProps<StartNodeConfig>) {
    const [inputs, setInputs] = useState<InputParam[]>((node.data?.config as any)?.inputs || [])
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)

    // 自动保存 - 当 inputs 变化时保存
    const lastSavedRef = useRef<string>('')
    useEffect(() => {
        const currentDataStr = JSON.stringify({ inputs })
        // 首次渲染或数据没变化时不保存
        if (lastSavedRef.current === '' || currentDataStr === lastSavedRef.current) {
            lastSavedRef.current = currentDataStr
            return
        }
        // 500ms 防抖保存
        const timer = setTimeout(() => {
            onSave?.({ inputs })
            lastSavedRef.current = currentDataStr
        }, 500)
        return () => clearTimeout(timer)
    }, [inputs, onSave])

    const handleAddParam = () => {
        setEditingIndex(null)
        setDialogOpen(true)
    }

    const handleEditParam = (index: number) => {
        setEditingIndex(index)
        setDialogOpen(true)
    }

    const handleDeleteParam = (index: number) => {
        setInputs(inputs.filter((_, i) => i !== index))
    }

    const handleSaveParam = (data: InputParam) => {
        if (editingIndex !== null) {
            // 编辑现有参数
            setInputs(inputs.map((input, i) => (i === editingIndex ? data : input)))
        } else {
            // 添加新参数
            setInputs([...inputs, data])
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave?.({ inputs })
    }

    const currentParam = editingIndex !== null ? inputs[editingIndex] : undefined

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">入参配置</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddParam}>
                    <PlusIcon size={16} className="mr-1" />
                    添加参数
                </Button>
            </div>

            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {inputs.length > 0 ? (
                    inputs.map((input, index) => (
                        <div
                            key={index}
                            className="border rounded-md px-2.5 py-1.5 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="font-medium text-sm">{input.name}</span>
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {TYPE_LABELS[input.type]}
                                </span>
                                {input.required && <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">必填</span>}
                                {input.defaultValue && (
                                    <span className="text-xs text-muted-foreground">
                                        = <code className="bg-muted px-1 rounded">{input.defaultValue}</code>
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleEditParam(index)}>
                                    <Edit2Icon size={14} />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleDeleteParam(index)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Trash2Icon size={14} />
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
                        <p className="text-sm">暂无入参配置</p>
                        <p className="text-xs mt-1">点击上方按钮添加</p>
                    </div>
                )}
            </div>

            <ParamEditDialog open={dialogOpen} onOpenChange={setDialogOpen} param={currentParam} onSave={handleSaveParam} />
        </form>
    )
}
