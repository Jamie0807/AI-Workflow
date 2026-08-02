'use client'

import { clsx } from 'clsx'
import { BookOpen, Brain, GitBranch, Globe, HomeIcon, PlusIcon, Terminal } from 'lucide-react'
import { memo } from 'react'

import { getColor } from '../icon-map'

export type NodeKind = 'start' | 'llm' | 'http' | 'condition' | 'end' | 'knowledge'

interface NodeItem {
    type: NodeKind
    label: string
    description: string
    icon: React.ReactNode
    disabled?: boolean
}

const nodeIcons = {
    start: HomeIcon,
    llm: Brain,
    http: Globe,
    condition: GitBranch,
    end: Terminal,
    knowledge: BookOpen,
}

const nodeItems: NodeItem[] = [
    {
        type: 'start',
        label: '开始',
        description: '工作流入口，定义输入参数',
        icon: <HomeIcon size={14} />,
        disabled: true, // 只允许一个开始节点
    },
    {
        type: 'llm',
        label: '大模型',
        description: '调用 LLM 进行文本处理',
        icon: <Brain size={14} />,
    },
    {
        type: 'knowledge',
        label: '知识库',
        description: '从知识库检索相关内容',
        icon: <BookOpen size={14} />,
    },
    {
        type: 'http',
        label: 'HTTP 请求',
        description: '发送 HTTP 请求',
        icon: <Globe size={14} />,
    },
    {
        type: 'condition',
        label: '条件分支',
        description: '基于 LLM 判断分支',
        icon: <GitBranch size={14} />,
    },
    {
        type: 'end',
        label: '结束',
        description: '工作流出口，返回结果',
        icon: <Terminal size={14} />,
    },
]

interface NodePanelProps {
    onAddNode: (type: NodeKind) => void
    hasStartNode?: boolean
}

export const NodePanel = memo(function NodePanel({ onAddNode, hasStartNode = true }: NodePanelProps) {
    return (
        <div className="w-52 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-100">
                <h3 className="font-semibold text-sm text-gray-700">节点列表</h3>
                <p className="text-xs text-gray-400 mt-0.5">点击添加节点到画布</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {nodeItems.map(item => {
                    const isDisabled = item.disabled || (item.type === 'start' && hasStartNode)

                    return (
                        <button
                            key={item.type}
                            type="button"
                            onClick={() => !isDisabled && onAddNode(item.type)}
                            disabled={isDisabled}
                            className={clsx(
                                'w-full flex items-start gap-2 p-2 rounded-lg text-left transition-all',
                                'hover:bg-gray-50 active:bg-gray-100',
                                isDisabled && 'opacity-40 cursor-not-allowed'
                            )}
                        >
                            <div
                                className={clsx(
                                    'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white',
                                    getColor(item.type)
                                )}
                            >
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                    {!isDisabled && <PlusIcon size={12} className="text-gray-400" />}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* 提示信息 */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">💡 提示：拖拽节点可调整位置</p>
            </div>
        </div>
    )
})
