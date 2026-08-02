import type { FlowEdge, FlowNode } from './editor'
import { FlowEditor } from './editor'

interface FlowProps {
    appId?: string
    appName?: string
    initialNodes?: FlowNode[]
    initialEdges?: FlowEdge[]
}

export const Flow = ({ appId = '', appName = '', initialNodes = [], initialEdges = [] }: FlowProps) => {
    return (
        <div className="h-[calc(100vh-var(--header-height))] w-full">
            {appId ? (
                <FlowEditor appId={appId} appName={appName} initialNodes={initialNodes} initialEdges={initialEdges} />
            ) : (
                <FlowEditor appId="" appName="" initialNodes={[]} initialEdges={[]} />
            )}
        </div>
    )
}
