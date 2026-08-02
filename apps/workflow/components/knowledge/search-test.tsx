'use client'

import { FileTextIcon, Loader2Icon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useKnowledge } from '@/lib/contexts/knowledge-context'
import type { SearchResponse } from '@/lib/services/knowledge-service'
import { knowledgeService } from '@/lib/services/knowledge-service'

export function SearchTest() {
    const { knowledgeBase } = useKnowledge()
    const [query, setQuery] = useState('')
    const [mode, setMode] = useState<'vector' | 'fulltext' | 'hybrid'>('vector')
    const [topK, setTopK] = useState(5)
    const [threshold, setThreshold] = useState(0.5)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<SearchResponse | null>(null)

    const handleSearch = async () => {
        if (!query.trim() || !knowledgeBase) return

        try {
            setLoading(true)
            const response = await knowledgeService.search(knowledgeBase.id, {
                query: query.trim(),
                mode,
                topK,
                threshold,
            })
            setResult(response)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '检索失败')
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSearch()
        }
    }

    const getModeLabel = (m: string) => {
        switch (m) {
            case 'vector':
                return '向量检索'
            case 'fulltext':
                return '全文检索'
            case 'hybrid':
                return '混合检索'
            default:
                return m
        }
    }

    return (
        <div className="flex h-full gap-6">
            {/* 左侧：搜索配置 */}
            <div className="w-80 shrink-0 space-y-6">
                <div>
                    <h2 className="text-lg font-semibold">召回测试</h2>
                    <p className="text-sm text-muted-foreground">测试知识库的检索效果</p>
                </div>

                {/* 查询输入 */}
                <div className="space-y-2">
                    <Label>查询内容</Label>
                    <div className="relative">
                        <Input
                            placeholder="输入要查询的内容..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="pr-10"
                        />
                        <SearchIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                </div>

                {/* 检索模式 */}
                <div className="space-y-2">
                    <Label>检索模式</Label>
                    <Select value={mode} onValueChange={v => setMode(v as typeof mode)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="vector">向量检索</SelectItem>
                            <SelectItem value="fulltext">全文检索</SelectItem>
                            <SelectItem value="hybrid">混合检索</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Top K */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Top K</Label>
                        <span className="text-sm text-muted-foreground">{topK}</span>
                    </div>
                    <Slider value={[topK]} onValueChange={([v]: number[]) => setTopK(v)} min={1} max={20} step={1} />
                </div>

                {/* 相似度阈值 */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>相似度阈值</Label>
                        <span className="text-sm text-muted-foreground">{threshold.toFixed(2)}</span>
                    </div>
                    <Slider value={[threshold]} onValueChange={([v]: number[]) => setThreshold(v)} min={0} max={1} step={0.05} />
                </div>

                {/* 搜索按钮 */}
                <Button className="w-full" onClick={handleSearch} disabled={loading || !query.trim() || !knowledgeBase}>
                    {loading ? (
                        <>
                            <Loader2Icon className="size-4 animate-spin" />
                            检索中...
                        </>
                    ) : (
                        <>
                            <SearchIcon className="size-4" />
                            开始检索
                        </>
                    )}
                </Button>
            </div>

            {/* 右侧：搜索结果 */}
            <div className="flex-1 overflow-auto">
                {result ? (
                    <div className="space-y-4">
                        {/* 结果统计 */}
                        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">检索结果</p>
                                <p className="font-medium">
                                    找到 {result.total} 个相关切片，耗时 {result.duration}ms
                                </p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                                <p>模式：{getModeLabel(result.mode)}</p>
                                <p>
                                    Top K: {result.topK} / 阈值: {result.threshold}
                                </p>
                            </div>
                        </div>

                        {/* 结果列表 */}
                        {result.results.length === 0 ? (
                            <div className="py-16 text-center">
                                <SearchIcon className="mx-auto mb-4 size-16 text-muted-foreground/30" />
                                <h3 className="mb-1 font-medium text-muted-foreground">未找到相关内容</h3>
                                <p className="text-sm text-muted-foreground/70">尝试调整检索参数或使用不同的查询</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {result.results.map((item, index) => (
                                    <div key={item.chunkId} className="rounded-lg border bg-white p-4 shadow-sm">
                                        <div className="mb-2 flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                                                    {index + 1}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <FileTextIcon className="size-3.5" />
                                                    {item.documentName}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-muted-foreground">切片 #{item.chunkIndex + 1}</span>
                                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
                                                    {(item.score * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <SearchIcon className="mx-auto mb-4 size-16 text-muted-foreground/30" />
                            <h3 className="mb-1 font-medium text-muted-foreground">输入查询开始测试</h3>
                            <p className="text-sm text-muted-foreground/70">在左侧输入查询内容，测试知识库的召回效果</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
