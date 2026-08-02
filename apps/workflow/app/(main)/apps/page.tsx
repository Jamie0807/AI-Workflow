'use client'

import { LayoutGridIcon, ListIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { AppCard, AppInfo } from '@/components/app-card'
import { CreateAppDialog } from '@/components/create-app-dialog'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { appService } from '@/lib/services/app-service'

// 分页配置
const DEFAULT_PAGE_SIZE = 20

export default function AppsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [createDialogOpen, setCreateDialogOpen] = useState(false)

    // 数据状态
    const [apps, setApps] = useState<AppInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)

    // 加载应用列表
    const loadApps = useCallback(async () => {
        setLoading(true)
        try {
            const response = await appService.getList({
                search: searchQuery || undefined,
                type: (typeFilter as 'workflow' | 'chatbot' | 'agent' | 'all') || undefined,
                page,
                pageSize: DEFAULT_PAGE_SIZE,
            })
            setApps(response.items)
            setTotal(response.total)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '加载应用列表失败')
        } finally {
            setLoading(false)
        }
    }, [searchQuery, typeFilter, page])

    // 创建应用成功回调
    const handleAppCreated = (newApp: AppInfo) => {
        setApps(prev => [newApp, ...prev])
        setTotal(prev => prev + 1)
        toast.success('应用创建成功')
    }

    // 删除应用回调
    const handleAppDeleted = (appId: string) => {
        setApps(prev => prev.filter(app => app.id !== appId))
        setTotal(prev => prev - 1)
        toast.success('应用删除成功')
    }

    // 更新应用回调
    const handleAppUpdated = (updatedApp: AppInfo) => {
        setApps(prev => prev.map(app => (app.id === updatedApp.id ? updatedApp : app)))
    }

    // 初始化加载
    useEffect(() => {
        loadApps()
    }, [loadApps])

    return (
        <div className="px-12 py-6">
            {/* 筛选和搜索栏 */}
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex gap-4">
                    {/* 搜索框 */}
                    <div className="relative flex-1 max-w-md">
                        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="搜索应用..."
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value)
                                setPage(1)
                            }}
                            className="pl-9 h-9"
                        />
                    </div>

                    {/* 类型筛选 */}
                    <Select
                        value={typeFilter}
                        onValueChange={value => {
                            setTypeFilter(value)
                            setPage(1)
                        }}
                    >
                        <SelectTrigger className="w-32 h-9">
                            <SelectValue placeholder="全部类型" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全部类型</SelectItem>
                            <SelectItem value="workflow">工作流</SelectItem>
                            <SelectItem value="chatbot">聊天助手</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                        </SelectContent>
                    </Select>
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

            {/* 应用列表 */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-3'}>
                {/* 创建应用卡片 */}
                <Card
                    className="flex items-center justify-center cursor-pointer border-dashed border-2 border-muted-foreground/20 hover:border-blue-400 hover:bg-blue-50/50 transition-colors min-h-[140px]"
                    onClick={() => setCreateDialogOpen(true)}
                >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <PlusIcon size={20} />
                        </div>
                        <span className="text-sm">创建应用</span>
                    </div>
                </Card>

                {/* 应用卡片列表 */}
                {loading
                    ? // 加载状态
                      Array.from({ length: 4 }).map((_, i) => <Card key={i} className="min-h-[140px] animate-pulse bg-muted/50" />)
                    : apps.map(app => (
                          <AppCard key={app.id} app={app} onDelete={() => handleAppDeleted(app.id)} onAppUpdated={handleAppUpdated} />
                      ))}
            </div>

            {/* 空状态 */}
            {!loading && apps.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <SearchIcon size={24} className="text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">{searchQuery || typeFilter !== 'all' ? '没有找到应用' : '还没有应用'}</h3>
                    <p className="text-sm text-muted-foreground">
                        {searchQuery || typeFilter !== 'all' ? '尝试调整搜索条件' : '点击上方卡片创建第一个应用'}
                    </p>
                </div>
            )}

            {/* 创建应用弹窗 */}
            <CreateAppDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onAppCreated={handleAppCreated} />
        </div>
    )
}
