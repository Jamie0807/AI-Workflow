import { notFound } from 'next/navigation'

import { WorkflowRunner } from '@/components/workflow-runner'
import { prisma } from '@/lib/prisma'

interface PageProps {
    params: Promise<{ id: string }>
}

// Get published app with workflow data
async function getPublishedApp(appId: string) {
    const app = await prisma.app.findFirst({
        where: {
            id: appId,
            isDeleted: false,
            isPublished: true,
            activePublishedId: { not: null },
        },
        include: {
            activePublished: true,
        },
    })

    if (!app || !app.activePublished) {
        return null
    }

    return {
        id: app.id,
        name: app.name,
        icon: app.icon,
        description: app.description,
        publishedApp: {
            id: app.activePublished.id,
            version: app.activePublished.version,
            nodes: app.activePublished.nodes as unknown[],
            edges: app.activePublished.edges as unknown[],
        },
    }
}

// Extract input fields from start node
function extractInputFields(nodes: unknown[]): Array<{ name: string; type: 'string' | 'number'; label?: string }> {
    const startNode = (nodes as Array<{ type: string; data?: { config?: { inputs?: unknown[] } } }>).find(n => n.type === 'start')
    if (!startNode?.data?.config?.inputs) {
        return []
    }

    return (startNode.data.config.inputs as Array<{ name: string; type: string; label?: string }>).map(v => ({
        name: v.name,
        type: v.type === 'number' ? 'number' : 'string',
        label: v.label || v.name,
    }))
}

export default async function WorkflowPage({ params }: PageProps) {
    const { id } = await params
    const appData = await getPublishedApp(id)

    if (!appData) {
        notFound()
    }

    const inputFields = extractInputFields(appData.publishedApp.nodes)

    return <WorkflowRunner appId={appData.id} appName={appData.name} appIcon={appData.icon} inputs={inputFields} />
}
