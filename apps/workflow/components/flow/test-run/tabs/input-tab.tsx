'use client'

import { Loader2, PlayIcon, RotateCcwIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import type { InputParam, StartNodeConfig } from '../../settings/forms/start-settings-form'

interface InputTabProps {
    startNodeConfig: StartNodeConfig | null
    onRun: (inputs: Record<string, unknown>) => Promise<void>
    isRunning: boolean
    onReset: () => void
    hasResult: boolean
}

/**
 * Parse input value based on type
 */
function parseValue(value: string, type: InputParam['type']): unknown {
    if (value === '' || value === undefined || value === null) {
        return undefined
    }

    switch (type) {
        case 'string':
            return value
        case 'number': {
            const num = Number(value)
            return isNaN(num) ? undefined : num
        }
        case 'boolean':
            return value === 'true' || value === '1'
        case 'array':
        case 'object':
            try {
                return JSON.parse(value)
            } catch {
                return undefined
            }
        default:
            return value
    }
}

/**
 * Get placeholder based on type
 */
function getPlaceholder(param: InputParam): string {
    if (param.defaultValue) {
        return param.defaultValue
    }

    switch (param.type) {
        case 'string':
            return '请输入字符串...'
        case 'number':
            return '请输入数字...'
        case 'boolean':
            return 'true 或 false'
        case 'array':
            return '[1, 2, 3]'
        case 'object':
            return '{"key": "value"}'
        default:
            return ''
    }
}

/**
 * Render input field based on parameter type
 */
function InputField({
    param,
    register,
    errors,
}: {
    param: InputParam
    register: ReturnType<typeof useForm>['register']
    errors: ReturnType<typeof useForm>['formState']['errors']
}) {
    const fieldName = param.name

    switch (param.type) {
        case 'boolean':
            return (
                <Field>
                    <div className="flex items-center gap-2">
                        <Checkbox id={fieldName} {...register(fieldName)} />
                        <FieldLabel htmlFor={fieldName} className="mb-0 cursor-pointer">
                            {param.name}
                            {param.required && <span className="text-red-500 ml-1">*</span>}
                        </FieldLabel>
                    </div>
                    {param.description && <FieldDescription>{param.description}</FieldDescription>}
                </Field>
            )

        case 'array':
        case 'object':
            return (
                <Field>
                    <FieldLabel htmlFor={fieldName}>
                        {param.name}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                    </FieldLabel>
                    <FieldContent>
                        <Textarea
                            id={fieldName}
                            placeholder={getPlaceholder(param)}
                            className="min-h-[80px] font-mono text-sm"
                            {...register(fieldName, {
                                required: param.required ? `${param.name} 是必填字段` : false,
                                validate: value => {
                                    if (!value) return true
                                    try {
                                        JSON.parse(value)
                                        return true
                                    } catch {
                                        return `${param.name} 必须是有效的 JSON 格式`
                                    }
                                },
                            })}
                        />
                    </FieldContent>
                    {param.description && <FieldDescription>{param.description}</FieldDescription>}
                    <FieldError errors={errors[fieldName] ? [errors[fieldName] as any] : undefined} />
                </Field>
            )

        case 'number':
            return (
                <Field>
                    <FieldLabel htmlFor={fieldName}>
                        {param.name}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                    </FieldLabel>
                    <FieldContent>
                        <Input
                            id={fieldName}
                            type="number"
                            placeholder={getPlaceholder(param)}
                            {...register(fieldName, {
                                required: param.required ? `${param.name} 是必填字段` : false,
                                valueAsNumber: true,
                            })}
                        />
                    </FieldContent>
                    {param.description && <FieldDescription>{param.description}</FieldDescription>}
                    <FieldError errors={errors[fieldName] ? [errors[fieldName] as any] : undefined} />
                </Field>
            )

        default:
            // string type
            return (
                <Field>
                    <FieldLabel htmlFor={fieldName}>
                        {param.name}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                    </FieldLabel>
                    <FieldContent>
                        <Input
                            id={fieldName}
                            placeholder={getPlaceholder(param)}
                            {...register(fieldName, {
                                required: param.required ? `${param.name} 是必填字段` : false,
                            })}
                        />
                    </FieldContent>
                    {param.description && <FieldDescription>{param.description}</FieldDescription>}
                    <FieldError errors={errors[fieldName] ? [errors[fieldName] as any] : undefined} />
                </Field>
            )
    }
}

/**
 * Input Tab Component
 * Renders dynamic form based on start node configuration
 */
export function InputTab({ startNodeConfig, onRun, isRunning, onReset, hasResult }: InputTabProps) {
    const inputs = startNodeConfig?.inputs || []

    // Build default values from param configs
    const defaultValues = inputs.reduce(
        (acc, param) => {
            if (param.defaultValue !== undefined && param.defaultValue !== '') {
                acc[param.name] = param.defaultValue
            }
            return acc
        },
        {} as Record<string, string>
    )

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues,
    })

    const onSubmit = async (data: Record<string, unknown>) => {
        // Parse values according to their types
        const parsedInputs: Record<string, unknown> = {}
        for (const param of inputs) {
            const rawValue = data[param.name]
            if (rawValue !== undefined && rawValue !== '') {
                parsedInputs[param.name] = parseValue(String(rawValue), param.type)
            } else if (param.defaultValue) {
                parsedInputs[param.name] = parseValue(param.defaultValue, param.type)
            }
        }

        await onRun(parsedInputs)
    }

    if (inputs.length === 0) {
        return (
            <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                    <p className="text-sm">该工作流没有配置入参</p>
                    <p className="text-xs mt-1">可直接运行</p>
                </div>

                <div className="flex gap-2">
                    <Button type="button" onClick={() => onRun({})} disabled={isRunning} className="flex-1">
                        {isRunning ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                运行中...
                            </>
                        ) : (
                            <>
                                <PlayIcon className="mr-2 h-4 w-4" />
                                开始运行
                            </>
                        )}
                    </Button>
                    {hasResult && (
                        <Button type="button" variant="outline" onClick={onReset} disabled={isRunning}>
                            <RotateCcwIcon className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
                {inputs.map(param => (
                    <InputField key={param.name} param={param} register={register} errors={errors} />
                ))}
            </div>

            <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isRunning} className="flex-1">
                    {isRunning ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            运行中...
                        </>
                    ) : (
                        <>
                            <PlayIcon className="mr-2 h-4 w-4" />
                            开始运行
                        </>
                    )}
                </Button>
                {hasResult && (
                    <Button type="button" variant="outline" onClick={onReset} disabled={isRunning}>
                        <RotateCcwIcon className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </form>
    )
}
