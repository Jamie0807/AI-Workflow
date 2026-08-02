import type { NodeProps } from '@xyflow/react'
import { Position } from '@xyflow/react'
import { useState } from 'react'

import { Handle } from '../handle'
import { ICON_MAP } from '../icon-map'

interface KnowledgeNodeConfig {
    knowledgeBaseIds?: string[]
    retrievalMode?: 'vector' | 'fulltext' | 'hybrid'
    topK?: number
}

export function KnowledgeNode({ data, selected }: NodeProps) {
    const config = (data?.config as KnowledgeNodeConfig) || {}
    const label = (data?.label as string) || '知识库'

    const retrievalModeLabel = {
        vector: '向量检索',
        fulltext: '全文检索',
        hybrid: '混合检索',
    }

    return (
        <div className={`rounded-xl border bg-white shadow-md p-3 w-64 ${selected ? 'border-cyan-700' : 'border-transparent'}`}>
            <div className="flex items-center mb-3">
                <div className="mr-3 bg-cyan-700 text-white rounded-lg p-2 shadow-sm">
                    <ICON_MAP.knowledge size={14} />
                </div>
                <span className="font-bold">{label}</span>
            </div>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-12">模式</span>
                    <span className="flex-1 rounded-md py-1 text-sm bg-[#f2f4f7] px-2">
                        {retrievalModeLabel[config.retrievalMode || 'vector']}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-12">Top K</span>
                    <span className="flex-1 rounded-md py-1 text-sm bg-[#f2f4f7] px-2">{config.topK || 5}</span>
                </div>
                {config.knowledgeBaseIds && config.knowledgeBaseIds.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-12">知识库</span>
                        <span className="flex-1 rounded-md py-1 text-sm bg-[#f2f4f7] px-2">{config.knowledgeBaseIds.length} 个</span>
                    </div>
                )}
            </div>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    )
}
