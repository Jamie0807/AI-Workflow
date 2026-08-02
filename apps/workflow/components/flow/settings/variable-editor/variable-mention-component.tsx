'use client'

import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'

import { getColor, ICON_MAP } from '../../icon-map'
import { NodeKind } from '../types'

/**
 * 变量提及组件 - 渲染变量标签
 */
export function VariableMentionComponent({ node, selected }: NodeViewProps) {
    const { nodeId, nodeLabel, variableName } = node.attrs as {
        nodeId: string
        nodeLabel: string
        variableName: string
        variableLabel: string
    }

    // 从 nodeId 推断节点类型 (如 start-1 -> start)
    const nodeType = nodeId?.split('-')[0] as NodeKind
    const NodeIcon = ICON_MAP[nodeType]
    const bgColor = getColor(nodeType)

    return (
        <NodeViewWrapper as="span" className="inline-block align-middle">
            <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-default select-none transition-all ${
                    selected ? 'ring-2 ring-primary ring-offset-1' : ''
                }`}
                style={{
                    backgroundColor: 'var(--primary-50, #eff6ff)',
                    color: 'var(--primary-700, #1d4ed8)',
                }}
                contentEditable={false}
            >
                <span className={`w-4 h-4 rounded flex items-center justify-center text-white ${bgColor}`} style={{ fontSize: '10px' }}>
                    {NodeIcon && <NodeIcon size={10} />}
                </span>
                <span className="font-medium">{nodeLabel}</span>
                <span className="text-gray-400">/</span>
                <span className="font-mono">{variableName}</span>
            </span>
        </NodeViewWrapper>
    )
}
