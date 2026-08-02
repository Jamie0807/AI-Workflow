'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { DailyStat } from '@/lib/types/stats'

interface CallsChartProps {
    data: DailyStat[]
    loading?: boolean
}

const chartConfig = {
    calls: {
        label: '调用次数',
        color: 'var(--chart-1)',
    },
    successCalls: {
        label: '成功',
        color: 'var(--chart-2)',
    },
    errors: {
        label: '失败',
        color: 'var(--color-destructive)',
    },
} satisfies ChartConfig

export function CallsChart({ data, loading }: CallsChartProps) {
    if (loading) {
        return (
            <div className="rounded-xl border bg-white p-5">
                <div className="bg-muted mb-4 h-5 w-24 animate-pulse rounded" />
                <div className="bg-muted h-[280px] animate-pulse rounded" />
            </div>
        )
    }

    // 格式化日期显示
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return `${date.getMonth() + 1}/${date.getDate()}`
    }

    return (
        <div className="rounded-xl shadow-sm bg-white p-5">
            <h3 className="mb-4 font-semibold">调用趋势</h3>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
                    <ChartTooltip
                        content={<ChartTooltipContent labelFormatter={(value: string) => new Date(value).toLocaleDateString('zh-CN')} />}
                    />
                    <Area
                        type="monotone"
                        dataKey="calls"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        fill="url(#callsGradient)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                    />
                </AreaChart>
            </ChartContainer>
        </div>
    )
}
