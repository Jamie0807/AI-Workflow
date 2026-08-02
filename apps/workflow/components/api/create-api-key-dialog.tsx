'use client'

import { AlertCircleIcon, CheckCircleIcon, CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiKeyService } from '@/lib/services/api-key-service'
import type { ApiKeyInfo, ApiKeyWithSecret } from '@/lib/types/api-key'

interface CreateApiKeyDialogProps {
    appId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated: (apiKey: ApiKeyInfo) => void
}

export function CreateApiKeyDialog({ appId, open, onOpenChange, onCreated }: CreateApiKeyDialogProps) {
    const [step, setStep] = useState<'create' | 'success'>('create')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [createdKey, setCreatedKey] = useState<ApiKeyWithSecret | null>(null)
    const [copied, setCopied] = useState(false)

    // 重置状态
    const resetState = () => {
        setStep('create')
        setName('')
        setLoading(false)
        setCreatedKey(null)
        setCopied(false)
    }

    // 处理关闭
    const handleClose = (newOpen: boolean) => {
        if (!newOpen) {
            resetState()
        }
        onOpenChange(newOpen)
    }

    // 创建 API Key
    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error('请输入 API Key 名称')
            return
        }

        try {
            setLoading(true)
            const newKey = await apiKeyService.create(appId, { name: name.trim() })
            setCreatedKey(newKey)
            setStep('success')
            onCreated(newKey)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '创建失败')
        } finally {
            setLoading(false)
        }
    }

    // 复制 API Key
    const handleCopy = async () => {
        if (!createdKey) return
        try {
            await navigator.clipboard.writeText(createdKey.key)
            setCopied(true)
            toast.success('API Key 已复制到剪贴板')
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error('复制失败')
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                {step === 'create' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>创建 API Key</DialogTitle>
                            <DialogDescription>为应用创建一个新的 API Key，用于外部系统调用</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">名称</Label>
                                <Input
                                    id="name"
                                    placeholder="例如：生产环境 Key"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                />
                                <p className="text-xs text-muted-foreground">给 API Key 起一个便于识别的名称</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => handleClose(false)}>
                                取消
                            </Button>
                            <Button onClick={handleCreate} disabled={loading || !name.trim()}>
                                {loading ? '创建中...' : '创建'}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircleIcon className="size-5 text-green-500" />
                                API Key 创建成功
                            </DialogTitle>
                            <DialogDescription>请立即复制并妥善保存，此 Key 只会显示一次</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            {/* 警告提示 */}
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                                <AlertCircleIcon className="size-5 text-amber-600 mt-0.5 shrink-0" />
                                <div className="text-sm text-amber-800">
                                    <p className="font-medium">重要提示</p>
                                    <p>关闭此对话框后，您将无法再次查看完整的 API Key。请确保已复制并安全保存。</p>
                                </div>
                            </div>

                            {/* API Key 显示 */}
                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <div className="flex gap-2">
                                    <Input readOnly value={createdKey?.key || ''} className="font-mono text-sm" />
                                    <Button variant="outline" onClick={handleCopy} className="shrink-0">
                                        {copied ? <CheckCircleIcon className="size-4 text-green-500" /> : <CopyIcon className="size-4" />}
                                        {copied ? '已复制' : '复制'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => handleClose(false)} disabled={!copied}>
                                {copied ? '完成' : '请先复制 API Key'}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
