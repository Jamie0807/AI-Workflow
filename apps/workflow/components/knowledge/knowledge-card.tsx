'use client'

import { FileTextIcon, MoreHorizontalIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

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
import { Card } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { KnowledgeBase } from '@/lib/services/knowledge-service'
import { knowledgeService } from '@/lib/services/knowledge-service'

interface KnowledgeCardProps {
    knowledge: KnowledgeBase
    onDelete?: (id: string) => void
}

const statusLabels: Record<KnowledgeBase['status'], { label: string; color: string }> = {
    READY: { label: '就绪', color: 'bg-green-100 text-green-600' },
    INDEXING: { label: '索引中', color: 'bg-blue-100 text-blue-600' },
    ERROR: { label: '异常', color: 'bg-red-100 text-red-600' },
}

const modeLabels: Record<KnowledgeBase['retrievalMode'], string> = {
    VECTOR: '向量',
    FULLTEXT: '全文',
    HYBRID: '混合',
}

export function KnowledgeCard({ knowledge, onDelete }: KnowledgeCardProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault()
        ev.stopPropagation()
        setIsDeleting(true)
        try {
            await knowledgeService.delete(knowledge.id)
            setDeleteDialogOpen(false)
            onDelete?.(knowledge.id)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '删除知识库失败')
        } finally {
            setIsDeleting(false)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
        })
    }

    return (
        <>
            <Card className="group cursor-pointer overflow-hidden border-muted-foreground/10 transition-shadow hover:shadow-md">
                <Link href={`/knowledge/${knowledge.id}/documents`}>
                    <div className="p-4">
                        {/* 顶部：图标 + 信息 */}
                        <div className="mb-6 flex items-start gap-3">
                            {/* 知识库图标 */}
                            <div className="relative shrink-0">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-2xl shadow-sm">
                                    {knowledge.icon}
                                </div>
                            </div>

                            {/* 知识库信息 */}
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-base font-semibold">{knowledge.name}</h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">更新于 {formatDate(knowledge.updatedAt)}</p>
                            </div>
                        </div>

                        {/* 底部：统计 + 操作 */}
                        <div className="flex items-center justify-between">
                            {/* 统计信息 */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <FileTextIcon className="size-3.5" />
                                    {knowledge.documentCount} 文档
                                </span>
                                <span className="rounded-full bg-muted px-2 py-0.5">{modeLabels[knowledge.retrievalMode]}</span>
                            </div>

                            {/* 操作菜单 */}
                            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                                <DropdownMenuTrigger asChild onClick={e => e.preventDefault()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        <MoreHorizontalIcon size={16} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href={`/knowledge/${knowledge.id}/documents`}>查看文档</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={`/knowledge/${knowledge.id}/settings`}>设置</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={ev => {
                                            ev.preventDefault()
                                            setDropdownOpen(false)
                                            setDeleteDialogOpen(true)
                                        }}
                                    >
                                        删除
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </Link>
            </Card>

            {/* 删除确认对话框 */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除知识库 <strong>{knowledge.name}</strong> 吗？所有文档和向量数据将被永久删除，此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                            {isDeleting ? '删除中...' : '确认删除'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
