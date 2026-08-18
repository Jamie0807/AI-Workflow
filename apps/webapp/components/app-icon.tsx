'use client'

import type { LucideIcon } from 'lucide-react'
import { BarChart3Icon, BotIcon, FileTextIcon, MessageCircleIcon, SearchIcon, SparklesIcon, WrenchIcon, ZapIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type AppIconId = 'assistant' | 'chat' | 'analytics' | 'document' | 'search' | 'spark' | 'automation' | 'tools'
type AppTone = 'indigo' | 'cyan' | 'violet' | 'amber'

interface AppIconOption {
    id: AppIconId
    icon: LucideIcon
    tone: AppTone
    legacyValues: string[]
}

const toneGradients: Record<AppTone, string> = {
    indigo: 'from-[#4F46E5] to-[#8B5CF6]',
    cyan: 'from-[#06B6D4] to-[#3B82F6]',
    violet: 'from-[#7C3AED] to-[#EC4899]',
    amber: 'from-[#F59E0B] to-[#F97316]',
}

const appIconOptions: AppIconOption[] = [
    { id: 'automation', icon: ZapIcon, tone: 'indigo', legacyValues: ['⚡', '🚀', '🎯'] },
    { id: 'assistant', icon: BotIcon, tone: 'violet', legacyValues: ['🤖', '✨', '💡'] },
    { id: 'chat', icon: MessageCircleIcon, tone: 'cyan', legacyValues: ['💬'] },
    { id: 'analytics', icon: BarChart3Icon, tone: 'cyan', legacyValues: ['📊'] },
    { id: 'document', icon: FileTextIcon, tone: 'amber', legacyValues: ['📄', '📝'] },
    { id: 'search', icon: SearchIcon, tone: 'indigo', legacyValues: ['🔍'] },
    { id: 'spark', icon: SparklesIcon, tone: 'violet', legacyValues: [] },
    { id: 'tools', icon: WrenchIcon, tone: 'amber', legacyValues: ['🔧'] },
]

function getAppIconOption(value?: string | null): AppIconOption {
    return appIconOptions.find(option => option.id === value || option.legacyValues.includes(value || '')) || appIconOptions[0]!
}

interface AppIconProps {
    value?: string | null
    className?: string
}

export function AppIcon({ value, className }: AppIconProps) {
    const option = getAppIconOption(value)
    const Icon = option.icon

    return (
        <div
            className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm ring-1 ring-white/60',
                toneGradients[option.tone],
                className
            )}
            aria-hidden="true"
        >
            <Icon size={24} strokeWidth={2.2} />
        </div>
    )
}
