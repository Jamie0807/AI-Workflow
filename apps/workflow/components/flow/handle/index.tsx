import { Handle as XYFlowHandle, Position } from '@xyflow/react'
import clsx from 'clsx'
import { BookOpen, Brain, GitBranch, Globe, Terminal } from 'lucide-react'
import { CSSProperties, forwardRef, useContext } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { useFlowEditorContext } from '../editor/context'
import { getColor } from '../icon-map'

export type NodeKind = 'start' | 'llm' | 'http' | 'condition' | 'end' | 'knowledge'

interface NodeItem {
    type: NodeKind
    label: string
    description: string
    icon: React.ReactNode
}

const nodeItems: NodeItem[] = [
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

interface HandleProps {
    type: 'source' | 'target'
    position: Position
    id?: string
    className?: string
    handleClassName?: string
    style?: CSSProperties
}

export const Handle = forwardRef<HTMLDivElement, HandleProps>(function Handle(
    { type, id, position, className, handleClassName, style },
    ref
) {
    const { onAddNode } = useFlowEditorContext()
    const isSource = type === 'source' && position === Position.Right

    return (
        <XYFlowHandle
            id={id}
            type={type}
            position={position}
            className={clsx(
                'flex',
                position === Position.Right ? 'justify-end' : 'justify-start',
                isSource ? 'group' : '',
                handleClassName
            )}
            style={{
                backgroundColor: 'transparent',
                ...style,
            }}
        >
            <div className={clsx('w-[2px] h-2 bg-purple-700', className)} />
            {isSource && onAddNode && (
                <div className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 rounded-full p-0 bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                            >
                                +
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" sideOffset={8} className="w-44 p-1">
                            <div className="text-xs text-gray-500 px-2 py-1">添加节点</div>
                            {nodeItems.map(item => (
                                <button
                                    key={item.type}
                                    type="button"
                                    onClick={() => onAddNode(item.type)}
                                    className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 transition-colors text-left"
                                >
                                    <div
                                        className={clsx(
                                            'shrink-0 w-5 h-5 rounded flex items-center justify-center text-white',
                                            getColor(item.type)
                                        )}
                                    >
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-700">{item.label}</div>
                                        <div className="text-xs text-gray-400 truncate">{item.description}</div>
                                    </div>
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>
                </div>
            )}
        </XYFlowHandle>
    )
})
