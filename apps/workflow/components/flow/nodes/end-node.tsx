import { NodeProps, Position } from '@xyflow/react'
import clsx from 'clsx'
import React, { useMemo } from 'react'

import { useFlowEditorContext } from '../editor/context'
import { Handle } from '../handle'
import { ICON_MAP } from '../icon-map'
import { VariableRenderer } from '../settings/variable-renderer'

// 从变量表达式中解析节点ID和变量名
function parseVariableExpression(value: string): Array<{ nodeId: string; variableName: string }> {
    const matches = value.matchAll(/\$\{([^.]+)\.([^}]+)\}/g)
    return Array.from(matches).map(([_, nodeId, variableName]) => ({ nodeId, variableName }))
}

interface OutputParam {
    name: string
    type: string
    value: string
    description?: string
}

interface EndNodeConfig {
    outputs?: OutputParam[]
}

export function EndNode({ data, selected }: NodeProps) {
    const config = (data?.config as EndNodeConfig) || {}
    const outputs = config.outputs || []
    const label = (data?.label as string) || '结束'
    const { nodes: allNodes } = useFlowEditorContext()

    // 构建可用输出映射，用于变量渲染器
    const availableOutputs = useMemo(() => {
        if (!allNodes) return []

        const nodeMap = new Map(allNodes.map(n => [n.id, (n.data?.label as string) || n.id]))

        // 从所有输出中提取引用的节点
        const referencedNodeIds = new Set<string>()
        outputs.forEach(output => {
            const parsed = parseVariableExpression(output.value)
            parsed.forEach(({ nodeId }) => referencedNodeIds.add(nodeId))
        })

        return Array.from(referencedNodeIds).map(nodeId => ({
            nodeId,
            nodeLabel: nodeMap.get(nodeId) || nodeId,
            outputs: [{ name: 'output', label: '输出' }], // 简化的输出信息
        }))
    }, [allNodes, outputs])

    return (
        <div
            className={clsx('rounded-xl border bg-white shadow-md px-3 py-2 w-52', {
                'border-orange-500': selected,
                'border-transparent': !selected,
            })}
        >
            <div className="flex items-center">
                <div className="mr-3 bg-orange-500 text-white rounded-lg p-2 shadow-sm">
                    <ICON_MAP.end size={14} />
                </div>
                <span className="font-bold">{label}</span>
            </div>
            <Handle type="target" position={Position.Left} />

            {outputs.length > 0 && (
                <div className="mt-2 space-y-1.5">
                    {outputs.map((output, index) => (
                        <div key={index} className="flex flex-row gap-1">
                            {/* <span className="text-xs text-gray-500 font-medium">{output.name}:</span> */}
                            <VariableRenderer value={output.value} availableOutputs={availableOutputs} className="text-xs" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
