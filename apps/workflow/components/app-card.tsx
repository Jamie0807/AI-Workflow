'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import { AppIcon } from '@/components/app-icon'
import { EditAppDialog } from '@/components/edit-app-dialog'
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
import { appService } from '@/lib/services/app-service'

export interface AppInfo {
    id: string
    name: string
    description: string
    icon: string
    type: 'workflow' | 'chatbot' | 'agent'
    updatedAt: string
    author?: string
    tags?: string[]
}

interface AppCardProps {
    app: AppInfo
    onDelete?: (appId: string) => void
    onAppUpdated?: (app: AppInfo) => void
}

export function AppCard({ app, onDelete, onAppUpdated }: AppCardProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleEditClick = (ev: React.MouseEvent<HTMLDivElement>) => {
        ev.preventDefault()
        setDropdownOpen(false)
        setEditDialogOpen(true)
    }

    const handleDelete = async (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault()
        ev.stopPropagation()
        setDropdownOpen(false) // 关闭 dropdown
        setIsDeleting(true)
        try {
            await appService.delete(app.id)
            setDeleteDialogOpen(false)
            onDelete?.(app.id)
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('删除应用失败:', error)
            toast.error(error instanceof Error ? error.message : '删除应用失败')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <Card className="group hover:shadow-md transition-shadow cursor-pointer border-muted-foreground/10 overflow-hidden">
                <Link href={`/app/${app.id}/workflow`}>
                    <div className="p-4">
                        {/* 顶部：图标 + 信息 */}
                        <div className="flex items-start gap-3 mb-6">
                            <AppIcon value={app.icon} type={app.type} showBadge />

                            {/* 应用信息 */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-base truncate">{app.name}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {app.author || '未知'} · 编辑于 {app.updatedAt}
                                </p>
                            </div>
                        </div>

                        {/* 底部：标签 + 操作 */}
                        <div className="flex items-center justify-between">
                            {/* 标签 */}
                            {app.tags && app.tags.length > 0 ? (
                                <div className="flex items-center gap-1">
                                    {app.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                            {tag}
                                        </span>
                                    ))}
                                    {app.tags.length > 2 && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                            +{app.tags.length - 2}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div />
                            )}

                            {/* 操作菜单 */}
                            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                                <DropdownMenuTrigger asChild onClick={e => e.preventDefault()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <MoreHorizontalIcon size={16} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href={`/app/${app.id}/workflow`}>编辑</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleEditClick}>编辑信息</DropdownMenuItem>
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
                            确定要删除应用 <strong>{app.name}</strong> 吗？此操作不可撤销。
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

            {/* 编辑信息对话框 */}
            <EditAppDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} app={app} onAppUpdated={onAppUpdated} />
        </>
    )
}
