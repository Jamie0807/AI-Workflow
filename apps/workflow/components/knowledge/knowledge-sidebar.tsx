'use client'

import { FileTextIcon, SearchIcon, SettingsIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useKnowledge } from '@/lib/contexts/knowledge-context'

const menuItems = [
    { title: '文档', url: 'documents', icon: FileTextIcon },
    { title: '召回测试', url: 'search', icon: SearchIcon },
    { title: '设置', url: 'settings', icon: SettingsIcon },
]

export function KnowledgeSidebar() {
    const pathname = usePathname()
    const { knowledgeBase } = useKnowledge()

    const isActive = (url: string) => pathname.includes(`/${url}`)

    return (
        <aside className="w-[220px] bg-violet-50/20 flex flex-col shrink-0">
            {/* 知识库信息 */}
            <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                    {/* 知识库图标 */}
                    <div className="w-10 h-10 rounded-md bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <span className="text-xl">{knowledgeBase?.icon || '📚'}</span>
                    </div>
                </div>
                {/* 知识库名称 */}
                <h2 className="font-semibold text-sm truncate" title={knowledgeBase?.name}>
                    {knowledgeBase?.name || '加载中...'}
                </h2>
                <p className="text-xs text-muted-foreground">{knowledgeBase ? `${knowledgeBase.documentCount} 个文档` : '知识库'}</p>
            </div>

            <Separator className="my-2 bg-muted-foreground/10" />

            {/* 导航菜单 */}
            <nav className="flex-1 p-2">
                <ul className="space-y-1">
                    {menuItems.map(item => {
                        const active = isActive(item.url)
                        return (
                            <li key={item.url}>
                                <Link href={`/knowledge/${knowledgeBase?.id || ''}/${item.url}`}>
                                    <Button
                                        variant={active ? 'secondary' : 'ghost'}
                                        className={`w-full justify-start h-9 ${
                                            active ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium' : 'text-muted-foreground'
                                        }`}
                                        disabled={!knowledgeBase}
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

            {/* 统计信息 */}
            {knowledgeBase && (
                <>
                    <Separator className="my-2 bg-muted-foreground/10" />
                    <div className="p-3 text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                            <span>切片数</span>
                            <span>{knowledgeBase.chunkCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>检索模式</span>
                            <span>
                                {knowledgeBase.retrievalMode === 'VECTOR'
                                    ? '向量'
                                    : knowledgeBase.retrievalMode === 'FULLTEXT'
                                      ? '全文'
                                      : '混合'}
                            </span>
                        </div>
                    </div>
                </>
            )}
        </aside>
    )
}
