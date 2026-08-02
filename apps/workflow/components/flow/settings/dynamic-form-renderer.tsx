'use client'

import { useMemo } from 'react'

import { nodeSettingsRegistry } from './registry'
import { FlowContext, NodeKind } from './types'

interface DynamicFormRendererProps {
    node: any
    onSave: (data: any) => void
    flowContext?: FlowContext
}

/**
 * 动态表单渲染器 - 根据节点类型渲染对应的表单组件
 * 各表单组件内部已实现自动保存
 */
export function DynamicFormRenderer({ node, onSave, flowContext }: DynamicFormRendererProps) {
    const FormComponent = useMemo(() => {
        return node.type ? nodeSettingsRegistry.getFormComponent(node.type as NodeKind) : null
    }, [node.type])

    if (!FormComponent) {
        return (
            <div className="text-sm text-muted-foreground text-center py-8">
                {node.type === 'start' || node.type === 'end' ? '此节点无需配置' : '未找到该节点类型的配置表单'}
            </div>
        )
    }

    return <FormComponent node={node} onSave={onSave} flowContext={flowContext} />
}
