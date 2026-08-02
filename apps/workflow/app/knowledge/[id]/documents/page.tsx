import { DocumentList } from '@/components/knowledge/document-list'

export default function DocumentsPage() {
    return (
        <div className="flex-1 overflow-auto p-6">
            <DocumentList />
        </div>
    )
}
