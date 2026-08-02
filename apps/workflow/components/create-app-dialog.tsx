'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import type { AppInfo } from '@/components/app-card'
import { appIconOptions } from '@/components/app-icon'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { appService } from '@/lib/services/app-service'
import { cn } from '@/lib/utils'

type AppType = 'workflow' | 'chatbot' | 'agent'

interface CreateAppDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onAppCreated?: (app: AppInfo) => void
}

export function CreateAppDialog({ open, onOpenChange, onAppCreated }: CreateAppDialogProps) {
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [icon, setIcon] = useState('automation')
    const [isCreating, setIsCreating] = useState(false)

    const handleCreate = async () => {
        if (!name.trim()) return

        setIsCreating(true)
        try {
            const newApp = await appService.create({
                name: name.trim(),
                description: description.trim() || undefined,
                icon,
                type: 'workflow',
                tags: [],
            })

            // 关闭对话框并重置表单
            onOpenChange(false)
            resetForm()

            // 通知父组件
            onAppCreated?.(newApp)

            // 跳转到应用编辑页面
            router.push(`/app/${newApp.id}/workflow`)
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('创建应用失败:', error)
            toast.error(error instanceof Error ? error.message : '创建应用失败')
        } finally {
            setIsCreating(false)
        }
    }

    const resetForm = () => {
        setName('')
        setDescription('')
        setIcon('automation')
    }

    const handleClose = () => {
        resetForm()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose} modal={false}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>创建应用</DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* 应用图标 */}
                    <div className="space-y-2">
                        <Label>应用图标</Label>
                        <div className="flex flex-wrap gap-2">
                            {appIconOptions.map(option => {
                                const Icon = option.icon
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        className={cn(
                                            'flex h-9 items-center gap-2 rounded-lg border-2 px-3 text-sm transition-colors',
                                            icon === option.id
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-transparent hover:bg-muted'
                                        )}
                                        onClick={() => setIcon(option.id)}
                                    >
                                        <Icon size={16} />
                                        {option.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 应用名称 */}
                    <div className="space-y-2">
                        <Label htmlFor="app-name">
                            应用名称 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="app-name"
                            placeholder="请输入应用名称"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={50}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && name.trim()) {
                                    handleCreate()
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground text-right">{name.length}/50</p>
                    </div>

                    {/* 应用描述 */}
                    <div className="space-y-2">
                        <Label htmlFor="app-description">应用描述</Label>
                        <Textarea
                            id="app-description"
                            placeholder="请输入应用描述（可选）"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            maxLength={200}
                        />
                        <p className="text-xs text-muted-foreground text-right">{description.length}/200</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                        取消
                    </Button>
                    <Button onClick={handleCreate} disabled={!name.trim() || isCreating} className="bg-blue-600 hover:bg-blue-700">
                        {isCreating ? '创建中...' : '创建'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
