'use client'

import { FileTextIcon, FilterIcon, Loader2Icon, RefreshCwIcon, SearchIcon, Trash2Icon, UploadIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ChunkDrawer } from '@/components/knowledge/chunk-drawer'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useKnowledge } from '@/lib/contexts/knowledge-context'
import type { Document } from '@/lib/services/knowledge-service'
import { knowledgeService } from '@/lib/services/knowledge-service'
import { cn } from '@/lib/utils'

// 状态选项
const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'PROCESSING', label: '处理中' },
    { value: 'PENDING', label: '等待中' },
    { value: 'ERROR', label: '失败' },
]

export function DocumentList() {
    const { knowledgeBase, refreshKnowledgeBase } = useKnowledge()
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // 筛选条件
    const [status, setStatus] = useState<string>('all')
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')

    // 弹窗状态
    const [statusOpen, setStatusOpen] = useState(false)

    // 抽屉状态
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)

    // 删除中的文档 ID
    const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

    // 删除确认弹窗
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string } | null>(null)

    // 加载文档列表
    const loadDocuments = useCallback(async () => {
        if (!knowledgeBase) return
        try {
            setLoading(true)
            const response = await knowledgeService.listDocuments(knowledgeBase.id, {
                page,
                pageSize: 20,
                status: status === 'all' ? undefined : status,
            })
            setDocuments(response.items)
            setTotal(response.meta.total)
            setTotalPages(response.meta.totalPages)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '加载文档列表失败')
        } finally {
            setLoading(false)
        }
    }, [knowledgeBase, page, status])

    // 打开切片抽屉
    const openChunkDrawer = (doc: Document) => {
        if (doc.status !== 'COMPLETED') return
        setSelectedDocument(doc)
        setDrawerOpen(true)
    }

    // 上传文件
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0 || !knowledgeBase) return

        setUploading(true)
        let successCount = 0

        for (const file of Array.from(files)) {
            try {
                await knowledgeService.uploadDocument(knowledgeBase.id, file)
                successCount++
            } catch (error) {
                toast.error(`上传 ${file.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`)
            }
        }

        if (successCount > 0) {
            toast.success(`成功上传 ${successCount} 个文档`)
            loadDocuments()
            refreshKnowledgeBase()
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
        setUploading(false)
    }

    // 打开删除确认弹窗
    const openDeleteDialog = (docId: string, docName: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setDocumentToDelete({ id: docId, name: docName })
        setDeleteDialogOpen(true)
    }

    // 确认删除文档
    const confirmDelete = async () => {
        if (!knowledgeBase || !documentToDelete) return

        try {
            setDeletingDocId(documentToDelete.id)
            setDeleteDialogOpen(false)
            await knowledgeService.deleteDocument(knowledgeBase.id, documentToDelete.id)
            toast.success('文档已删除')
            loadDocuments()
            refreshKnowledgeBase()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '删除失败')
        } finally {
            setDeletingDocId(null)
            setDocumentToDelete(null)
        }
    }

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

    // 格式化文件大小
    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    // 格式化日期时间
    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    // 渲染状态
    const renderStatus = (docStatus: Document['status']) => {
        switch (docStatus) {
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                        <span className="size-2 rounded-full bg-green-400" />
                        已完成
                    </span>
                )
            case 'PROCESSING':
                return (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                        <span className="size-2 animate-pulse rounded-full bg-blue-500" />
                        处理中
                    </span>
                )
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-600">
                        <span className="size-2 rounded-full bg-yellow-400" />
                        等待中
                    </span>
                )
            case 'ERROR':
                return (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                        <span className="size-2 rounded-full bg-red-500" />
                        失败
                    </span>
                )
            default:
                return <span>{docStatus}</span>
        }
    }

    useEffect(() => {
        loadDocuments()
    }, [loadDocuments])

    return (
        <div>
            {/* 标题和操作栏 */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">文档</h2>
                    <p className="text-sm text-muted-foreground">管理知识库中的文档</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadDocuments} disabled={loading}>
                        <RefreshCwIcon className={cn('size-4', loading && 'animate-spin')} />
                        刷新
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".txt,.md,.pdf,.doc,.docx"
                        onChange={handleUpload}
                        className="hidden"
                    />
                    <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading || !knowledgeBase}>
                        <UploadIcon className="size-4" />
                        {uploading ? '上传中...' : '上传文档'}
                    </Button>
                </div>
            </div>

            {/* 筛选栏 */}
            <div className="mb-4 flex items-center gap-2">
                {/* 状态筛选 */}
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3">
                            <FilterIcon className="size-3.5" />
                            {STATUS_OPTIONS.find(o => o.value === status)?.label || '全部'}
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
                                    'w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent',
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

                {/* 搜索框 */}
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="搜索文档"
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
            ) : documents.length === 0 ? (
                <div className="py-16 text-center">
                    <FileTextIcon className="mx-auto mb-4 size-16 text-muted-foreground/30" />
                    <h3 className="mb-1 font-medium text-muted-foreground">暂无文档</h3>
                    <p className="text-sm text-muted-foreground/70">上传文档后，将自动进行切片和向量化处理</p>
                </div>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-none hover:bg-transparent">
                                <TableHead className="w-80 rounded-l-lg bg-violet-50/50 font-normal text-muted-foreground">
                                    文档名称
                                </TableHead>
                                <TableHead className="w-24 bg-violet-50/50 font-normal text-muted-foreground">大小</TableHead>
                                <TableHead className="w-20 bg-violet-50/50 font-normal text-muted-foreground">切片数</TableHead>
                                <TableHead className="w-24 bg-violet-50/50 font-normal text-muted-foreground">状态</TableHead>
                                <TableHead className="bg-violet-50/50 font-normal text-muted-foreground">处理时间</TableHead>
                                <TableHead className="w-20 rounded-r-lg bg-violet-50/50 text-right font-normal text-muted-foreground">
                                    操作
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map(doc => (
                                <TableRow
                                    key={doc.id}
                                    className={cn(
                                        'border-b border-violet-50/50 hover:bg-muted/30',
                                        doc.status === 'COMPLETED' && 'cursor-pointer'
                                    )}
                                    onClick={() => openChunkDrawer(doc)}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <FileTextIcon className="size-4 text-blue-500" />
                                            <span className="truncate text-foreground" title={doc.originalName}>
                                                {doc.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-foreground">{formatSize(doc.size)}</TableCell>
                                    <TableCell className="text-foreground">{doc.chunkCount}</TableCell>
                                    <TableCell>{renderStatus(doc.status)}</TableCell>
                                    <TableCell className="text-muted-foreground">{formatDateTime(doc.processedAt)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                                            onClick={e => openDeleteDialog(doc.id, doc.name, e)}
                                            disabled={deletingDocId === doc.id}
                                        >
                                            {deletingDocId === doc.id ? (
                                                <Loader2Icon className="size-4 animate-spin" />
                                            ) : (
                                                <Trash2Icon className="size-4" />
                                            )}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* 分页 */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
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

            {/* 切片详情抽屉 */}
            <ChunkDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                document={selectedDocument}
                knowledgeBaseId={knowledgeBase?.id || ''}
            />

            {/* 删除确认弹窗 */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除文档 <strong className="text-foreground">{documentToDelete?.name}</strong> 吗？
                            <br />
                            此操作不可恢复，文档的所有切片数据也将被删除。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
