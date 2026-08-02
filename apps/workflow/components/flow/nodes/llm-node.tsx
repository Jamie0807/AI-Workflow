import type { NodeProps } from '@xyflow/react'
import { Position } from '@xyflow/react'
import { Brain } from 'lucide-react'
import React, { useState } from 'react'

import { Handle } from '../handle'
import { ICON_MAP } from '../icon-map'

export function LLMNode({ data, selected }: NodeProps) {
    const [model, setModel] = useState<string>((data?.config as any)?.model ?? 'qwen3:0.6b')
    const [prompt, setPrompt] = useState<string>((data?.config as any)?.prompt ?? '')
    const label = (data?.label as string) || '大模型'

    return (
        <div className={`rounded-xl border bg-white shadow-md p-3 w-64 ${selected ? 'border-purple-700' : 'border-transparent'}`}>
            <div className="flex items-center mb-3">
                <div className="mr-3 bg-purple-700 text-white rounded-lg p-2 shadow-sm">
                    <ICON_MAP.llm size={14} />
                </div>
                <span className="font-bold">{label}</span>
            </div>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-12">模型</span>
                    <span className="flex-1 rounded-md py-1 text-sm bg-[#f2f4f7] px-2">{model}</span>
                </div>
            </div>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    )
}
