'use client'

import { createContext, useContext, useState } from 'react'

export interface AppInfo {
    id: string
    name: string
    description: string | null
    icon: string
    type: 'workflow' | 'chatbot' | 'agent'
    tags: string[]
}

interface AppContextValue {
    app: AppInfo | null
    setApp: (app: AppInfo | null) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [app, setApp] = useState<AppInfo | null>(null)

    return <AppContext.Provider value={{ app, setApp }}>{children}</AppContext.Provider>
}

export function useApp() {
    const context = useContext(AppContext)
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider')
    }
    return context
}
