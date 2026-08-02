'use client'

import { PlusIcon, TrashIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { useFormAutoSaveWithControl } from '../form-auto-save-wrapper'
import { getAvailableNodeOutputs } from '../node-outputs'
import { NodeSettingsFormProps } from '../types'
import { VariableEditor } from '../variable-editor'

/**
 * HTTP 请求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * Body 类型
 */
export type BodyType = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'json' | 'raw' | 'binary'

/**
 * 键值对参数
 */
export interface KeyValuePair {
    key: string
    value: string
}

/**
 * HTTP 节点配置数据类型
 */
export interface HttpNodeConfig {
    /** 请求 URL */
    url: string
    /** 请求方法 */
    method: HttpMethod
    /** 请求头 */
    headers: KeyValuePair[]
    /** Query 参数 */
    params: KeyValuePair[]
    /** Body 类型 */
    bodyType: BodyType
    /** 请求体内容（JSON 字符串、raw 文本等） */
    body: string
    /** 表单数据（用于 form-data 和 x-www-form-urlencoded） */
    formData: KeyValuePair[]
    /** 超时时间（毫秒） */
    timeout?: number
}

/**
 * 键值对表格组件
 */
interface KeyValueTableProps {
    fields: Array<{ id: string; key: string; value: string }>
    control: any
    namePrefix: 'headers' | 'params' | 'formData'
    keyPlaceholder: string
    valuePlaceholder: string
    onAdd: () => void
    onRemove: (index: number) => void
    availableOutputs: ReturnType<typeof getAvailableNodeOutputs>
    keyLabel?: string
    valueLabel?: string
}

function KeyValueTable({
    fields,
    control,
    namePrefix,
    keyPlaceholder,
    valuePlaceholder,
    onAdd,
    onRemove,
    availableOutputs,
    keyLabel = 'Key',
    valueLabel = 'Value',
}: KeyValueTableProps) {
    return (
        <div className="border rounded-md overflow-hidden">
            <table className="w-full">
                <thead className="bg-muted/50">
                    <tr className="text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium w-1/2">{keyLabel}</th>
                        <th className="px-3 py-2 font-medium w-1/2">{valueLabel}</th>
                        <th className="px-2 py-2 font-medium w-10 text-center">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {fields.map((field, index) => (
                        <tr key={field.id}>
                            <td className="px-3 py-2 align-top">
                                <Input
                                    placeholder={keyPlaceholder}
                                    className="h-8 text-sm"
                                    {...control.register(`${namePrefix}.${index}.key` as const)}
                                />
                            </td>
                            <td className="px-3 py-2 align-top">
                                <Controller
                                    name={`${namePrefix}.${index}.value` as const}
                                    control={control}
                                    render={({ field }) => (
                                        <VariableEditor
                                            value={field.value}
                                            onChange={field.onChange}
                                            availableOutputs={availableOutputs}
                                            placeholder={valuePlaceholder}
                                            minHeight="60px"
                                            className="text-sm"
                                            hideBorder
                                        />
                                    )}
                                />
                            </td>
                            <td className="px-2 py-2 text-center align-top">
                                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onRemove(index)} className="mx-auto">
                                    <TrashIcon size={14} />
                                </Button>
                            </td>
                        </tr>
                    ))}
                    {fields.length === 0 && (
                        <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-xs text-muted-foreground">
                                暂无数据，点击下方按钮添加
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            <div className="border-t p-2">
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={onAdd}>
                    <PlusIcon size={14} className="mr-1" />
                    添加
                </Button>
            </div>
        </div>
    )
}

/**
 * Body 类型选项
 */
const bodyTypeOptions: { value: BodyType; label: string }[] = [
    { value: 'none', label: 'none' },
    { value: 'form-data', label: 'form-data' },
    { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
    { value: 'json', label: 'JSON' },
    { value: 'raw', label: 'raw' },
    { value: 'binary', label: 'binary' },
]

/**
 * HTTP 请求节点设置表单
 */
export function HttpSettingsForm({ node, onSave, onCancel, flowContext }: NodeSettingsFormProps<HttpNodeConfig>) {
    const defaultValues: HttpNodeConfig = {
        url: (node.data?.config as any)?.url || '',
        method: (node.data?.config as any)?.method || 'GET',
        headers: (node.data?.config as any)?.headers || [],
        params: (node.data?.config as any)?.params || [],
        bodyType: (node.data?.config as any)?.bodyType || 'none',
        body: (node.data?.config as any)?.body || '',
        formData: (node.data?.config as any)?.formData || [],
        timeout: (node.data?.config as any)?.timeout || 30000,
    }

    const {
        register,
        handleSubmit,
        formState: { errors },
        control,
    } = useForm<HttpNodeConfig>({
        defaultValues,
    })

    const {
        fields: headerFields,
        append: appendHeader,
        remove: removeHeader,
    } = useFieldArray({
        control,
        name: 'headers',
    })

    const {
        fields: paramFields,
        append: appendParam,
        remove: removeParam,
    } = useFieldArray({
        control,
        name: 'params',
    })

    const {
        fields: formDataFields,
        append: appendFormData,
        remove: removeFormData,
    } = useFieldArray({
        control,
        name: 'formData',
    })

    // 获取可用的上游节点输出
    const availableOutputs = useMemo(() => {
        if (!flowContext) return []
        return getAvailableNodeOutputs(node.id, flowContext.nodes, flowContext.edges)
    }, [node.id, flowContext])

    // 自动保存
    useFormAutoSaveWithControl(control, onSave, true)

    // 使用 useWatch 局部监听需要条件渲染的字段
    const method = useWatch({ control, name: 'method' })
    const bodyType = useWatch({ control, name: 'bodyType' })

    const onSubmit = (data: HttpNodeConfig) => {
        onSave?.(data)
    }

    // 是否显示请求体配置
    const showBody = method !== 'GET' && method !== 'DELETE'

    // 是否使用表单数据
    const useFormData = bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded'

    // 是否使用文本编辑器
    const useTextEditor = bodyType === 'json' || bodyType === 'raw'

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 请求方法和 URL */}
            <Field>
                <FieldLabel htmlFor="url">
                    请求 URL <span className="text-red-500">*</span>
                </FieldLabel>
                <div className="flex gap-2">
                    <Controller
                        name="method"
                        control={control}
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={(value: HttpMethod) => field.onChange(value)}>
                                <SelectTrigger className="w-28 flex-shrink-0 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GET">GET</SelectItem>
                                    <SelectItem value="POST">POST</SelectItem>
                                    <SelectItem value="PUT">PUT</SelectItem>
                                    <SelectItem value="DELETE">DELETE</SelectItem>
                                    <SelectItem value="PATCH">PATCH</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    <Controller
                        name="url"
                        control={control}
                        render={({ field }) => (
                            <VariableEditor
                                value={field.value || ''}
                                onChange={field.onChange}
                                availableOutputs={availableOutputs}
                                placeholder="https://api.example.com/endpoint"
                                minHeight="70px"
                            />
                        )}
                    />
                </div>
                {errors.url && <p className="text-sm text-red-500">{errors.url.message}</p>}
            </Field>

            {/* 超时设置 */}
            <Field>
                <FieldLabel htmlFor="timeout">超时时间 (ms)</FieldLabel>
                <Input id="timeout" type="number" placeholder="30000" {...register('timeout', { valueAsNumber: true })} />
            </Field>

            {/* 请求头 - 表格形式 */}
            <Field>
                <FieldLabel>请求头 (Headers)</FieldLabel>
                <KeyValueTable
                    fields={headerFields}
                    control={control}
                    namePrefix="headers"
                    keyPlaceholder="Header Name"
                    valuePlaceholder="Header Value"
                    onAdd={() => appendHeader({ key: '', value: '' })}
                    onRemove={removeHeader}
                    availableOutputs={availableOutputs}
                />
            </Field>

            {/* Query 参数 - 表格形式 */}
            <Field>
                <FieldLabel>Query 参数 (Params)</FieldLabel>
                <KeyValueTable
                    fields={paramFields}
                    control={control}
                    namePrefix="params"
                    keyPlaceholder="Param Name"
                    valuePlaceholder="Param Value"
                    onAdd={() => appendParam({ key: '', value: '' })}
                    onRemove={removeParam}
                    availableOutputs={availableOutputs}
                />
            </Field>

            {/* 请求体 */}
            {showBody && (
                <Field>
                    <FieldLabel className="mb-3">请求体 (Body)</FieldLabel>

                    {/* Body 类型选择 */}
                    <Controller
                        name="bodyType"
                        control={control}
                        render={({ field }) => (
                            <RadioGroup
                                value={field.value}
                                onValueChange={(value: BodyType) => field.onChange(value)}
                                className="flex flex-wrap gap-x-4 gap-y-2 mb-4"
                            >
                                {bodyTypeOptions.map(option => (
                                    <div key={option.value} className="flex items-center space-x-2">
                                        <RadioGroupItem value={option.value} id={`body-type-${option.value}`} />
                                        <Label htmlFor={`body-type-${option.value}`} className="text-sm font-normal cursor-pointer">
                                            {option.label}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        )}
                    />

                    {/* JSON 或 raw 模式 */}
                    {useTextEditor && (
                        <Controller
                            name="body"
                            control={control}
                            render={({ field }) => (
                                <VariableEditor
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    availableOutputs={availableOutputs}
                                    placeholder={bodyType === 'json' ? '{"key": "value"}' : '请输入文本内容...'}
                                    minHeight="120px"
                                    className="font-mono text-xs"
                                />
                            )}
                        />
                    )}

                    {/* Form 模式 - 表格形式 */}
                    {useFormData && (
                        <KeyValueTable
                            fields={formDataFields}
                            control={control}
                            namePrefix="formData"
                            keyPlaceholder="Field Name"
                            valuePlaceholder="Field Value"
                            onAdd={() => appendFormData({ key: '', value: '' })}
                            onRemove={removeFormData}
                            availableOutputs={availableOutputs}
                        />
                    )}

                    {/* binary 模式提示 */}
                    {bodyType === 'binary' && (
                        <div className="border border-dashed rounded-md p-4 text-center text-muted-foreground text-sm">
                            Binary 模式暂不支持，请使用其他方式上传文件
                        </div>
                    )}
                </Field>
            )}
        </form>
    )
}
