'use client'

import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, JSONContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ChevronDownIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import { getColor, ICON_MAP } from '../../icon-map'
import { AvailableNodeOutput, formatVariableExpression, NodeOutputVariable } from '../node-outputs'
import { NodeKind } from '../types'
import { VariableTag } from '../variable-renderer'
import { SlashCommand } from './slash-command'
import { VariableMention } from './variable-mention'

interface VariableEditorProps {
    /** 编辑器的值（纯文本格式，包含 ${nodeId.field} 变量） */
    value: string
    /** 值变化回调 */
    onChange: (value: string) => void
    /** 可用的上游节点输出 */
    availableOutputs: AvailableNodeOutput[]
    /** placeholder */
    placeholder?: string
    /** 最小高度 */
    minHeight?: string
    /** 是否禁用 */
    disabled?: boolean
    /** 额外的 className */
    className?: string
    /** 单变量选择模式：只能选择一个变量，不能输入文本 */
    singleVariable?: boolean
    /** 单行模式：高度与 Input 一致，不显示提示文本 */
    singleLine?: boolean
    /** 隐藏边框（用于表格内嵌） */
    hideBorder?: boolean
}

/**
 * 将纯文本（包含 ${nodeId.field} 变量）转换为 Tiptap JSON 内容
 */
function textToContent(text: string, availableOutputs: AvailableNodeOutput[]): JSONContent {
    const content: JSONContent[] = []
    const variableRegex = /\$\{([^.]+)\.([^}]+)\}/g

    let lastIndex = 0
    let match

    while ((match = variableRegex.exec(text)) !== null) {
        // 添加变量之前的文本
        if (match.index > lastIndex) {
            const textBefore = text.slice(lastIndex, match.index)
            if (textBefore) {
                content.push({ type: 'text', text: textBefore })
            }
        }

        const nodeId = match[1]
        const variableName = match[2]

        // 查找节点和变量信息
        const nodeOutput = availableOutputs.find(n => n.nodeId === nodeId)
        const variable = nodeOutput?.outputs.find(v => v.name === variableName)

        content.push({
            type: 'variableMention',
            attrs: {
                nodeId,
                nodeLabel: nodeOutput?.nodeLabel || nodeId,
                variableName,
                variableLabel: variable?.label || variableName,
            },
        })

        lastIndex = match.index + match[0].length
    }

    // 添加最后的文本
    if (lastIndex < text.length) {
        content.push({ type: 'text', text: text.slice(lastIndex) })
    }

    if (content.length === 0) {
        return { type: 'doc', content: [{ type: 'paragraph' }] }
    }

    return {
        type: 'doc',
        content: [{ type: 'paragraph', content }],
    }
}

/**
 * 将 Tiptap JSON 内容转换为纯文本（包含 ${nodeId.field} 变量）
 */
function contentToText(content: JSONContent): string {
    if (!content.content) return ''

    let result = ''

    const processNode = (node: JSONContent) => {
        if (node.type === 'text') {
            result += node.text || ''
        } else if (node.type === 'variableMention') {
            const { nodeId, variableName } = node.attrs || {}
            result += formatVariableExpression(nodeId, variableName)
        } else if (node.type === 'paragraph') {
            if (node.content) {
                node.content.forEach(processNode)
            }
            result += '\n'
        } else if (node.content) {
            node.content.forEach(processNode)
        }
    }

    content.content.forEach(processNode)

    // 移除末尾多余的换行
    return result.replace(/\n$/, '')
}

/**
 * 解析变量表达式，返回节点ID和变量名
 */
function parseVariableExpression(value: string): { nodeId: string; variableName: string } | null {
    const match = value.match(/\$\{([^.]+)\.([^}]+)\}/)
    if (match) {
        return { nodeId: match[1], variableName: match[2] }
    }
    return null
}

/**
 * 单变量选择器组件 - 样式与 slash-command-list 一致
 */
