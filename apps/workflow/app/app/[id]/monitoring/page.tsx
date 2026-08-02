'use client'

import { useParams } from 'next/navigation'

import { MonitoringDashboard } from '@/components/monitoring'

export default function MonitoringPage() {
    const { id: appId } = useParams<{ id: string }>()

    return (
        <div className="flex-1 overflow-auto">
            <div className="mx-auto space-y-12 py-6 px-12 pb-12">
                <MonitoringDashboard appId={appId} />
            </div>
        </div>
    )
}
