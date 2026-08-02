'use client'

import { BrainIcon, ChevronDownIcon, FileTextIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Document, DocumentChunk, DocumentStats } from '@/lib/services/knowledge-service'
import { knowledgeService } from '@/lib/services/knowledge-service'
import { cn } from '@/lib/utils'

interface ChunkDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    document: Document | null
    knowledgeBaseId: string
}

export function ChunkDrawer({ open, onOpenChange, document, knowledgeBaseId }: ChunkDrawerProps) {
    const [loading, setLoading] = useState(false)
    const [chunks, setChunks] = useState<DocumentChunk[]>([])
    const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null)
    const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (open && document) {
            loadChunks()
        } else {
            setChunks([])
            setDocumentStats(null)
            setExpandedChunks(new Set())
        }
    }, [open, document])

    const loadChunks = async () => {
        if (!document) return
        try {
            setLoading(true)
            const response = await knowledgeService.getDocumentChunks(knowledgeBaseId, document.id)
            setChunks(response.chunks)
            setDocumentStats(response.documentStats)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '加载切片失败')
        } finally {
            setLoading(false)
        }
    }

    const toggleChunk = (chunkId: string) => {
        setExpandedChunks(prev => {
            const next = new Set(prev)
            if (next.has(chunkId)) {
                next.delete(chunkId)
            } else {
                next.add(chunkId)
            }
            return next
        })
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[800px] sm:max-w-[800px] p-0 flex flex-col">
                <SheetHeader className="p-4 pb-0">
                    <SheetTitle className="flex items-center gap-2">
                        <FileTextIcon className="size-5 text-blue-500" />
                        {document?.name || '文档切片'}
                    </SheetTitle>
                </SheetHeader>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* 文档统计信息 */}
                        {documentStats && (
                            <div className="px-4 py-3 bg-muted/30 border-b">
                                <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground text-xs">切片数</p>
                                        <p className="font-medium">{chunks.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">总字符</p>
                                        <p className="font-medium">{documentStats.totalChars.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">嵌入模型</p>
                                        <p className="font-medium text-xs truncate" title={documentStats.embeddingModel}>
                                            {documentStats.embeddingModel.split(':')[0]}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">向量维度</p>
                                        <p className="font-medium">{documentStats.embeddingDimensions}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 切片列表 */}
                        <ScrollArea className="flex-1 h-0">
                            <div className="p-4 space-y-3">
                                {chunks.map((chunk, index) => (
                                    <Collapsible
                                        key={chunk.chunkId}
                                        open={expandedChunks.has(chunk.chunkId)}
                                        onOpenChange={() => toggleChunk(chunk.chunkId)}
                                    >
                                        <div className="rounded-lg border bg-white overflow-hidden">
                                            {/* 切片头部 */}
                                            <CollapsibleTrigger asChild>
                                                <button className="w-full p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors text-left">
                                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm leading-relaxed line-clamp-3">{chunk.content}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Badge variant="secondary" className="text-xs">
                                                                {chunk.charCount} 字符
                                                            </Badge>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {chunk.wordCount} 词
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <ChevronDownIcon
                                                        className={cn(
                                                            'size-4 shrink-0 text-muted-foreground transition-transform',
                                                            expandedChunks.has(chunk.chunkId) && 'rotate-180'
                                                        )}
                                                    />
                                                </button>
                                            </CollapsibleTrigger>

                                            {/* 展开详情 */}
                                            <CollapsibleContent>
                                                <div className="border-t bg-muted/20">
                                                    {/* 完整内容 */}
                                                    <div className="p-3 border-b">
                                                        <p className="text-xs font-medium text-muted-foreground mb-2">完整内容</p>
                                                        <div className="rounded-md border bg-white p-3">
                                                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{chunk.content}</p>
                                                        </div>
                                                    </div>

                                                    {/* Embedding 统计 */}
                                                    {chunk.embeddingStats && (
                                                        <div className="p-3 border-b">
                                                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                                                                <BrainIcon className="size-3.5" />
                                                                Embedding 统计
                                                            </p>
                                                            <div className="grid grid-cols-6 gap-2">
                                                                <div className="rounded-md border bg-white p-2 text-center">
                                                                    <p className="text-xs text-muted-foreground">维度</p>
                                                                    <p className="font-medium">{chunk.embeddingStats.dimensions}</p>
                                                                </div>
                                                                <div className="rounded-md border bg-white p-2 text-center">
                                                                    <p className="text-xs text-muted-foreground">L2范数</p>
                                                                    <p className="font-mono text-sm">{chunk.embeddingStats.norm}</p>
                                                                </div>
                                                                <div className="rounded-md border bg-white p-2 text-center">
                                                                    <p className="text-xs text-muted-foreground">均值</p>
                                                                    <p className="font-mono text-sm">{chunk.embeddingStats.mean}</p>
                                                                </div>
                                                                <div className="rounded-md border bg-white p-2 text-center">
                                                                    <p className="text-xs text-muted-foreground">标准差</p>
                                                                    <p className="font-mono text-sm">{chunk.embeddingStats.std}</p>
                                                                </div>
                                                                <div className="rounded-md border bg-white p-2 text-center">
                                                                    <p className="text-xs text-muted-foreground">最小值</p>
                                                                    <p className="font-mono text-sm">{chunk.embeddingStats.min}</p>
                                                                </div>
                                                                <div className="rounded-md border bg-white p-2 text-center">
                                                                    <p className="text-xs text-muted-foreground">最大值</p>
                                                                    <p className="font-mono text-sm">{chunk.embeddingStats.max}</p>
                                                                </div>
                                                            </div>
                                                            {/* 向量预览 */}
                                                            <div className="mt-2">
                                                                <p className="text-xs text-muted-foreground mb-1">向量预览 (前10维)</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {chunk.embeddingStats.preview.map((val, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className="px-1.5 py-0.5 rounded bg-white border text-xs font-mono"
                                                                        >
                                                                            {val}
                                                                        </span>
                                                                    ))}
                                                                    <span className="px-1.5 py-0.5 text-xs text-muted-foreground">...</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 元数据 */}
                                                    <div className="p-3">
                                                        <p className="text-xs font-medium text-muted-foreground mb-2">元数据</p>
                                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                                            <div className="flex justify-between rounded-md border bg-white px-2 py-1.5">
                                                                <span className="text-muted-foreground">Chunk ID</span>
                                                                <span
                                                                    className="font-mono text-xs truncate max-w-[180px]"
                                                                    title={chunk.chunkId}
                                                                >
                                                                    {chunk.chunkId}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between rounded-md border bg-white px-2 py-1.5">
                                                                <span className="text-muted-foreground">索引</span>
                                                                <span>{chunk.chunkIndex}</span>
                                                            </div>
                                                            <div className="flex justify-between rounded-md border bg-white px-2 py-1.5">
                                                                <span className="text-muted-foreground">起始位置</span>
                                                                <span className="font-mono">{chunk.startOffset}</span>
                                                            </div>
                                                            <div className="flex justify-between rounded-md border bg-white px-2 py-1.5">
                                                                <span className="text-muted-foreground">结束位置</span>
                                                                <span className="font-mono">{chunk.endOffset}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CollapsibleContent>
                                        </div>
                                    </Collapsible>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
