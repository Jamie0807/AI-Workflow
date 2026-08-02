import { NodeProps, Position } from '@xyflow/react'
import clsx from 'clsx'
import { XIcon } from 'lucide-react'
import React from 'react'

import { Handle } from '../handle'
import { ICON_MAP } from '../icon-map'
import { InputParam } from '../settings/forms'

const TYPE_ICONS: Record<string, string> = {
    string: 'Aa',
    number: '123',
    boolean: '0/1',
    array: '[]',
    object: '{}',
}

export function StartNode({ data, selected }: NodeProps) {
    const inputs = (data?.config as any)?.inputs as InputParam[] | undefined
    const label = (data?.label as string) || '开始'

    return (
        <div
            className={clsx('rounded-xl border bg-white shadow-md p-3 w-44', {
                'border-blue-700': selected,
                'border-transparent': !selected,
            })}
        >
            <div className="flex items-center mb-3">
                <div className="mr-3 bg-blue-700 text-white rounded-lg p-2 shadow-sm">
                    <ICON_MAP.start size={14} />
                </div>
                <span className="font-bold">{label}</span>
            </div>

            {inputs && inputs.length > 0 ? (
                <div className="space-y-2">
                    {inputs.map((input, index) => (
                        <div key={index} className="flex h-6 items-center justify-between space-x-1 rounded-md bg-[#f2f4f7] px-2">
                            <div className="flex w-0 grow items-center space-x-1">
                                <XIcon size={14} color="#155aef" />
                                <span className="text-xs truncate" title={input.name}>
                                    {input.name}
                                </span>
                            </div>
                            <div className="ml-1 flex items-center space-x-1">
                                <span className="text-[10px] text-gray-500">{TYPE_ICONS[input.type]}</span>
                                {input.required && <span className="text-xs text-red-500">*</span>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-2 text-gray-400 text-xs">暂无入参</div>
            )}

            <Handle type="source" position={Position.Right} />
        </div>
    )
}
