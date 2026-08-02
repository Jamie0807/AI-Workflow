'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { DailyStat } from '@/lib/types/stats'

interface TokensChartProps {
    data: DailyStat[]
    loading?: boolean
}

const chartConfig = {
    tokens: {
        label: 'Token 消耗',
        color: 'var(--chart-3)',
    },
} satisfies ChartConfig

export function TokensChart({ data, loading }: TokensChartProps) {
    if (loading) {
        return (
            <div className="rounded-xl shadow-sm bg-white p-5">
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

    // 格式化 Token 数量
    const formatTokens = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`
        }
        if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`
        }
        return value.toString()
    }

    return (
        <div className="rounded-xl shadow-sm bg-white p-5">
            <h3 className="mb-4 font-semibold">Token 消耗</h3>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} width={50} tickFormatter={formatTokens} />
                    <ChartTooltip
                        content={<ChartTooltipContent labelFormatter={(value: string) => new Date(value).toLocaleDateString('zh-CN')} />}
                    />
                    <Bar dataKey="tokens" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
            </ChartContainer>
        </div>
    )
}
