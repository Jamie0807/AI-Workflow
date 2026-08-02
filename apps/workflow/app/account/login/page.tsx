'use client'

import { BotIcon, DatabaseIcon, GitBranchIcon, Globe2Icon, KeyRoundIcon, WorkflowIcon, ZapIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { BrandLogo } from '@/components/app-icon'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

interface LoginFormValues {
    email: string
    password: string
    name?: string
}

export default function LoginPage() {
    const form = useForm<LoginFormValues>({
        defaultValues: {
            email: '',
            password: '',
            name: '',
        },
    })
    const [inputType, setInputType] = useState<'login' | 'register'>('login')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (values: LoginFormValues) => {
        setIsLoading(true)

        try {
            if (inputType === 'login') {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: values.email,
                        password: values.password,
                    }),
                })

                const data = await response.json()

                if (!response.ok) {
                    if (data.code === 'EMAIL_NOT_VERIFIED') {
                        toast.error('请先验证您的邮箱后再登录')
                        return
                    }
                    throw new Error(data.message || data.error || '登录失败')
                }

                toast.success('登录成功')
                const searchParams = new URLSearchParams(window.location.search)
                const redirectUrl = searchParams.get('redirect') || '/apps'
                router.push(redirectUrl)
            }

            if (inputType === 'register') {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: values.email,
                        password: values.password,
                        name: values.name || undefined,
                    }),
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.message || data.error || '注册失败')
                }

                toast.success('注册成功！请查收验证邮件后登录')
                setInputType('login')
                form.reset()
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '操作失败，请稍后重试')
        } finally {
            setIsLoading(false)
        }
    }

    const isLogin = inputType === 'login'

    return (
        <div className="min-h-screen bg-[#F4F6FB] text-zinc-950">
            <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
                <section className="relative hidden overflow-hidden border-r border-indigo-100 bg-[#EEF3FF] px-12 py-10 lg:flex lg:flex-col">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(79,70,229,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
                    <div className="absolute inset-0 bg-linear-to-br from-white/70 via-transparent to-cyan-100/50" />

                    <div className="relative z-10 flex items-center gap-3 text-lg font-semibold">
                        <BrandLogo />
                        <span>AI 工作流引擎</span>
                    </div>

                    <div className="relative z-10 my-auto max-w-xl">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-cyan-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-cyan-700 shadow-sm">
                            <WorkflowIcon size={15} />
                            Workflow Automation Platform
                        </div>
                        <h1 className="mb-6 text-5xl font-semibold leading-tight tracking-normal text-zinc-950">
                            编排、测试并发布你的 AI 工作流
                        </h1>
                        <p className="max-w-lg text-base leading-7 text-zinc-600">
                            将模型调用、知识库检索、HTTP 请求和条件分支组织成稳定可复用的自动化流程。
                        </p>

                        <div className="mt-10 w-full max-w-[520px] rounded-md border border-indigo-100 bg-white/80 p-4 shadow-sm backdrop-blur">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                                    <ZapIcon size={16} className="text-[#4F46E5]" />
                                    内容生成工作流
                                </div>
                                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Running</span>
                            </div>

                            <div className="relative grid grid-cols-[1fr_34px_1fr_34px_1fr] items-center">
                                <WorkflowNode icon={BotIcon} title="Prompt" tone="indigo" />
                                <Connector tone="indigo" />
                                <WorkflowNode icon={DatabaseIcon} title="Knowledge" tone="cyan" />
                                <Connector tone="cyan" />
                                <WorkflowNode icon={Globe2Icon} title="Publish" tone="amber" />
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                                <StatusChip label="LLM" value="GPT" tone="indigo" />
                                <StatusChip label="检索" value="5 docs" tone="cyan" />
                                <StatusChip label="API" value="ready" tone="amber" />
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-indigo-200/70 pt-6 text-sm text-zinc-600">
                        <div>
                            <div className="mb-1 text-2xl font-semibold text-[#4F46E5]">Nodes</div>
                            <p>可视化节点编排</p>
                        </div>
                        <div>
                            <div className="mb-1 text-2xl font-semibold text-[#06B6D4]">API</div>
                            <p>发布后直接调用</p>
                        </div>
                        <div>
                            <div className="mb-1 text-2xl font-semibold text-[#F59E0B]">Logs</div>
                            <p>执行过程可追踪</p>
                        </div>
                    </div>
                </section>

                <main className="flex min-h-screen min-w-0 items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
                    <div className="w-full min-w-0 max-w-[420px]">
                        <div className="mb-8 lg:hidden">
                            <div className="mb-4 flex items-center gap-3 text-lg font-semibold">
                                <BrandLogo />
                                <span>AI 工作流引擎</span>
                            </div>
                            <p className="text-sm text-zinc-600">登录后继续编排和发布你的 AI 工作流。</p>
                        </div>

                        <div className="w-full min-w-0 rounded-md border border-indigo-100 bg-white px-6 py-8 shadow-sm sm:px-8">
                            <div className="mb-8">
                                <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-indigo-50 text-[#4F46E5]">
                                    <KeyRoundIcon size={22} />
                                </div>
                                <h1 className="text-2xl font-semibold tracking-normal">{isLogin ? '欢迎回来' : '创建账号'}</h1>
                                <p className="mt-2 text-sm text-zinc-500">{isLogin ? '登录 AI 工作流引擎' : '注册后请先完成邮箱验证'}</p>
                            </div>

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                                    {!isLogin && (
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>姓名</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            className="w-full min-w-0"
                                                            placeholder="请输入姓名（可选）"
                                                            disabled={isLoading}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    <FormField
                                        control={form.control}
                                        rules={{
                                            required: '请输入邮箱',
                                            pattern: {
                                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                                message: '请输入有效的邮箱地址',
                                            },
                                        }}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>邮箱</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        className="w-full min-w-0"
                                                        type="email"
                                                        placeholder="请输入邮箱"
                                                        disabled={isLoading}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        rules={{
                                            required: '请输入密码',
                                            minLength: !isLogin ? { value: 8, message: '密码至少需要8个字符' } : undefined,
                                        }}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>密码</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        className="w-full min-w-0"
                                                        type="password"
                                                        placeholder="请输入密码"
                                                        disabled={isLoading}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button
                                        type="submit"
                                        className="h-10 w-full bg-[#4F46E5] shadow-sm hover:bg-[#4338CA]"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? '处理中...' : isLogin ? '登录' : '注册'}
                                    </Button>
                                </form>
                            </Form>

                            <div className="mt-6 text-center text-sm text-zinc-500">
                                {isLogin ? '没有账号?' : '已有账号?'}{' '}
                                <Button
                                    variant="link"
                                    className="h-auto px-1 text-[#4F46E5] hover:text-[#4338CA]"
                                    onClick={() => {
                                        form.clearErrors()
                                        form.reset()
                                        setInputType(isLogin ? 'register' : 'login')
                                    }}
                                >
                                    {isLogin ? '注册' : '登录'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

type WorkflowTone = 'indigo' | 'cyan' | 'amber'

const nodeToneClass: Record<WorkflowTone, string> = {
    indigo: 'border-indigo-200 bg-indigo-50 text-[#4F46E5]',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
}

const lineToneClass: Record<WorkflowTone, string> = {
    indigo: 'bg-[#4F46E5]',
    cyan: 'bg-[#06B6D4]',
    amber: 'bg-[#F59E0B]',
}

function WorkflowNode({
    icon: Icon,
    title,
    tone,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>
    title: string
    tone: WorkflowTone
}) {
    return (
        <div className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border px-3 py-3 ${nodeToneClass[tone]}`}>
            <Icon size={20} />
            <span className="text-xs font-semibold">{title}</span>
        </div>
    )
}

function Connector({ tone }: { tone: WorkflowTone }) {
    return (
        <div className="flex items-center justify-center">
            <div className={`h-0.5 w-full ${lineToneClass[tone]}`} />
            <GitBranchIcon size={15} className="-ml-1 text-zinc-400" />
        </div>
    )
}

function StatusChip({ label, value, tone }: { label: string; value: string; tone: WorkflowTone }) {
    return (
        <div className={`rounded-md border px-2 py-2 ${nodeToneClass[tone]}`}>
            <div className="font-medium">{label}</div>
            <div className="mt-1 opacity-75">{value}</div>
        </div>
    )
}
