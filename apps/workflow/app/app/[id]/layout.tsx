'use client'

import { useParams } from 'next/navigation'
import { useEffect } from 'react'

import { GlobalHeader } from '@/components/global-header'
import { WorkflowSidebar } from '@/components/workflow-sidebar'
import { AppProvider, useApp } from '@/lib/contexts/app-context'
import { appService } from '@/lib/services/app-service'

function AppLayoutInner({ children }: { children: React.ReactNode }) {
    const { id: appId } = useParams<{ id: string }>()
    const { setApp } = useApp()

    useEffect(() => {
        const loadApp = async () => {
            try {
                const appData = await appService.getById(appId)
                setApp({
                    id: appData.id,
                    name: appData.name,
                    description: appData.description,
                    icon: appData.icon,
                    type: appData.type,
                    tags: appData.tags,
                })
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Failed to load app:', error)
            }
        }

        if (appId) {
            loadApp()
        }
    }, [appId, setApp])

    return (
        <div className="h-screen flex flex-col">
            {/* 全局顶部导航 */}
            <GlobalHeader />

            {/* 主内容区 */}
            <div className="flex-1 flex overflow-hidden">
                {/* 左侧边栏 */}
                <WorkflowSidebar />

                {/* 内容区 */}
                <main className="flex-1 flex flex-col overflow-hidden bg-[#f4f6fb]">{children}</main>
            </div>
        </div>
    )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppProvider>
            <AppLayoutInner>{children}</AppLayoutInner>
        </AppProvider>
    )
}
