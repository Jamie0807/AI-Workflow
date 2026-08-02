'use client'

import { CheckIcon, PencilIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NodeTitleEditorProps {
    title: string
    onTitleChange: (title: string) => void
}

export function NodeTitleEditor({ title, onTitleChange }: NodeTitleEditorProps) {
    const [isEditing, setIsEditing] = useState(false)

    if (isEditing) {
        return (
            <TitleEditForm
                initialTitle={title}
                onSave={newTitle => {
                    onTitleChange(newTitle)
                    setIsEditing(false)
                }}
                onCancel={() => setIsEditing(false)}
            />
        )
    }

    return (
        <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 hover:bg-gray-100 rounded px-1 py-0.5 -ml-1 transition-colors group"
        >
            <span className="font-medium">{title}</span>
            <PencilIcon size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" />
        </button>
    )
}

interface TitleEditFormProps {
    initialTitle: string
    onSave: (title: string) => void
    onCancel: () => void
}

function TitleEditForm({ initialTitle, onSave, onCancel }: TitleEditFormProps) {
    const { register, handleSubmit, setFocus } = useForm<{ title: string }>({
        defaultValues: { title: initialTitle },
    })

    // 自动聚焦输入框
    useState(() => {
        setTimeout(() => setFocus('title'), 0)
    })

    const onSubmit = (data: { title: string }) => {
        if (data.title.trim()) {
            onSave(data.title.trim())
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-1">
            <Input
                {...register('title', { required: true })}
                className="h-6 text-sm py-0 px-1 w-32"
                onKeyDown={e => {
                    if (e.key === 'Escape') {
                        onCancel()
                    }
                }}
            />
            <Button type="submit" variant="ghost" size="icon-sm" className="h-6 w-6 p-0 text-green-600">
                <CheckIcon size={12} />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} className="h-6 w-6 p-0 text-red-600">
                <XIcon size={12} />
            </Button>
        </form>
    )
}
