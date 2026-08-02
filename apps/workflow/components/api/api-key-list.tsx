'use client'

import { CopyIcon, KeyIcon, MoreHorizontalIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiKeyService } from '@/lib/services/api-key-service'
import type { ApiKeyInfo } from '@/lib/types/api-key'

import { CreateApiKeyDialog } from './create-api-key-dialog'

interface ApiKeyListProps {
    appId: string
}

export function ApiKeyList({ appId }: ApiKeyListProps) {
    const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)

    // 加载 API Key 列表
    const loadApiKeys = useCallback(async () => {
        try {
            setLoading(true)
            const response = await apiKeyService.getList(appId)
            setApiKeys(response.items)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '加载 API Key 列表失败')
        } finally {
            setLoading(false)
        }
    }, [appId])

    // 切换 API Key 状态
    const handleToggleStatus = async (keyId: string, isActive: boolean) => {
        try {
            const updatedKey = await apiKeyService.update(appId, keyId, { isActive })
            setApiKeys(prev => prev.map(key => (key.id === keyId ? updatedKey : key)))
            toast.success(isActive ? 'API Key 已启用' : 'API Key 已禁用')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '更新状态失败')
        }
    }

    // 删除 API Key
    const handleDelete = async (keyId: string) => {
        try {
            await apiKeyService.delete(appId, keyId)
            setApiKeys(prev => prev.filter(key => key.id !== keyId))
            toast.success('API Key 已删除')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '删除失败')
        }
    }

    // 复制 Key 前缀
    const handleCopy = (keyPrefix: string) => {
        navigator.clipboard.writeText(keyPrefix)
        toast.success('已复制到剪贴板')
    }

    // 创建成功回调
    const handleCreated = (newKey: ApiKeyInfo) => {
        setApiKeys(prev => [newKey, ...prev])
    }

    // 格式化日期
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    // 检查是否过期
    const isExpired = (expiresAt: string | null) => {
        if (!expiresAt) return false
        return new Date(expiresAt) < new Date()
    }

    // 渲染状态
    const renderStatus = (apiKey: ApiKeyInfo) => {
        if (isExpired(apiKey.expiresAt)) {
            return (
                <span className="inline-flex items-center gap-1.5 font-medium text-red-600">
                    <span className="size-2 rounded-full bg-red-500" />
                    已过期
                </span>
            )
        }
        if (apiKey.isActive) {
            return (
                <span className="inline-flex items-center gap-1.5 font-medium text-green-600">
                    <span className="size-2 rounded-full bg-green-500" />
                    启用
                </span>
            )
        }
        return (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 font-medium">
                <span className="bg-muted-foreground/50 size-2 rounded-full" />
                禁用
            </span>
        )
    }

    useEffect(() => {
        loadApiKeys()
    }, [loadApiKeys])

    return (
        <div>
            {/* 标题和操作 */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">API Keys</h2>
                    <p className="text-muted-foreground text-sm">管理应用的 API 访问密钥，用于外部系统调用</p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <PlusIcon className="size-4" />
                    创建 API Key
                </Button>
            </div>

            {/* 内容 */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : apiKeys.length === 0 ? (
                <div className="py-16 text-center">
                    <KeyIcon className="text-muted-foreground/30 mx-auto mb-4 size-16" />
                    <h3 className="text-muted-foreground mb-1 font-medium">还没有 API Key</h3>
                    <p className="text-muted-foreground/70 mb-4 text-sm">创建 API Key 以便外部系统调用此应用</p>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                        <PlusIcon className="size-4" />
                        创建第一个 API Key
                    </Button>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-muted-foreground font-normal">名称</TableHead>
                            <TableHead className="text-muted-foreground font-normal">Key</TableHead>
                            <TableHead className="text-muted-foreground w-[100px] font-normal">状态</TableHead>
                            <TableHead className="text-muted-foreground w-[100px] font-normal">使用次数</TableHead>
                            <TableHead className="text-muted-foreground font-normal">最后使用</TableHead>
                            <TableHead className="text-muted-foreground font-normal">过期时间</TableHead>
                            <TableHead className="text-muted-foreground font-normal">创建时间</TableHead>
                            <TableHead className="text-muted-foreground w-[60px] font-normal">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {apiKeys.map(apiKey => (
                            <TableRow key={apiKey.id} className="hover:bg-muted/30">
                                <TableCell className="font-medium">{apiKey.name}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-muted rounded px-2 py-1 text-xs">{apiKey.keyPrefix}</code>
                                        <Button variant="ghost" size="icon-sm" onClick={() => handleCopy(apiKey.keyPrefix)}>
                                            <CopyIcon className="size-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={apiKey.isActive}
                                            onCheckedChange={checked => handleToggleStatus(apiKey.id, checked)}
                                            disabled={isExpired(apiKey.expiresAt)}
                                        />
                                        {renderStatus(apiKey)}
                                    </div>
                                </TableCell>
                                <TableCell className="text-foreground">{apiKey.usageCount}</TableCell>
                                <TableCell className="text-muted-foreground">{formatDate(apiKey.lastUsedAt)}</TableCell>
                                <TableCell className={isExpired(apiKey.expiresAt) ? 'text-red-600' : 'text-muted-foreground'}>
                                    {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : '永不过期'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{formatDate(apiKey.createdAt)}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon-sm">
                                                <MoreHorizontalIcon className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(apiKey.id)}>
                                                <TrashIcon className="size-4" />
                                                删除
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* 创建 API Key 对话框 */}
            <CreateApiKeyDialog appId={appId} open={createDialogOpen} onOpenChange={setCreateDialogOpen} onCreated={handleCreated} />
        </div>
    )
}
