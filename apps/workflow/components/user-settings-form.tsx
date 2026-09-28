'use client'

import { Loader2Icon, SaveIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { USER_PROFILE_UPDATED_EVENT, validateDisplayName } from '@/lib/user-settings'

interface UserProfile {
    id: string
    email: string
    name: string | null
    avatar: string | null
}

export function UserSettingsForm() {
    const router = useRouter()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await fetch('/api/auth/me')
                const data = await response.json()

                if (!response.ok || !data.success) {
                    throw new Error(data.message || '加载用户信息失败')
                }

                const loadedProfile = data.data.user as UserProfile
                setProfile(loadedProfile)
                setName(loadedProfile.name || '')
            } catch (loadError) {
                const message = loadError instanceof Error ? loadError.message : '加载用户信息失败'
                setError(message)
            } finally {
                setLoading(false)
            }
        }

        loadProfile()
    }, [])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const nameResult = validateDisplayName(name)
        if (!nameResult.valid) {
            setError(nameResult.error)
            return
        }

        try {
            setSaving(true)
            setError('')

            const response = await fetch('/api/auth/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameResult.value }),
            })
            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.message || '保存失败')
            }

            const updatedProfile = data.data.user as UserProfile
            setProfile(updatedProfile)
            setName(updatedProfile.name || '')
            window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT, { detail: updatedProfile }))
            toast.success('姓名已保存')
            router.push('/apps')
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : '保存失败'
            setError(message)
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="text-sm text-muted-foreground">正在加载用户信息...</div>
    }

    if (!profile) {
        return <div className="text-sm text-destructive">{error || '无法加载用户信息'}</div>
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-2xl font-semibold">设置</h1>
                <p className="mt-2 text-sm text-muted-foreground">管理你的账户信息</p>
            </div>

            <div className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
                <div className="space-y-2">
                    <Label htmlFor="profile-name">姓名</Label>
                    <Input
                        id="profile-name"
                        value={name}
                        onChange={event => setName(event.target.value)}
                        placeholder="请输入姓名"
                        maxLength={50}
                        disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground">这个姓名会显示在右上角账户菜单中。</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="profile-email">邮箱</Label>
                    <Input id="profile-email" value={profile.email} disabled />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2Icon className="size-4 animate-spin" />
                                保存中...
                            </>
                        ) : (
                            <>
                                <SaveIcon className="size-4" />
                                保存设置
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </form>
    )
}
