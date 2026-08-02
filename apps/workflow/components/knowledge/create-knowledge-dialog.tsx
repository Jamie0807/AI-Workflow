'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { KnowledgeBase } from '@/lib/services/knowledge-service'
import { knowledgeService } from '@/lib/services/knowledge-service'
import { cn } from '@/lib/utils'

interface CreateKnowledgeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated?: (kb: KnowledgeBase) => void
}

const defaultIcons = ['📚', '📖', '📄', '📑', '📃', '📝', '🗂️', '📁', '💡', '🔍', '🎓', '💼']

export function CreateKnowledgeDialog({ open, onOpenChange, onCreated }: CreateKnowledgeDialogProps) {
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [icon, setIcon] = useState('📚')
    const [isCreating, setIsCreating] = useState(false)

    const handleCreate = async () => {
        if (!name.trim()) return

        setIsCreating(true)
        try {
            const newKb = await knowledgeService.create({
                name: name.trim(),
                description: description.trim() || undefined,
                icon,
            })

            // 关闭对话框并重置表单
            onOpenChange(false)
            resetForm()

            // 通知父组件
            onCreated?.(newKb)

            // 跳转到知识库文档页面
            router.push(`/knowledge/${newKb.id}/documents`)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '创建知识库失败')
        } finally {
            setIsCreating(false)
        }
    }

    const resetForm = () => {
        setName('')
        setDescription('')
        setIcon('📚')
    }

    const handleClose = () => {
        resetForm()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose} modal={false}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>创建知识库</DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* 知识库图标 */}
                    <div className="space-y-2">
                        <Label>知识库图标</Label>
                        <div className="flex flex-wrap gap-2">
                            {defaultIcons.map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    className={cn(
                                        'flex h-9 w-9 items-center justify-center rounded-lg border-2 text-lg transition-colors',
                                        icon === emoji ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-muted'
                                    )}
                                    onClick={() => setIcon(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 知识库名称 */}
                    <div className="space-y-2">
                        <Label htmlFor="kb-name">
                            知识库名称 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="kb-name"
                            placeholder="请输入知识库名称"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={50}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && name.trim()) {
                                    handleCreate()
                                }
                            }}
                        />
                        <p className="text-right text-xs text-muted-foreground">{name.length}/50</p>
                    </div>

                    {/* 知识库描述 */}
                    <div className="space-y-2">
                        <Label htmlFor="kb-description">知识库描述</Label>
                        <Textarea
                            id="kb-description"
                            placeholder="请输入知识库描述（可选）"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            maxLength={200}
                        />
                        <p className="text-right text-xs text-muted-foreground">{description.length}/200</p>
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
