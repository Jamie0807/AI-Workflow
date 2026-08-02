'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'

import { getColor, ICON_MAP } from '../../icon-map'
import { AvailableNodeOutput, NodeOutputVariable } from '../node-outputs'
import { NodeKind } from '../types'

interface SlashCommandItem {
    type: 'node' | 'variable'
    nodeOutput?: AvailableNodeOutput
    variable?: NodeOutputVariable
}

interface SlashCommandListProps {
    items: SlashCommandItem[]
    command: (item: SlashCommandItem) => void
}

export interface SlashCommandListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

/**
 * 按节点分组的变量项
 */
interface GroupedItems {
    nodeOutput: AvailableNodeOutput
    variables: { item: SlashCommandItem; flatIndex: number }[]
}

/**
 * Slash 命令列表组件
 */
export const SlashCommandList = forwardRef<SlashCommandListRef, SlashCommandListProps>(({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    // 按节点分组
    const groupedItems = useMemo(() => {
        const groups: GroupedItems[] = []
        const nodeMap = new Map<string, GroupedItems>()
        let flatIndex = 0

        items.forEach(item => {
            if (item.type === 'variable' && item.nodeOutput && item.variable) {
                const nodeId = item.nodeOutput.nodeId
                if (!nodeMap.has(nodeId)) {
                    const group: GroupedItems = {
                        nodeOutput: item.nodeOutput,
                        variables: [],
                    }
                    nodeMap.set(nodeId, group)
                    groups.push(group)
                }
                nodeMap.get(nodeId)!.variables.push({ item, flatIndex })
                flatIndex++
            }
        })

        return groups
    }, [items])

    // 获取扁平化的总数
    const totalItems = items.filter(item => item.type === 'variable').length

    const selectItem = (index: number) => {
        const item = items.filter(i => i.type === 'variable')[index]
        if (item) {
            command(item)
        }
    }

    const upHandler = () => {
        setSelectedIndex((selectedIndex + totalItems - 1) % totalItems)
    }

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % totalItems)
    }

    const enterHandler = () => {
        selectItem(selectedIndex)
    }

    useEffect(() => {
        setSelectedIndex(0)
    }, [items])

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                upHandler()
                return true
            }

            if (event.key === 'ArrowDown') {
                downHandler()
                return true
            }

            if (event.key === 'Enter') {
                enterHandler()
                return true
            }

            return false
        },
    }))

    // 阻止 mousedown 事件，防止编辑器失去焦点导致菜单关闭
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
    }

    if (groupedItems.length === 0) {
        return <div className="bg-white border rounded-lg shadow-lg p-3 text-sm text-muted-foreground">没有可用的变量</div>
    }

    return (
        <div className="bg-white border rounded-lg shadow-lg min-w-[300px]">
            <div className="px-3 py-2 border-b bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground">选择变量</span>
            </div>
            <div className="max-h-[220px] overflow-auto">
                {groupedItems.map(group => {
                    const { nodeOutput } = group
                    const nodeType = nodeOutput.nodeId.split('-')[0] as NodeKind
                    const NodeIcon = ICON_MAP[nodeType]
                    const bgColor = getColor(nodeType)

                    return (
                        <div key={nodeOutput.nodeId}>
                            {/* 节点分组标题 */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b">
                                <span className={`w-5 h-5 rounded flex items-center justify-center text-white flex-shrink-0 ${bgColor}`}>
                                    {NodeIcon && <NodeIcon size={12} />}
                                </span>
                                <span className="text-xs font-medium text-foreground">{nodeOutput.nodeLabel}</span>
                                <span className="text-xs text-muted-foreground">({nodeOutput.nodeId})</span>
                            </div>
                            {/* 变量列表 */}
                            {group.variables.map(({ item, flatIndex }) => {
                                const variable = item.variable!

                                return (
                                    <button
                                        key={`${nodeOutput.nodeId}-${variable.name}`}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors pl-10 ${
                                            flatIndex === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted/50'
                                        }`}
                                        onClick={() => selectItem(flatIndex)}
                                        onMouseDown={handleMouseDown}
                                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                                    >
                                        <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                            {variable.name}
                                        </code>
                                        <span className="text-xs text-muted-foreground flex-1 truncate">{variable.label}</span>
                                        <span className="text-xs text-muted-foreground/60">{variable.type}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </div>
    )
})

SlashCommandList.displayName = 'SlashCommandList'
