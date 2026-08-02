'use client'

import { IconCheck, IconLoader2, IconX } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

type VerifyStatus = 'loading' | 'success' | 'error'

export default function VerifyPage() {
    const [status, setStatus] = useState<VerifyStatus>('loading')
    const [message, setMessage] = useState('')
    const router = useRouter()

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const token = searchParams.get('token')

        if (!token) {
            setStatus('error')
            setMessage('缺少验证令牌')
            return
        }

        const verifyEmail = async () => {
            try {
                const response = await fetch(`/api/auth/verify?token=${token}`)
                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || '验证失败')
                }

                setStatus('success')
                setMessage(data.data?.message || '邮箱验证成功')
            } catch (error) {
                setStatus('error')
                setMessage(error instanceof Error ? error.message : '验证失败，请稍后重试')
            }
        }

        verifyEmail()
    }, [])

    const handleGoToLogin = () => {
        router.push('/account/login')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
                <div className="mb-6">
                    {status === 'loading' && (
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
                            <IconLoader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                            <IconCheck className="w-8 h-8 text-green-600" />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                            <IconX className="w-8 h-8 text-red-600" />
                        </div>
                    )}
                </div>

                <h1 className="text-2xl font-bold mb-2">
                    {status === 'loading' && '正在验证...'}
                    {status === 'success' && '验证成功'}
                    {status === 'error' && '验证失败'}
                </h1>

                <p className="text-gray-600 mb-6">{message || (status === 'loading' ? '请稍候，正在验证您的邮箱...' : '')}</p>

                {status !== 'loading' && (
                    <Button onClick={handleGoToLogin} className="w-full bg-zinc-950 hover:bg-zinc-700">
                        {status === 'success' ? '前往登录' : '返回登录页'}
                    </Button>
                )}
            </div>
        </div>
    )
}
