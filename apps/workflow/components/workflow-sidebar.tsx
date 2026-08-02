'use client'

import { ActivityIcon, CodeIcon, FileTextIcon, LayoutDashboardIcon, SettingsIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { AppIcon } from '@/components/app-icon'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/contexts/app-context'

import { Separator } from './ui/separator'

const menuItems = [
    { title: '编排', url: 'workflow', icon: LayoutDashboardIcon },
    { title: '访问 API', url: 'api', icon: CodeIcon },
    { title: '日志', url: 'execution-logs', icon: FileTextIcon },
    { title: '监测', url: 'monitoring', icon: ActivityIcon },
]

const appTypeLabels: Record<string, string> = {
    workflow: '工作流',
    chatbot: '聊天助手',
    agent: 'Agent',
}

export function WorkflowSidebar() {
    const pathname = usePathname()
    const { app } = useApp()

    const isActive = (url: string) => pathname.includes(`/${url}`)

    return (
        <aside className="w-[220px] bg-violet-50/20 flex flex-col shrink-0">
            {/* 应用信息 */}
            <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                    <AppIcon value={app?.icon} type={app?.type || 'workflow'} size="sm" />
                    {/* 设置按钮 */}
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground">
                        <SettingsIcon size={16} />
                    </Button>
                </div>
                {/* 应用名称 */}
                <h2 className="font-semibold text-sm truncate" title={app?.name}>
                    {app?.name || '加载中...'}
                </h2>
                <p className="text-xs text-muted-foreground">{app ? appTypeLabels[app.type] : '工作流'}</p>
            </div>

            <Separator className="my-2 bg-muted-foreground/10" />

            {/* 导航菜单 */}
            <nav className="flex-1 p-2">
                <ul className="space-y-1">
                    {menuItems.map(item => {
                        const active = isActive(item.url)
                        return (
                            <li key={item.url}>
                                <Link href={`/app/${app?.id || ''}/${item.url}`}>
                                    <Button
                                        variant={active ? 'secondary' : 'ghost'}
                                        className={`w-full justify-start h-9 ${
                                            active ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium' : 'text-muted-foreground'
                                        }`}
                                        disabled={!app}
                                    >
                                        <item.icon size={16} />
                                        {item.title}
                                    </Button>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        </aside>
    )
}