function SingleVariableSelector({
    value,
    onChange,
    availableOutputs,
    placeholder,
    disabled,
}: {
    value: string
    onChange: (value: string) => void
    availableOutputs: AvailableNodeOutput[]
    placeholder?: string
    disabled?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    // 扁平化所有变量
    const flatItems = useMemo(() => {
        const items: { nodeOutput: AvailableNodeOutput; variable: NodeOutputVariable }[] = []
        availableOutputs.forEach(nodeOutput => {
            nodeOutput.outputs.forEach(variable => {
                items.push({ nodeOutput, variable })
            })
        })
        return items
    }, [availableOutputs])

    // 按节点分组
    const groupedItems = useMemo(() => {
        const groups: { nodeOutput: AvailableNodeOutput; variables: { variable: NodeOutputVariable; flatIndex: number }[] }[] = []
        let flatIndex = 0
        availableOutputs.forEach(nodeOutput => {
            const variables = nodeOutput.outputs.map(variable => ({ variable, flatIndex: flatIndex++ }))
            groups.push({ nodeOutput, variables })
        })
        return groups
    }, [availableOutputs])

    // 解析当前选中的变量
    const selectedVariable = useMemo(() => {
        const parsed = parseVariableExpression(value)
        if (!parsed) return null

        const nodeOutput = availableOutputs.find(n => n.nodeId === parsed.nodeId)
        const variable = nodeOutput?.outputs.find(v => v.name === parsed.variableName)

        if (nodeOutput && variable) {
            return { nodeOutput, variable }
        }
        return null
    }, [value, availableOutputs])

    const handleSelect = (nodeOutput: AvailableNodeOutput, variable: NodeOutputVariable) => {
        const expression = formatVariableExpression(nodeOutput.nodeId, variable.name)
        onChange(expression)
        setOpen(false)
    }

    const handleClear = () => {
        onChange('')
    }

    // 处理键盘导航
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault()
                setOpen(true)
            }
            return
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex((selectedIndex + flatItems.length - 1) % flatItems.length)
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex((selectedIndex + 1) % flatItems.length)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const item = flatItems[selectedIndex]
            if (item) {
                handleSelect(item.nodeOutput, item.variable)
            }
        } else if (e.key === 'Escape') {
            e.preventDefault()
            setOpen(false)
        }
    }

    // 失去焦点时关闭
    const handleBlur = (e: React.FocusEvent) => {
        // 检查焦点是否移到了下拉列表内部
        if (containerRef.current && !containerRef.current.contains(e.relatedTarget)) {
            setOpen(false)
        }
    }

    // 阻止 mousedown 防止失去焦点
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                disabled={disabled}
                className="w-full h-8 px-3 flex items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {selectedVariable ? (
                    <VariableTag
                        variable={{
                            nodeId: selectedVariable.nodeOutput.nodeId,
                            nodeLabel: selectedVariable.nodeOutput.nodeLabel,
                            variableName: selectedVariable.variable.name,
                            variableLabel: selectedVariable.variable.label,
                            variableType: selectedVariable.variable.type,
                        }}
                        removable
                        onRemove={handleClear}
                    />
                ) : (
                    <span className="text-muted-foreground">{placeholder || '选择变量'}</span>
                )}
                <ChevronDownIcon size={16} className="text-muted-foreground shrink-0" />
            </button>

            {open && (
                <div
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg min-w-[300px]"
                    onMouseDown={handleMouseDown}
                >
                    <div className="px-3 py-2 border-b bg-muted/30">
                        <span className="text-xs font-medium text-muted-foreground">选择变量</span>
                    </div>
                    <div className="max-h-[220px] overflow-auto">
                        {groupedItems.length > 0 ? (
                            groupedItems.map(group => {
                                const { nodeOutput } = group
                                const nodeType = nodeOutput.nodeId.split('-')[0] as NodeKind
                                const NodeIcon = ICON_MAP[nodeType]
                                const bgColor = getColor(nodeType)

                                return (
                                    <div key={nodeOutput.nodeId}>
                                        {/* 节点分组标题 */}
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b">
                                            <span
                                                className={`w-5 h-5 rounded flex items-center justify-center text-white flex-shrink-0 ${bgColor}`}
                                            >
                                                {NodeIcon && <NodeIcon size={12} />}
                                            </span>
                                            <span className="text-xs font-medium text-foreground">{nodeOutput.nodeLabel}</span>
                                            <span className="text-xs text-muted-foreground">({nodeOutput.nodeId})</span>
                                        </div>
                                        {/* 变量列表 */}
                                        {group.variables.map(({ variable, flatIndex }) => (
                                            <button
                                                key={`${nodeOutput.nodeId}-${variable.name}`}
                                                type="button"
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors pl-10 ${
                                                    flatIndex === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted/50'
                                                }`}
                                                onClick={() => handleSelect(nodeOutput, variable)}
                                                onMouseEnter={() => setSelectedIndex(flatIndex)}
                                            >
                                                <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                    {variable.name}
                                                </code>
                                                <span className="text-xs text-muted-foreground flex-1 truncate">{variable.label}</span>
                                                <span className="text-xs text-muted-foreground/60">{variable.type}</span>
                                            </button>
                                        ))}
                                    </div>
                                )
                            })
                        ) : (
                            <div className="p-3 text-sm text-muted-foreground">没有可用的变量</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

/**
 * 富文本编辑器内部组件 - 避免条件 Hooks 问题
 */
function RichTextEditor({
    value,
    onChange,
    availableOutputs,
    placeholder,
    minHeight,
    disabled,
    className,
    singleLine,
    hideBorder,
}: {
    value: string
    onChange: (value: string) => void
    availableOutputs: AvailableNodeOutput[]
    placeholder: string
    minHeight: string
    disabled?: boolean
    className?: string
    singleLine: boolean
    hideBorder?: boolean
}) {
    const initialContent = useMemo(() => textToContent(value, availableOutputs), [value, availableOutputs])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                bulletList: false,
                orderedList: false,
                blockquote: false,
                codeBlock: false,
                horizontalRule: false,
                // 单行模式禁用硬换行
                hardBreak: singleLine ? false : {},
            }),
            Placeholder.configure({
                placeholder,
            }),
            VariableMention,
            SlashCommand.configure({
                availableOutputs,
            }),
        ],
        content: initialContent,
        editable: !disabled,
        onUpdate: ({ editor: ed }) => {
            const json = ed.getJSON()
            const text = contentToText(json)
            onChange(text)
        },
        editorProps: {
            attributes: {
                class: 'outline-none',
            },
            // 单行模式阻止回车
            handleKeyDown: singleLine
                ? (_view, event) => {
                      if (event.key === 'Enter') {
                          return true // 阻止回车
                      }
                      return false
                  }
                : undefined,
        },
        immediatelyRender: false,
    })

    // 当 availableOutputs 变化时更新 SlashCommand
    useEffect(() => {
        if (editor) {
            // Tiptap 不直接支持动态更新扩展选项，这里通过重新创建来处理
            // 在实际使用中，availableOutputs 通常在节点选择时就确定了
        }
    }, [editor, availableOutputs])

    // 单行模式样式
    const containerStyle = singleLine ? { height: '36px' } : { minHeight }
    const editorClassName = singleLine
        ? 'h-full px-3 flex items-center text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror]:flex-1 [&_.ProseMirror]:whitespace-nowrap [&_.ProseMirror]:overflow-x-auto [&_.ProseMirror]:overflow-y-hidden [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none'
        : 'px-3 py-2 text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[60px] [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:overflow-auto [&_.ProseMirror]:break-all [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none'

    return (
        <div className={cn('relative', className || '')}>
            <div
                className={cn(
                    'bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden',
                    hideBorder ? 'border-0 rounded-none' : 'rounded-md border border-input'
                )}
                style={containerStyle}
            >
                {/* 编辑器内容 */}
                <EditorContent editor={editor} className={editorClassName} />
            </div>

            {/* 提示文本 - 单行模式不显示 */}
            {!singleLine && availableOutputs.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                    输入 <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">/</kbd>插入变量
                </p>
            )}
        </div>
    )
}

/**
 * 富文本变量编辑器
 * 支持:
 * - 变量以标签形式展示
 * - 输入 / 唤起变量选择菜单
 * - 右上角图标点击插入变量
 */
export function VariableEditor({
    value,
    onChange,
    availableOutputs,
    placeholder = '输入内容，使用 / 插入变量...',
    minHeight = '100px',
    disabled,
    className,
    singleVariable = false,
    singleLine = false,
    hideBorder = false,
}: VariableEditorProps) {
    // 单变量选择模式
    if (singleVariable) {
        return (
            <SingleVariableSelector
                value={value}
                onChange={onChange}
                availableOutputs={availableOutputs}
                placeholder={placeholder}
                disabled={disabled}
            />
        )
    }

    // 富文本编辑模式
    return (
        <RichTextEditor
            value={value}
            onChange={onChange}
            availableOutputs={availableOutputs}
            placeholder={placeholder}
            minHeight={minHeight}
            disabled={disabled}
            className={className}
            singleLine={singleLine}
            hideBorder={hideBorder}
        />
    )
}
