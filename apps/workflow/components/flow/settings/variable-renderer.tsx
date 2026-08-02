'use client'

import { XIcon } from 'lucide-react'

import { getColor, ICON_MAP } from '../icon-map'

export interface VariableData {
    /** 节点 ID */
    nodeId: string
    /** 节点标签 */
    nodeLabel: string
    /** 变量名 */
    variableName: string
    /** 变量标签 */
    variableLabel?: string
    /** 变量类型 */
    variableType?: string
}

interface VariableTagProps {
    /** 变量数据 */
    variable: VariableData
    /** 是否可删除 */
    removable?: boolean
    /** 删除回调 */
    onRemove?: () => void
    /** 额外样式类名 */
    className?: string
}

/**
 * 通用变量标签组件 - 与富文本编辑器中的变量标签样式一致
 *
 * @example
 * ```tsx
 * <VariableTag
 *     variable={{
 *         nodeId: 'llm-1',
 *         nodeLabel: '大模型',
 *         variableName: 'output',
 *         variableLabel: '输出内容',
 *         variableType: 'string'
 *     }}
 *     removable
 *     onRemove={() => console.log('removed')}
 * />
 * ```
 */
export function VariableTag({ variable, removable, onRemove, className = '' }: VariableTagProps) {
    // 从 nodeId 推断节点类型 (如 start-1 -> start)
    const nodeType = variable.nodeId?.split('-')[0] as keyof typeof ICON_MAP
    const NodeIcon = ICON_MAP[nodeType]
    const bgColor = getColor(nodeType)

    return (
        <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${className}`}
            style={{
                backgroundColor: 'var(--primary-50, #eff6ff)',
                color: 'var(--primary-700, #1d4ed8)',
            }}
        >
            <span className={`w-4 h-4 rounded flex items-center justify-center text-white ${bgColor}`} style={{ fontSize: '10px' }}>
                {NodeIcon && <NodeIcon size={10} />}
            </span>
            <span className="font-medium">{variable.nodeLabel}</span>
            <span className="text-gray-400">/</span>
            <span className="font-mono" title={variable.variableLabel || variable.variableName}>
                {variable.variableName}
            </span>
            {removable && onRemove && (
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="ml-0.5 hover:text-red-500 transition-colors"
                >
                    <XIcon size={12} />
                </button>
            )}
        </span>
    )
}

interface VariableRendererProps {
    /** 变量表达式 (如 ${llm-1.output}) */
    value: string
    /** 可用的上游节点输出 */
    availableOutputs: {
        nodeId: string
        nodeLabel: string
        outputs: {
            name: string
            label?: string
            type?: string
        }[]
    }[]
    /** 额外样式类名 */
    className?: string
}

/**
 * 变量渲染器 - 将变量表达式渲染为标签样式
 *
 * @example
 * ```tsx
 * <VariableRenderer
 *     value="${llm-1.output} 和 ${http-1.data}"
 *     availableOutputs={availableOutputs}
 * />
 * ```
 */
export function VariableRenderer({ value, availableOutputs, className = '' }: VariableRendererProps) {
    // 解析变量表达式 ${nodeId.variableName}
    const variableRegex = /\$\{([^.]+)\.([^}]+)\}/g

    const parts: Array<{ type: 'text' | 'variable'; content: string; data?: VariableData }> = []

    let lastIndex = 0
    let match

    while ((match = variableRegex.exec(value)) !== null) {
        // 添加变量之前的文本
        if (match.index > lastIndex) {
            const textBefore = value.slice(lastIndex, match.index)
            if (textBefore) {
                parts.push({ type: 'text', content: textBefore })
            }
        }

        const nodeId = match[1]
        const variableName = match[2]

        // 查找节点和变量信息
        const nodeOutput = availableOutputs.find(n => n.nodeId === nodeId)
        const variable = nodeOutput?.outputs.find(v => v.name === variableName)

        parts.push({
            type: 'variable',
            content: `${nodeOutput?.nodeLabel || nodeId}/${variable?.label || variableName}`,
            data: {
                nodeId,
                nodeLabel: nodeOutput?.nodeLabel || nodeId,
                variableName,
                variableLabel: variable?.label,
                variableType: variable?.type,
            },
        })

        lastIndex = match.index + match[0].length
    }

    // 添加最后的文本
    if (lastIndex < value.length) {
        const textAfter = value.slice(lastIndex)
        if (textAfter) {
            parts.push({ type: 'text', content: textAfter })
        }
    }

    if (parts.length === 0) {
        return <span className={className}>{value || <span className="text-muted-foreground">未设置</span>}</span>
    }

    return (
        <span className={`inline-flex items-center flex-wrap gap-1 ${className}`}>
            {parts.map((part, index) => {
                if (part.type === 'text') {
                    return <span key={`text-${index}`}>{part.content}</span>
                }
                return part.data ? <VariableTag key={`var-${index}`} variable={part.data} /> : null
            })}
        </span>
    )
}
