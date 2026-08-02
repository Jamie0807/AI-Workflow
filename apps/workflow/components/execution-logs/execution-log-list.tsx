'use client'

import { CalendarIcon, FilterIcon, GlobeIcon, SearchIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { ExecutionStatus } from '@/app/generated/prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { executionService } from '@/lib/services/execution-service'
import type { ExecutionLogInfo, ExecutionLogQuery } from '@/lib/types/execution'
import { cn } from '@/lib/utils'

interface ExecutionLogListProps {
    appId: string
}

// 状态选项
const STATUS_OPTIONS: { value: ExecutionLogQuery['status']; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'SUCCESS', label: 'SUCCESS' },
    { value: 'ERROR', label: 'ERROR' },
    { value: 'RUNNING', label: 'RUNNING' },
]

// 时间范围选项
const TIME_RANGE_OPTIONS = [
    { value: '7', label: '过去 7 天' },
    { value: '30', label: '过去 30 天' },
    { value: '90', label: '过去 90 天' },
    { value: 'all', label: '全部时间' },
]

export function ExecutionLogList({ appId }: ExecutionLogListProps) {
    const [logs, setLogs] = useState<ExecutionLogInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)

    // 筛选条件
    const [status, setStatus] = useState<ExecutionLogQuery['status']>('all')
    const [timeRange, setTimeRange] = useState<string>('7')
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')

    // 弹窗状态
    const [statusOpen, setStatusOpen] = useState(false)
    const [timeOpen, setTimeOpen] = useState(false)

    // 计算日期范围
    const getDateRange = useCallback(() => {
        if (timeRange === 'all') {
            return { startDate: undefined, endDate: undefined }
        }
        const days = parseInt(timeRange, 10)
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        }
    }, [timeRange])

    // 加载执行日志列表
    const loadLogs = useCallback(async () => {
        try {
            setLoading(true)
            const { startDate, endDate } = getDateRange()
            const response = await executionService.getList(appId, {
                page,
                pageSize: 20,
                status,
                startDate,
                endDate,
                search: search || undefined,
            })
            setLogs(response.items)
            setTotal(response.total)
            setTotalPages(response.totalPages)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '加载执行日志失败')
        } finally {
            setLoading(false)
        }
    }, [appId, page, status, getDateRange, search])

    // 处理搜索
    const handleSearch = () => {
        setSearch(searchInput)
        setPage(1)
    }

    // 处理按键
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    // 格式化日期时间
    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
    }

    // 格式化运行时间
    const formatDuration = (ms: number | null) => {
        if (ms === null) return '-'
        if (ms < 1000) return `${ms}ms`
        return `${(ms / 1000).toFixed(3)}s`
    }

    // 渲染状态
    const renderStatus = (logStatus: ExecutionStatus) => {
        switch (logStatus) {
            case 'SUCCESS':
                return (
                    <span className="inline-flex items-center gap-1.5 font-medium text-xs text-green-600">
                        <span className="size-2 rounded-full bg-green-400" />
                        SUCCESS
                    </span>
                )
            case 'ERROR':
                return (
                    <span className="inline-flex items-center gap-1.5 font-medium text-red-600">
                        <span className="size-2 rounded-full bg-red-500" />
                        ERROR
                    </span>
                )
            case 'RUNNING':
                return (
                    <span className="inline-flex items-center gap-1.5 font-medium text-blue-600">
                        <span className="size-2 animate-pulse rounded-full bg-blue-500" />
                        RUNNING
                    </span>
                )
            default:
                return <span>{logStatus}</span>
        }
    }

    // 获取当前时间范围的显示文本
    const getTimeRangeLabel = () => {
        return TIME_RANGE_OPTIONS.find(o => o.value === timeRange)?.label || '过去 7 天'
    }

    useEffect(() => {
        loadLogs()
    }, [loadLogs])

    return (
        <div>
            {/* 标题 */}
            <div className="mb-4">
                <h2 className="text-lg font-semibold">日志</h2>
                <p className="text-muted-foreground text-sm">日志记录了应用的执行情况</p>
            </div>

            {/* 筛选栏 */}
            <div className="mb-4 flex items-center gap-2">
                {/* 状态筛选 */}
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3">
                            <FilterIcon className="size-3.5" />
                            {status === 'all' ? 'All' : status}
                            {status !== 'all' && (
                                <XIcon
                                    className="size-3.5 opacity-50 hover:opacity-100"
                                    onClick={e => {
                                        e.stopPropagation()
                                        setStatus('all')
                                        setPage(1)
                                    }}
                                />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-32 p-1" align="start">
                        {STATUS_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                className={cn(
                                    'hover:bg-accent w-full rounded px-2 py-1.5 text-left text-sm',
                                    status === option.value && 'bg-accent'
                                )}
                                onClick={() => {
                                    setStatus(option.value)
                                    setPage(1)
                                    setStatusOpen(false)
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </PopoverContent>
                </Popover>

                {/* 时间范围筛选 */}
                <Popover open={timeOpen} onOpenChange={setTimeOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3">
                            <CalendarIcon className="size-3.5" />
                            {getTimeRangeLabel()}
                            {timeRange !== '7' && (
                                <XIcon
                                    className="size-3.5 opacity-50 hover:opacity-100"
                                    onClick={e => {
                                        e.stopPropagation()
                                        setTimeRange('7')
                                        setPage(1)
                                    }}
                                />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-32 p-1" align="start">
                        {TIME_RANGE_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                className={cn(
                                    'hover:bg-accent w-full rounded px-2 py-1.5 text-left text-sm',
                                    timeRange === option.value && 'bg-accent'
                                )}
                                onClick={() => {
                                    setTimeRange(option.value)
                                    setPage(1)
                                    setTimeOpen(false)
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </PopoverContent>
                </Popover>

                {/* 搜索框 */}
                <div className="relative">
                    <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                        placeholder="搜索"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSearch}
                        className="h-8 w-[200px] rounded-full pl-9"
                    />
                </div>
            </div>

            {/* 表格 */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : logs.length === 0 ? (
                <div className="py-16 text-center">
                    <GlobeIcon className="text-muted-foreground/30 mx-auto mb-4 size-16" />
                    <h3 className="text-muted-foreground mb-1 font-medium">暂无执行日志</h3>
                    <p className="text-muted-foreground/70 text-sm">应用通过 API 被调用后，日志将显示在这里</p>
                </div>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="text-muted-foreground w-50 font-normal bg-violet-50/50 rounded-l-lg">
                                    执行开始时间
                                </TableHead>
                                <TableHead className="text-muted-foreground w-35 font-normal bg-violet-50/50">状态</TableHead>
                                <TableHead className="text-muted-foreground w-50 font-normal bg-violet-50/50">运行时间</TableHead>
                                <TableHead className="text-muted-foreground w-50 font-normal bg-violet-50/50">TOKENS 消耗</TableHead>
                                <TableHead className="text-muted-foreground font-normal bg-violet-50/50">用户/账户</TableHead>
                                <TableHead className="text-muted-foreground w-50 text-right font-normal bg-violet-50/50 rounded-r-lg">
                                    触发来源
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map(log => (
                                <TableRow key={log.id} className="hover:bg-muted/30 border-b border-violet-50/50">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="size-1 rounded-full bg-blue-500" />
                                            <span className="text-foreground">{formatDateTime(log.startedAt)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderStatus(log.status)}</TableCell>
                                    <TableCell className="text-foreground">{formatDuration(log.duration)}</TableCell>
                                    <TableCell className="text-foreground">{log.totalTokens.toLocaleString()}</TableCell>
                                    <TableCell className="text-muted-foreground">{log.apiKeyName || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-sm text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                                            <GlobeIcon className="size-3.5" />
                                            网页应用
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* 分页 */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-muted-foreground text-sm">
                                共 {total} 条记录，第 {page}/{totalPages} 页
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                    上一页
                                </Button>
                                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                    下一页
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
