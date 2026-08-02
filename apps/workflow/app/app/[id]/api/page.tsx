'use client'

import { useParams } from 'next/navigation'

import { ApiDocumentation, ApiKeyList } from '@/components/api'
import { useApp } from '@/lib/contexts/app-context'

export default function ApiPage() {
    const { id: appId } = useParams<{ id: string }>()
    const { app } = useApp()

    return (
        <div className="flex-1 overflow-auto bg-white">
            <div className="mx-auto max-w-6xl space-y-12 p-6 pb-12">
                {/* API Key 管理 */}
                <ApiKeyList appId={appId} />

                {/* 分隔线 */}
                <hr className="border-border" />

                {/* 接入文档 */}
                <ApiDocumentation appId={appId} appName={app?.name || '应用'} />
            </div>
        </div>
    )
}
