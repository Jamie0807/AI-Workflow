'use client'

import { useParams } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { FlowEditor } from '@/components/flow/editor'
import { appService } from '@/lib/services/app-service'
import { workflowService } from '@/lib/services/workflow-service'
import type { FlowEdge, FlowNode } from '@/lib/types/workflow'

export default function WorkflowPage() {
    const { id: appId } = useParams<{ id: string }>()
    const [loading, setLoading] = useState(true)
    const [appName, setAppName] = useState('')
    const [initialNodes, setInitialNodes] = useState<FlowNode[]>([])
    const [initialEdges, setInitialEdges] = useState<FlowEdge[]>([])

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                // 并行加载应用和工作流数据
                const [app, workflow] = await Promise.all([
                    appService.getById(appId),
                    workflowService.getByAppId(appId).catch(() => ({ nodes: [], edges: [] })),
                ])

                setAppName(app.name)
                setInitialNodes(workflow.nodes)
                setInitialEdges(workflow.edges)
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('加载数据失败:', error)
                toast.error(error instanceof Error ? error.message : '加载数据失败')
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [appId])

    if (loading) {
        return (
            <div className="flex-1 overflow-hidden flex items-center justify-center">
                <div className="text-muted-foreground">加载中...</div>
            </div>
        )
    }

    return <FlowEditor appId={appId} appName={appName} initialNodes={initialNodes} initialEdges={initialEdges} />
}
