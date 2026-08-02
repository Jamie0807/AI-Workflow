'use client'

import { AlertCircleIcon, CheckCircle2Icon, ClockIcon, CopyIcon, HashIcon, Loader2, ZapIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { TestRunState, TestRunStatus } from '@/lib/types/test-run'

interface DetailsTabProps {
    state: TestRunState
}

/**
 * Format duration to human-readable string
 */
function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${ms}ms`
    }
    if (ms < 60000) {
        return `${(ms / 1000).toFixed(2)}s`
    }
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(1)
    return `${minutes}m ${seconds}s`
}

/**
 * Format date to locale string
 */
function formatDate(date: Date | null): string {
    if (!date) return '-'
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}

/**
 * Status icon component
 */
function StatusIcon({ status }: { status: TestRunStatus }) {
    switch (status) {
        case 'running':
            return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        case 'success':
            return <CheckCircle2Icon className="h-5 w-5 text-green-500" />
        case 'error':
            return <AlertCircleIcon className="h-5 w-5 text-red-500" />
        default:
            return <ClockIcon className="h-5 w-5 text-gray-400" />
    }
}

/**
 * Status text
 */
function getStatusText(status: TestRunStatus): string {
    switch (status) {
        case 'running':
            return '运行中'
        case 'success':
            return '成功'
        case 'error':
            return '失败'
        default:
            return '等待运行'
    }
}

/**
 * JSON viewer with copy functionality
 */
function JsonSection({ title, data }: { title: string; data: unknown }) {
    const [isOpen, setIsOpen] = useState(false)
    const [copied, setCopied] = useState(false)

    const formattedJson = useMemo(() => {
        try {
            return JSON.stringify(data, null, 2)
        } catch {
            return String(data)
        }
    }, [data])

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(formattedJson)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Ignore copy errors
        }
    }

    const isEmpty = !data || (typeof data === 'object' && Object.keys(data as object).length === 0)

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition-colors">
                        <span className="text-sm font-medium">{title}</span>
                        <span className="text-xs text-muted-foreground">{isOpen ? '收起' : '展开'}</span>
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="relative border-t overflow-hidden">
                        {isEmpty ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">无数据</div>
                        ) : (
                            <>
                                <pre className="p-4 text-sm font-mono overflow-auto max-h-[300px] bg-muted/30 whitespace-pre-wrap break-all">
                                    {formattedJson}
                                </pre>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="absolute top-2 right-2"
                                    onClick={e => {
                                        e.stopPropagation()
                                        handleCopy()
                                    }}
                                >
                                    {copied ? <CheckCircle2Icon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
                                </Button>
                            </>
                        )}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    )
}

/**
 * Details Tab Component
 * Displays execution details, metadata, input/output JSON
 */
export function DetailsTab({ state }: DetailsTabProps) {
    const { status, inputs, result, startTime, endTime, duration, executionId, totalTokens } = state

    if (status === 'idle') {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">运行工作流后查看详情</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Status Summary Card */}
            <div className="border rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium">执行摘要</h4>
                <div className="grid grid-cols-2 gap-4">
                    {/* Status */}
                    <div className="flex items-center gap-2">
                        <StatusIcon status={status} />
                        <div>
                            <p className="text-xs text-muted-foreground">状态</p>
                            <p className="text-sm font-medium">{getStatusText(status)}</p>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-2">
                        <ClockIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">耗时</p>
                            <p className="text-sm font-medium">{status === 'running' ? '计算中...' : formatDuration(duration)}</p>
                        </div>
                    </div>

                    {/* Tokens */}
                    <div className="flex items-center gap-2">
                        <ZapIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Token 消耗</p>
                            <p className="text-sm font-medium">{totalTokens > 0 ? totalTokens.toLocaleString() : '-'}</p>
                        </div>
                    </div>

                    {/* Execution ID */}
                    <div className="flex items-center gap-2">
                        <HashIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">执行 ID</p>
                            <p className="text-sm font-mono truncate max-w-[120px]" title={executionId || '-'}>
                                {executionId || '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Time Info */}
            <div className="border rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium">时间信息</h4>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">开始时间</span>
                        <span className="font-mono">{formatDate(startTime)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">结束时间</span>
                        <span className="font-mono">{formatDate(endTime)}</span>
                    </div>
                </div>
            </div>

            {/* Input JSON */}
            <JsonSection title="输入参数" data={inputs} />

            {/* Output JSON */}
            <JsonSection title="输出结果" data={result?.outputs} />

            {/* Error Details */}
            {result?.error && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50 overflow-hidden">
                    <h4 className="text-sm font-medium text-red-700 mb-2">错误详情</h4>
                    <pre className="text-sm font-mono text-red-600 whitespace-pre-wrap break-all">{result.error.message}</pre>
                </div>
            )}
        </div>
    )
}
