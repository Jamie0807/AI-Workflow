'use client'

import { BookOpenIcon, LayoutGridIcon, ListIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { CreateKnowledgeDialog } from '@/components/knowledge/create-knowledge-dialog'
import { KnowledgeCard } from '@/components/knowledge/knowledge-card'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { KnowledgeBase } from '@/lib/services/knowledge-service'
import { knowledgeService } from '@/lib/services/knowledge-service'

// 分页配置
const DEFAULT_PAGE_SIZE = 20

export default function KnowledgePage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [createDialogOpen, setCreateDialogOpen] = useState(false)

    // 数据状态
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)

    // 加载知识库列表
    const loadKnowledgeBases = useCallback(async () => {
        setLoading(true)
        try {
            const response = await knowledgeService.list({
                search: searchQuery || undefined,
                page,
                pageSize: DEFAULT_PAGE_SIZE,
            })
            setKnowledgeBases(response.items)
            setTotal(response.meta.total)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '加载知识库列表失败')
        } finally {
            setLoading(false)
        }
    }, [searchQuery, page])

    // 创建知识库成功回调
    const handleCreated = (newKb: KnowledgeBase) => {
        setKnowledgeBases(prev => [newKb, ...prev])
        setTotal(prev => prev + 1)
        toast.success('知识库创建成功')
    }

    // 删除知识库回调
    const handleDeleted = (id: string) => {
        setKnowledgeBases(prev => prev.filter(kb => kb.id !== id))
        setTotal(prev => prev - 1)
        toast.success('知识库删除成功')
    }

    // 初始化加载
    useEffect(() => {
        loadKnowledgeBases()
    }, [loadKnowledgeBases])

    return (
        <div className="px-12 py-6">
            {/* 筛选和搜索栏 */}
            <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex gap-4">
                    {/* 搜索框 */}
                    <div className="relative max-w-md flex-1">
                        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="搜索知识库..."
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value)
                                setPage(1)
                            }}
                            className="h-9 pl-9"
                        />
                    </div>
                </div>

                {/* 视图切换 */}
                <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'grid' | 'list')}>
                    <TabsList className="h-9">
                        <TabsTrigger value="grid" className="px-2">
                            <LayoutGridIcon size={16} />
                        </TabsTrigger>
                        <TabsTrigger value="list" className="px-2">
                            <ListIcon size={16} />
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* 知识库列表 */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'space-y-3'}>
                {/* 创建知识库卡片 */}
                <Card
                    className="flex min-h-[140px] cursor-pointer items-center justify-center border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                    onClick={() => setCreateDialogOpen(true)}
                >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <PlusIcon size={20} />
                        </div>
                        <span className="text-sm">创建知识库</span>
                    </div>
                </Card>

                {/* 知识库卡片列表 */}
                {loading
                    ? // 加载状态
                      Array.from({ length: 4 }).map((_, i) => <Card key={i} className="min-h-[140px] animate-pulse bg-muted/50" />)
                    : knowledgeBases.map(kb => <KnowledgeCard key={kb.id} knowledge={kb} onDelete={handleDeleted} />)}
            </div>

            {/* 空状态 */}
            {!loading && knowledgeBases.length === 0 && (
                <div className="py-16 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <BookOpenIcon size={24} className="text-muted-foreground" />
                    </div>
                    <h3 className="mb-1 font-medium">{searchQuery ? '没有找到知识库' : '还没有知识库'}</h3>
                    <p className="text-sm text-muted-foreground">{searchQuery ? '尝试调整搜索条件' : '点击上方卡片创建第一个知识库'}</p>
                </div>
            )}

            {/* 创建知识库弹窗 */}
            <CreateKnowledgeDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onCreated={handleCreated} />
        </div>
    )
}
