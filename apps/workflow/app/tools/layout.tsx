import { GlobalHeader } from '@/components/global-header'

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen flex flex-col">
            {/* 全局顶部导航 */}
            <GlobalHeader />

            {/* 主内容区 */}
            <div className="flex-1 flex overflow-hidden">
                {/* 内容区 */}
                <main className="flex-1 flex flex-col overflow-hidden bg-[#f4f6fb]">{children}</main>
            </div>
        </div>
    )
}
