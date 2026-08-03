import './globals.css'

import type { Metadata } from 'next'

import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
    title: 'AI 工作流引擎',
    description: '基于 Next.js 构建的 AI 工作流引擎',
    icons: {
        icon: '/icon.svg',
        shortcut: '/icon.svg',
    },
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body>
                {children}
                <Toaster richColors position="top-center" />
            </body>
        </html>
    )
}
