'use client'

import { CalendarIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { statsService } from '@/lib/services/stats-service'
import type { StatsResponse } from '@/lib/types/stats'
import { cn } from '@/lib/utils'

import { ApiKeyUsage } from './api-key-usage'
import { CallsChart } from './calls-chart'
import { StatsOverview } from './stats-overview'
import { TokensChart } from './tokens-chart'

interface MonitoringDashboardProps {
    appId: string
}

// 时间范围选项
const PERIOD_OPTIONS = [
    { value: '7d', label: '过去 7 天' },
    { value: '30d', label: '过去 30 天' },
    { value: '90d', label: '过去 90 天' },
] as const

type Period = (typeof PERIOD_OPTIONS)[number]['value']

export function MonitoringDashboard({ appId }: MonitoringDashboardProps) {
    const [stats, setStats] = useState<StatsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<Period>('7d')
    const [periodOpen, setPeriodOpen] = useState(false)

    // 加载统计数据
    const loadStats = useCallback(async () => {
        try {
            setLoading(true)
            const data = await statsService.getStats(appId, { period })
            setStats(data)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '加载统计数据失败')
        } finally {
            setLoading(false)
        }
    }, [appId, period])

    // 获取当前时间范围的显示文本
    const getPeriodLabel = () => {
        return PERIOD_OPTIONS.find(o => o.value === period)?.label || '过去 7 天'
    }

    useEffect(() => {
        loadStats()
    }, [loadStats])

    // 默认的空统计数据
    const emptyOverview = {
        totalCalls: 0,
        totalTokens: 0,
        uniqueApiKeys: 0,
        avgDuration: 0,
        successRate: 0,
    }

    return (
        <div>
            {/* 标题和筛选 */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">监测</h2>
                    <p className="text-muted-foreground text-sm">查看应用的使用情况和性能指标</p>
                </div>

                {/* 时间范围筛选 */}
                <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3">
                            <CalendarIcon className="size-3.5" />
                            {getPeriodLabel()}
                            {period !== '7d' && (
                                <XIcon
                                    className="size-3.5 opacity-50 hover:opacity-100"
                                    onClick={e => {
                                        e.stopPropagation()
                                        setPeriod('7d')
                                    }}
                                />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-32 p-1" align="end">
                        {PERIOD_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                className={cn(
                                    'hover:bg-accent w-full rounded px-2 py-1.5 text-left text-sm',
                                    period === option.value && 'bg-accent'
                                )}
                                onClick={() => {
                                    setPeriod(option.value)
                                    setPeriodOpen(false)
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-6">
                {/* 概览卡片 */}
                <StatsOverview data={stats?.overview || emptyOverview} loading={loading} />

                {/* 图表区域 */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <CallsChart data={stats?.dailyStats || []} loading={loading} />
                    <TokensChart data={stats?.dailyStats || []} loading={loading} />
                </div>

                {/* API Key 使用排行 */}
                <ApiKeyUsage data={stats?.topApiKeys || []} loading={loading} />
            </div>
        </div>
    )
}
