'use client'

import { KeyIcon } from 'lucide-react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ApiKeyUsage as ApiKeyUsageType } from '@/lib/types/stats'

interface ApiKeyUsageProps {
    data: ApiKeyUsageType[]
    loading?: boolean
}

export function ApiKeyUsage({ data, loading }: ApiKeyUsageProps) {
    // 格式化相对时间
    const formatRelativeTime = (dateStr: string | null): string => {
        if (!dateStr) return '-'

        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMinutes = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMinutes < 1) return '刚刚'
        if (diffMinutes < 60) return `${diffMinutes} 分钟前`
        if (diffHours < 24) return `${diffHours} 小时前`
        if (diffDays < 7) return `${diffDays} 天前`
        return date.toLocaleDateString('zh-CN')
    }

    if (loading) {
        return (
            <div className="rounded-xl border bg-white p-5">
                <div className="bg-muted mb-4 h-5 w-32 animate-pulse rounded" />
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-muted h-12 animate-pulse rounded" />
                    ))}
                </div>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="rounded-xl shadow-sm bg-white p-5">
                <h3 className="mb-4 font-semibold">API Key 使用排行</h3>
                <div className="py-12 text-center">
                    <KeyIcon className="text-muted-foreground/30 mx-auto mb-3 size-12" />
                    <p className="text-muted-foreground text-sm">暂无 API Key 使用记录</p>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold">API Key 使用排行</h3>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="text-muted-foreground font-normal">名称</TableHead>
                        <TableHead className="text-muted-foreground w-[120px] text-right font-normal">调用次数</TableHead>
                        <TableHead className="text-muted-foreground w-[120px] text-right font-normal">Token 消耗</TableHead>
                        <TableHead className="text-muted-foreground w-[140px] text-right font-normal">最后使用</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground flex size-5 items-center justify-center rounded-full bg-gray-100 text-xs">
                                        {index + 1}
                                    </span>
                                    <span className="font-medium">{item.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{item.calls.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono">{item.tokens.toLocaleString()}</TableCell>
                            <TableCell className="text-muted-foreground text-right">{formatRelativeTime(item.lastUsedAt)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
