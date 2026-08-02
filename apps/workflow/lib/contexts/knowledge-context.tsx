'use client'

import { createContext, useCallback, useContext, useState } from 'react'

import type { KnowledgeBaseDetail } from '@/lib/services/knowledge-service'

interface KnowledgeContextType {
    knowledgeBase: KnowledgeBaseDetail | null
    setKnowledgeBase: (kb: KnowledgeBaseDetail | null) => void
    refreshKnowledgeBase: () => void
    isRefreshing: boolean
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined)

export function KnowledgeProvider({ children }: { children: React.ReactNode }) {
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseDetail | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [refreshCount, setRefreshCount] = useState(0)

    const refreshKnowledgeBase = useCallback(() => {
        setIsRefreshing(true)
        setRefreshCount(c => c + 1)
        // isRefreshing will be set to false by the consumer after fetching
        setTimeout(() => setIsRefreshing(false), 100)
    }, [])

    return (
        <KnowledgeContext.Provider
            value={{
                knowledgeBase,
                setKnowledgeBase,
                refreshKnowledgeBase,
                isRefreshing,
            }}
        >
            {children}
        </KnowledgeContext.Provider>
    )
}

export function useKnowledge() {
    const context = useContext(KnowledgeContext)
    if (context === undefined) {
        throw new Error('useKnowledge must be used within a KnowledgeProvider')
    }
    return context
}
