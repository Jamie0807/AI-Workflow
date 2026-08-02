'use client'

import type { LucideIcon } from 'lucide-react'
import { BarChart3Icon, BotIcon, FileTextIcon, MessageCircleIcon, SearchIcon, SparklesIcon, WrenchIcon, ZapIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type AppIconId = 'assistant' | 'chat' | 'analytics' | 'document' | 'search' | 'spark' | 'automation' | 'tools'
export type AppTone = 'indigo' | 'cyan' | 'violet' | 'amber'
export type AppType = 'workflow' | 'chatbot' | 'agent'

export interface AppIconOption {
    id: AppIconId
    label: string
    icon: LucideIcon
    tone: AppTone
    legacyValues: string[]
}

const toneStyles: Record<AppTone, { gradient: string; soft: string; text: string; accent: string }> = {
    indigo: {
        gradient: 'from-[#4F46E5] to-[#8B5CF6]',
        soft: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        text: 'text-indigo-600',
        accent: '#4F46E5',
    },
    cyan: {
        gradient: 'from-[#06B6D4] to-[#3B82F6]',
        soft: 'bg-cyan-50 text-cyan-600 border-cyan-100',
        text: 'text-cyan-600',
        accent: '#06B6D4',
    },
    violet: {
        gradient: 'from-[#7C3AED] to-[#EC4899]',
        soft: 'bg-violet-50 text-violet-600 border-violet-100',
        text: 'text-violet-600',
        accent: '#7C3AED',
    },
    amber: {
        gradient: 'from-[#F59E0B] to-[#F97316]',
        soft: 'bg-amber-50 text-amber-600 border-amber-100',
        text: 'text-amber-600',
        accent: '#F59E0B',
    },
}

export const appIconOptions: AppIconOption[] = [
    { id: 'automation', label: '工作流', icon: ZapIcon, tone: 'indigo', legacyValues: ['⚡', '🚀', '🎯'] },
    { id: 'assistant', label: '助手', icon: BotIcon, tone: 'violet', legacyValues: ['🤖', '✨', '💡'] },
    { id: 'chat', label: '对话', icon: MessageCircleIcon, tone: 'cyan', legacyValues: ['💬'] },
    { id: 'analytics', label: '分析', icon: BarChart3Icon, tone: 'cyan', legacyValues: ['📊'] },
    { id: 'document', label: '文档', icon: FileTextIcon, tone: 'amber', legacyValues: ['📄', '📝'] },
    { id: 'search', label: '检索', icon: SearchIcon, tone: 'indigo', legacyValues: ['🔍'] },
    { id: 'spark', label: '生成', icon: SparklesIcon, tone: 'violet', legacyValues: [] },
    { id: 'tools', label: '工具', icon: WrenchIcon, tone: 'amber', legacyValues: ['🔧'] },
]

export function getAppIconOption(value?: string | null): AppIconOption {
    return appIconOptions.find(option => option.id === value || option.legacyValues.includes(value || '')) || appIconOptions[0]!
}

export function getAppTypeTone(type: AppType) {
    const toneByType: Record<AppType, AppTone> = {
        workflow: 'indigo',
        chatbot: 'cyan',
        agent: 'violet',
    }

    return toneStyles[toneByType[type]]
}

interface AppIconProps {
    value?: string | null
    type?: AppType
    size?: 'sm' | 'md' | 'lg'
    className?: string
    showBadge?: boolean
}

const sizeClasses = {
    sm: 'size-9 rounded-md',
    md: 'size-12 rounded-xl',
    lg: 'size-14 rounded-xl',
}

const iconSizes = {
    sm: 18,
    md: 24,
    lg: 28,
}

export function AppIcon({ value, type = 'workflow', size = 'md', className, showBadge = false }: AppIconProps) {
    const option = getAppIconOption(value)
    const typeTone = getAppTypeTone(type)
    const Icon = option.icon

    return (
        <div className={cn('relative shrink-0', className)}>
            <div
                className={cn(
                    'flex items-center justify-center bg-linear-to-br text-white shadow-sm ring-1 ring-white/60',
                    toneStyles[option.tone].gradient,
                    sizeClasses[size]
                )}
            >
                <Icon size={iconSizes[size]} strokeWidth={2.2} />
            </div>
            {showBadge && (
                <div
                    className="absolute -bottom-1 -left-1 flex size-5 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm"
                    style={{ color: typeTone.accent }}
                >
                    <ZapIcon size={12} strokeWidth={2.5} />
                </div>
            )}
        </div>
    )
}

interface BrandLogoProps {
    size?: 'sm' | 'md'
    className?: string
}

export function BrandLogo({ size = 'md', className }: BrandLogoProps) {
    const dimension = size === 'sm' ? 'size-7 rounded-md' : 'size-9 rounded-lg'
    const iconSize = size === 'sm' ? 15 : 20

    return (
        <div
            className={cn(
                'flex items-center justify-center bg-linear-to-br from-[#4F46E5] via-[#7C3AED] to-[#06B6D4] text-white shadow-sm ring-1 ring-white/60',
                dimension,
                className
            )}
        >
            <ZapIcon size={iconSize} strokeWidth={2.4} />
        </div>
    )
}
