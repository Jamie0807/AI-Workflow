'use client'

import { useParams } from 'next/navigation'
import { useEffect } from 'react'

import { KnowledgeSidebar } from '@/components/knowledge/knowledge-sidebar'
import { KnowledgeProvider, useKnowledge } from '@/lib/contexts/knowledge-context'
import { knowledgeService } from '@/lib/services/knowledge-service'

function KnowledgeDetailLayoutInner({ children }: { children: React.ReactNode }) {
    const { id: knowledgeBaseId } = useParams<{ id: string }>()
    const { setKnowledgeBase, isRefreshing } = useKnowledge()

    useEffect(() => {
        const loadKnowledgeBase = async () => {
            try {
                const data = await knowledgeService.getById(knowledgeBaseId)
                setKnowledgeBase(data)
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Failed to load knowledge base:', error)
            }
        }

        if (knowledgeBaseId) {
            loadKnowledgeBase()
        }
    }, [knowledgeBaseId, setKnowledgeBase, isRefreshing])

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* 左侧边栏 */}
            <KnowledgeSidebar />

            {/* 内容区 */}
            <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
        </div>
    )
}

export default function KnowledgeDetailLayout({ children }: { children: React.ReactNode }) {
    return (
        <KnowledgeProvider>
            <KnowledgeDetailLayoutInner>{children}</KnowledgeDetailLayoutInner>
        </KnowledgeProvider>
    )
}
