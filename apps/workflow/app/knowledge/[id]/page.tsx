import { redirect } from 'next/navigation'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function KnowledgePage({ params }: PageProps) {
    const { id } = await params
    redirect(`/knowledge/${id}/documents`)
}
