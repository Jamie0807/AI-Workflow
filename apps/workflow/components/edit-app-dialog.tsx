'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { AppInfo } from '@/components/app-card'
import { appIconOptions, getAppIconOption } from '@/components/app-icon'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { appService } from '@/lib/services/app-service'
import { cn } from '@/lib/utils'

interface EditAppDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    app: AppInfo
    onAppUpdated?: (app: AppInfo) => void
}

export function EditAppDialog({ open, onOpenChange, app, onAppUpdated }: EditAppDialogProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [icon, setIcon] = useState('automation')
    const [isSaving, setIsSaving] = useState(false)

    // 当 app 变化时，更新表单值
    useEffect(() => {
        if (app) {
            setName(app.name)
            setDescription(app.description || '')
            setIcon(getAppIconOption(app.icon).id)
        }
    }, [app])

    const handleSave = async () => {
        if (!name.trim()) return

        setIsSaving(true)
        try {
            const updatedApp = await appService.update(app.id, {
                name: name.trim(),
                description: description.trim() || undefined,
                icon,
            })

            // 关闭对话框
            onOpenChange(false)

            // 通知父组件
            onAppUpdated?.(updatedApp)

            toast.success('应用信息已更新')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '更新应用失败')
        } finally {
            setIsSaving(false)
        }
    }

    const handleClose = () => {
        if (app) {
            setName(app.name)
            setDescription(app.description || '')
            setIcon(getAppIconOption(app.icon).id)
        }
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>编辑应用信息</DialogTitle>
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
                        <Label htmlFor="edit-app-name">
                            应用名称 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="edit-app-name"
                            placeholder="请输入应用名称"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={50}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && name.trim()) {
                                    handleSave()
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground text-right">{name.length}/50</p>
                    </div>

                    {/* 应用描述 */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-app-description">应用描述</Label>
                        <Textarea
                            id="edit-app-description"
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
                    <Button variant="outline" onClick={handleClose} disabled={isSaving}>
                        取消
                    </Button>
                    <Button onClick={handleSave} disabled={!name.trim() || isSaving} className="bg-blue-600 hover:bg-blue-700">
                        {isSaving ? '保存中...' : '保存'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
