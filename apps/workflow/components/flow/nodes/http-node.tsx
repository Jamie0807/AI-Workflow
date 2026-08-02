import { NodeProps, Position } from '@xyflow/react'
import clsx from 'clsx'
import React from 'react'

import { Handle } from '../handle'
import { ICON_MAP } from '../icon-map'

export function HttpNode({ data, selected }: NodeProps) {
    const config = data?.config as any
    const method = config?.method ?? 'GET'
    const url = config?.url ?? ''
    const label = (data?.label as string) || 'HTTP 请求'

    // 截取 URL 显示（去掉协议前缀，只显示域名和路径）
    const displayUrl = url.replace(/^https?:\/\//, '').substring(0, 30) + (url.length > 30 ? '...' : '')

    return (
        <div
            className={clsx('rounded-xl border bg-white shadow-md px-3 py-2 w-64', {
                'border-green-700': selected,
                'border-transparent': !selected,
            })}
        >
            <div className="flex items-center mb-3">
                <div className="mr-3 bg-green-700 text-white rounded-lg p-2 shadow-sm">
                    <ICON_MAP.http size={14} />
                </div>
                <span className="font-bold">{label}</span>
            </div>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-12">方法</span>
                    <span
                        className={clsx(
                            'rounded-md py-0.5 px-2 text-xs font-medium',
                            method === 'GET' && 'bg-blue-100 text-blue-700',
                            method === 'POST' && 'bg-green-100 text-green-700',
                            method === 'PUT' && 'bg-orange-100 text-orange-700',
                            method === 'DELETE' && 'bg-red-100 text-red-700',
                            method === 'PATCH' && 'bg-purple-100 text-purple-700'
                        )}
                    >
                        {method}
                    </span>
                </div>
                {url && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-12">URL</span>
                        <span className="flex-1 rounded-md py-1 text-xs bg-[#f2f4f7] px-2 truncate" title={url}>
                            {displayUrl}
                        </span>
                    </div>
                )}
            </div>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    )
}
