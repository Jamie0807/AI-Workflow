'use client'

import { ArrowLeftIcon, CheckCircle2, ChevronDownIcon, ExternalLink, Globe, History, Play, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { memo, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

import { ExecutionHistoryDropdown } from '../execution-history'

interface PublishStatus {
    isPublished: boolean
    publishedAt?: string | null
}

export type EditorMode = 'edit' | 'detail'

interface FlowEditorHeaderProps {
    appName?: string
    appId?: string
    mode?: EditorMode
    hasUnsavedChanges?: boolean
    isSaving?: boolean
    lastSavedAt?: string | null
    onSave?: () => void
    onTestRun?: () => void
    onExitTestRun?: () => void
    onSelectExecution?: (executionId: string) => void
}

export const FlowEditorHeader = memo(function FlowEditorHeader({
    appName,
    appId = '',
    mode = 'edit',
    hasUnsavedChanges = false,
    isSaving = false,
    lastSavedAt,
    onSave,
    onTestRun,
    onExitTestRun,
    onSelectExecution,
}: FlowEditorHeaderProps) {
    const [publishStatus, setPublishStatus] = useState<PublishStatus>({ isPublished: false })
    const [isPublishing, setIsPublishing] = useState(false)

    // 获取发布状态
    const fetchPublishStatus = useCallback(async () => {
        if (!appId) return

        try {
            const response = await fetch(`/api/apps/${appId}/publish`)
            if (response.ok) {
                const result = await response.json()
                if (result.success && result.data) {
                    setPublishStatus({
                        isPublished: result.data.isPublished || false,
                        publishedAt: result.data.publishedAt,
                    })
                }
            }
        } catch {
            // Ignore error
        }
    }, [appId])

    useEffect(() => {
        fetchPublishStatus()
    }, [fetchPublishStatus])

    // 发布应用
    const handlePublish = async () => {
        if (!appId) return

        setIsPublishing(true)
        try {
            const response = await fetch(`/api/apps/${appId}/publish`, {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                toast.error(error.message || '发布失败')
                return
            }

            const result = await response.json()
            setPublishStatus({
                isPublished: true,
                publishedAt: new Date().toISOString(),
            })
            toast.success(result.data.message || '应用发布成功！')
        } catch (error) {
            toast.error('发布失败，请重试')
        } finally {
            setIsPublishing(false)
        }
    }

    // 取消发布
    const handleUnpublish = async () => {
        if (!appId) return

        setIsPublishing(true)
        try {
            const response = await fetch(`/api/apps/${appId}/unpublish`, {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                toast.error(error.message || '取消发布失败')
                return
            }

            setPublishStatus({ isPublished: false })
            toast.success('已取消发布')
        } catch (error) {
            toast.error('取消发布失败，请重试')
        } finally {
            setIsPublishing(false)
        }
    }

    // 格式化发布时间
    const formatPublishTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return '刚刚'
        if (diffMins < 60) return `${diffMins} 分钟前`
        if (diffHours < 24) return `${diffHours} 小时前`
        return `${diffDays} 天前`
    }

    // Detail Mode Header (viewing execution history)
    if (mode === 'detail') {
        return (
            <div className="flex items-center justify-between px-4 py-2 bg-transparent absolute top-0 left-0 w-full z-10">
                <div className="text-sm font-medium">执行详情</div>
                <Button variant="outline" size="sm" onClick={onExitTestRun}>
                    <ArrowLeftIcon className="h-4 w-4 mr-1" />
                    返回编辑
                </Button>
            </div>
        )
    }

    // Edit Mode Header
    const historyButton = (
        <Button variant="outline" size="icon-sm">
            <History />
        </Button>
    )

    return (
        <div className="flex items-center justify-between px-4 py-2 bg-transparent absolute top-0 left-0 w-full z-10">
            <div className="text-xs text-muted-foreground">
                {isSaving ? (
                    <span>保存中...</span>
                ) : hasUnsavedChanges ? (
                    <span>未保存</span>
                ) : lastSavedAt ? (
                    <span>已保存 {lastSavedAt}</span>
                ) : (
                    <span>自动保存</span>
                )}
            </div>
            <div className="flex gap-2 shrink-0">
                <ButtonGroup>
                    <Button variant="outline" size="sm" onClick={onTestRun}>
                        <Play /> 测试运行
                    </Button>
                    {appId && onSelectExecution ? (
                        <ExecutionHistoryDropdown appId={appId} onSelectExecution={onSelectExecution}>
                            {historyButton}
                        </ExecutionHistoryDropdown>
                    ) : (
                        historyButton
                    )}
                </ButtonGroup>

                <Button variant="outline" size="sm" disabled={!hasUnsavedChanges || isSaving} onClick={onSave}>
                    {isSaving ? '保存中...' : '保存'}
                </Button>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={publishStatus.isPublished ? 'secondary' : 'default'}
                            size="sm"
                            aria-label="Open Popover"
                            className={cn(publishStatus.isPublished && 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200')}
                        >
                            {publishStatus.isPublished ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    已发布
                                </>
                            ) : (
                                <>
                                    <Globe className="h-4 w-4 mr-1" />
                                    发布
                                </>
                            )}
                            <ChevronDownIcon className="h-4 w-4 ml-1" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" sideOffset={6} className="rounded-xl p-0 text-sm bg-white w-80">
                        {publishStatus.isPublished ? (
                            <>
                                {/* 已发布状态 */}
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span className="font-medium">已发布</span>
                                        {publishStatus.publishedAt && (
                                            <span className="text-xs text-muted-foreground">
                                                · {formatPublishTime(publishStatus.publishedAt)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 space-y-2">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="w-full"
                                        onClick={handlePublish}
                                        disabled={isPublishing || hasUnsavedChanges}
                                    >
                                        {isPublishing ? '更新中...' : hasUnsavedChanges ? '请先保存后更新' : '更新发布'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={handleUnpublish}
                                        disabled={isPublishing}
                                    >
                                        {isPublishing ? '处理中...' : '取消发布'}
                                    </Button>
                                    <Separator className="my-2 bg-gray-100" />
                                    {process.env.NEXT_PUBLIC_WEBAPP_URL && (
                                        <Link
                                            className="flex items-center rounded-md px-4 py-1.5 bg-gray-100 hover:bg-gray-200"
                                            href={`${process.env.NEXT_PUBLIC_WEBAPP_URL}/workflow/${appId}`}
                                            target="_blank"
                                        >
                                            <PlayCircle className="h-4 w-4 mr-2" />
                                            运行
                                        </Link>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* 未发布状态 */}
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">发布应用</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">发布后可通过 API 调用此工作流</p>
                                </div>
                                <Separator />
                                <div className="p-3">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="w-full"
                                        onClick={handlePublish}
                                        disabled={isPublishing || hasUnsavedChanges}
                                    >
                                        {isPublishing ? '发布中...' : hasUnsavedChanges ? '请先保存' : '立即发布'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </PopoverContent>
                </Popover>

                {/* <Button variant="outline" size="icon-sm">
                    <IconHistory />
                </Button> */}
            </div>
        </div>
    )
})
