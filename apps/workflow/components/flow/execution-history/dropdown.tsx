'use client'

import { AlertCircleIcon, CheckCircle2Icon, ClockIcon, Loader2, ZapIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { ExecutionStatus } from '@/app/generated/prisma/enums'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ExecutionRecord {
    id: string
    executionId: string
    status: ExecutionStatus
    duration: number | null
    totalTokens: number
    startedAt: string
}

interface ExecutionHistoryDropdownProps {
    appId: string
    onSelectExecution: (executionId: string) => void
    children: React.ReactElement
}

/**
 * Format duration to human-readable string
 */
function formatDuration(ms: number | null): string {
    if (ms === null) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(1)
    return `${minutes}m ${seconds}s`
}

/**
 * Format date to relative time
 */
function formatRelativeTime(date: string): string {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()

    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`

    return then.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

/**
 * Status icon component
 */
function StatusIcon({ status }: { status: ExecutionStatus }) {
    switch (status) {
        case 'RUNNING':
            return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
        case 'SUCCESS':
            return <CheckCircle2Icon className="h-3 w-3 text-green-500" />
        case 'ERROR':
            return <AlertCircleIcon className="h-3 w-3 text-red-500" />
        default:
            return <ClockIcon className="h-3 w-3 text-gray-400" />
    }
}

const PAGE_SIZE = 20

/**
 * Execution History Dropdown Component with infinite scroll
 */
export function ExecutionHistoryDropdown({ appId, onSelectExecution, children }: ExecutionHistoryDropdownProps) {
    const [executions, setExecutions] = useState<ExecutionRecord[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [open, setOpen] = useState(false)

    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Fetch execution history
    const fetchExecutions = useCallback(
        async (cursor: string | null = null, isLoadMore = false) => {
            if (isLoadMore) {
                setIsLoadingMore(true)
            } else {
                setIsLoading(true)
            }

            try {
                const url = new URL(`/api/apps/${appId}/workflow/executions`, window.location.origin)
                url.searchParams.set('limit', String(PAGE_SIZE))
                if (cursor) {
                    url.searchParams.set('cursor', cursor)
                }

                const response = await fetch(url.toString())
                const data = await response.json()

                if (data.success) {
                    const newExecutions = data.data.executions

                    if (isLoadMore) {
                        setExecutions(prev => [...prev, ...newExecutions])
                    } else {
                        setExecutions(newExecutions)
                    }

                    setHasMore(data.data.hasMore)
                    setNextCursor(data.data.nextCursor)
                } else {
                    toast.error(data.error || '获取执行历史失败')
                }
            } catch {
                toast.error('获取执行历史失败')
            } finally {
                setIsLoading(false)
                setIsLoadingMore(false)
            }
        },
        [appId]
    )

    // Load more when scrolling to bottom
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current
        if (!container || isLoadingMore || !hasMore) return

        const { scrollTop, scrollHeight, clientHeight } = container
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

        // Load more when scrolled to 80% of the content
        if (scrollPercentage > 0.8) {
            // Debounce to prevent multiple calls
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current)
            }

            fetchTimeoutRef.current = setTimeout(() => {
                fetchExecutions(nextCursor, true)
            }, 200)
        }
    }, [isLoadingMore, hasMore, nextCursor, fetchExecutions])

    // Reset and fetch when dropdown opens
    useEffect(() => {
        if (open) {
            setExecutions([])
            setNextCursor(null)
            fetchExecutions(null, false)
        }
        // Cleanup timeout on unmount
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current)
            }
        }
    }, [open, appId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Attach scroll listener
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        container.addEventListener('scroll', handleScroll)
        return () => {
            container.removeEventListener('scroll', handleScroll)
        }
    }, [handleScroll])

    const handleSelect = (executionId: string) => {
        onSelectExecution(executionId)
        setOpen(false)
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center gap-2">
                    <span>执行历史</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                        {executions.length} 条{hasMore && '+'}
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isLoading && executions.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : executions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                        <ClockIcon className="h-5 w-5 mx-auto mb-2 opacity-50" />
                        暂无执行记录
                    </div>
                ) : (
                    <div ref={scrollContainerRef} className="max-h-[300px] overflow-y-auto">
                        {executions.map(execution => (
                            <DropdownMenuItem
                                key={execution.id}
                                onSelect={() => handleSelect(execution.id)}
                                className="flex items-center gap-3 cursor-pointer py-2"
                            >
                                <StatusIcon status={execution.status} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{execution.executionId}</p>
                                    <p className="text-xs text-muted-foreground">{formatRelativeTime(execution.startedAt)}</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{formatDuration(execution.duration)}</span>
                                    {execution.totalTokens > 0 && (
                                        <span className="flex items-center gap-0.5">
                                            <ZapIcon className="h-3 w-3" />
                                            {execution.totalTokens}
                                        </span>
                                    )}
                                </div>
                            </DropdownMenuItem>
                        ))}

                        {/* Loading more indicator */}
                        {isLoadingMore && (
                            <div className="flex items-center justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {/* End of list indicator */}
                        {!hasMore && executions.length > 0 && (
                            <div className="text-center py-2 text-xs text-muted-foreground">已加载全部记录</div>
                        )}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
