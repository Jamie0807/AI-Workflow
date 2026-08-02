'use client'

import { ActivityIcon, CheckCircleIcon, ClockIcon, CoinsIcon, UsersIcon } from 'lucide-react'

import type { StatsOverview as StatsOverviewType } from '@/lib/types/stats'
import { cn } from '@/lib/utils'

interface StatsOverviewProps {
    data: StatsOverviewType
    loading?: boolean
}

interface StatCardProps {
    title: string
    value: string | number
    icon: React.ReactNode
    trend?: string
    trendUp?: boolean
    loading?: boolean
}

function StatCard({ title, value, icon, trend, trendUp, loading }: StatCardProps) {
    if (loading) {
        return (
            <div className="rounded-xl shadow-sm bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                    <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                    <div className="bg-muted size-8 animate-pulse rounded-lg" />
                </div>
                <div className="bg-muted h-8 w-24 animate-pulse rounded" />
            </div>
        )
    }

    return (
        <div className="rounded-xl shadow-sm bg-white p-5 transition-shadow hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-medium">{title}</span>
                <div className="bg-primary/10 text-primary rounded-lg p-2">{icon}</div>
            </div>
            <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</span>
                {trend && <span className={cn('mb-0.5 text-sm font-medium', trendUp ? 'text-green-600' : 'text-red-600')}>{trend}</span>}
            </div>
        </div>
    )
}

export function StatsOverview({ data, loading }: StatsOverviewProps) {
    // 格式化平均耗时
    const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`
        return `${(ms / 1000).toFixed(2)}s`
    }

    const cards = [
        {
            title: '总调用次数',
            value: data.totalCalls,
            icon: <ActivityIcon className="size-4" />,
        },
        {
            title: 'Token 消耗',
            value: data.totalTokens,
            icon: <CoinsIcon className="size-4" />,
        },
        {
            title: 'API Key 数',
            value: data.uniqueApiKeys,
            icon: <UsersIcon className="size-4" />,
        },
        {
            title: '成功率',
            value: `${data.successRate}%`,
            icon: <CheckCircleIcon className="size-4" />,
        },
        {
            title: '平均耗时',
            value: formatDuration(data.avgDuration),
            icon: <ClockIcon className="size-4" />,
        },
    ]

    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {cards.map(card => (
                <StatCard key={card.title} {...card} loading={loading} />
            ))}
        </div>
    )
}
