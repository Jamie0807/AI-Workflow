'use client'

import '@xyflow/react/dist/base.css'

import {
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    Background,
    Connection,
    Controls,
    Edge,
    EdgeChange,
    MiniMap,
    Node,
    NodeChange,
    ReactFlow,
    ReactFlowProvider,
} from '@xyflow/react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

import { workflowService } from '@/lib/services/workflow-service'
import type { FlowEdge as WorkflowFlowEdge, FlowNode as WorkflowFlowNode } from '@/lib/types/workflow'

import { ExecutionDetailPanel } from '../execution-history'
import { nodeTypes } from '../nodes'
import { Settings } from '../settings'
import { TestRunPanel } from '../test-run'
import { FlowEditorContext } from './context'
import { type EditorMode, FlowEditorHeader } from './header'

type NodeKind = 'start' | 'llm' | 'http' | 'condition' | 'end' | 'knowledge'

export type FlowNodeData = {
    label?: string
    config?: Record<string, unknown>
}

export type FlowNode = {
    id: string
    type: NodeKind
    position: { x: number; y: number }
    data?: FlowNodeData
}

export type FlowEdge = {
    id: string
    source: string
    sourceHandle?: string
    target: string
}

export type LangGraphNode = {
    id: string
    kind: NodeKind
    params?: Record<string, unknown>
}

export type LangGraphEdge = {
    source: string
    target: string
    condition?: string
}

export type LangGraphSpec = {
    nodes: LangGraphNode[]
    edges: LangGraphEdge[]
}

// 默认初始节点（用于新工作流 - 只包含开始节点）
const defaultNodes: Node[] = [
    {
        id: 'start-1',
        type: 'start',
        position: { x: 350, y: 250 },
        data: {
            label: '开始',
            config: {
                inputs: [],
            },
        },
    },
]

const defaultEdges: Edge[] = []

// 节点默认配置
const defaultNodeConfigs: Record<NodeKind, { label: string; config: Record<string, unknown> }> = {
    start: {
        label: '开始',
        config: {
            inputs: [],
        },
    },
    llm: {
        label: '大模型',
        config: {
            model: 'gpt-3.5-turbo',
            systemPrompt: '',
            userPrompt: '',
            assistantPrompt: '',
            temperature: 0.7,
            maxTokens: 2000,
        },
    },
    http: {
        label: 'HTTP 请求',
        config: {
            url: '',
            method: 'GET',
            headers: [],
            params: [],
            bodyType: 'none',
            body: '',
            formData: [],
            timeout: 30000,
        },
    },
    condition: {
        label: '条件分支',
        config: {
            model: 'gpt-3.5-turbo',
            intents: [],
        },
    },
    end: {
        label: '结束输出',
        config: {},
    },
    knowledge: {
        label: '知识库',
        config: {
            knowledgeBaseIds: [],
            query: '',
            retrievalMode: 'vector',
            topK: 5,
            threshold: 0.2,
            outputFormat: 'text',
        },
    },
}

interface FlowEditorProps {
    appId: string
    appName: string
    initialNodes?: WorkflowFlowNode[]
    initialEdges?: WorkflowFlowEdge[]
}

// 自动保存防抖延迟（毫秒）
const AUTO_SAVE_DELAY = 2000

function EditorInner({ appId, appName, initialNodes = [], initialEdges = [] }: FlowEditorProps) {
    // 如果有初始数据则使用初始数据，否则使用默认数据
    const [nodes, setNodes] = useState<Node[]>(initialNodes.length > 0 ? (initialNodes as Node[]) : defaultNodes)
    const [edges, setEdges] = useState<Edge[]>(initialEdges.length > 0 ? (initialEdges as Edge[]) : defaultEdges)
    const [selectedNode, setSelectedNode] = useState<Node | null>(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
    const [addMenuOpen, setAddMenuOpen] = useState(false)
    const [testRunOpen, setTestRunOpen] = useState(false)
    const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)

    // Derive mode from state
    // edit mode: normal editing with optional settings and test run panels
    // detail mode: viewing execution history details
    const mode: EditorMode = useMemo(() => {
        if (selectedExecutionId) return 'detail'
        return 'edit'
    }, [selectedExecutionId])

    // 自动保存定时器引用
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

    // 使用 ref 存储最新的 nodes 和 edges，避免 setState 异步导致保存旧数据
    const nodesRef = useRef(nodes)
    const edgesRef = useRef(edges)

    // 同步 ref 值
    useEffect(() => {
        nodesRef.current = nodes
    }, [nodes])

    useEffect(() => {
        edgesRef.current = edges
    }, [edges])

    // 检查是否已有开始节点
    const hasStartNode = useMemo(() => {
        return nodes.some(node => node.type === 'start')
    }, [nodes])

    // 清理定时器
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
        }
    }, [])

    // 同步 selectedNode 与 nodes 状态（当节点数据更新时，保持选中节点的数据同步）
    useEffect(() => {
        if (selectedNode) {
            const updatedNode = nodes.find(n => n.id === selectedNode.id)
            if (updatedNode) {
                setSelectedNode(updatedNode)
            }
        }
    }, [nodes])

    // 保存工作流
    const saveWorkflow = useCallback(async () => {
        if (!hasUnsavedChanges) {
            return
        }

        setIsSaving(true)
        try {
            // 使用 ref 中的最新值，避免保存旧数据
            await workflowService.save(appId, {
                nodes: nodesRef.current as WorkflowFlowNode[],
                edges: edgesRef.current as WorkflowFlowEdge[],
            })
            setHasUnsavedChanges(false)
            setLastSavedAt(new Date())
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('保存工作流失败:', error)
            toast.error(error instanceof Error ? error.message : '保存失败')
        } finally {
            setIsSaving(false)
        }
    }, [appId, hasUnsavedChanges])

    // 触发自动保存（防抖）
    const triggerAutoSave = useCallback(() => {
        setHasUnsavedChanges(true)
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
        }
        autoSaveTimerRef.current = setTimeout(() => {
            saveWorkflow()
        }, AUTO_SAVE_DELAY)
    }, [saveWorkflow])

    // 添加节点
    const onAddNode = useCallback(
        (type: NodeKind) => {
            // 如果是开始节点且已存在，则不允许添加
            if (type === 'start' && hasStartNode) {
                toast.error('工作流只能有一个开始节点')
                return
            }

            const nodeConfig = defaultNodeConfigs[type]
            const newNode: Node = {
                id: `${type}-${uuidv4().slice(0, 8)}`,
                type,
                position: {
                    // 放在画布中心附近，稍微偏移避免重叠
                    x: 350 + Math.random() * 200,
                    y: 200 + Math.random() * 200,
                },
                data: nodeConfig,
            }

            setNodes(nodes => [...nodes, newNode])
            triggerAutoSave()
            toast.success(`已添加${nodeConfig.label}节点`)
            setAddMenuOpen(false)
        },
        [hasStartNode, triggerAutoSave]
    )

    const onConnect = useCallback(
        (connection: Connection) => {
            // 检查是否尝试连接到开始节点
            const targetIsStart = nodes.some(n => n.id === connection.target && n.type === 'start')
            if (targetIsStart) {
                toast.error('不能连接到开始节点')
                return
            }

            setEdges(eds => addEdge(connection, eds))
            triggerAutoSave()
        },
        [nodes, triggerAutoSave]
    )

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // 阻止删除开始节点
            const hasRemoveStart = changes.some(
                change => change.type === 'remove' && nodes.some(n => n.id === change.id && n.type === 'start')
            )
            if (hasRemoveStart) {
                toast.error('不能删除开始节点')
                return
            }

            setNodes(nodes => applyNodeChanges(changes, nodes))
            triggerAutoSave()
        },
        [nodes, triggerAutoSave]
    )

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            setEdges(edges => applyEdgeChanges(changes, edges))
            triggerAutoSave()
        },
        [triggerAutoSave]
    )

    const onUpdateNode = useCallback(
        (nodeId: string, newData: any) => {
            setNodes(nodes =>
                nodes.map(node => {
                    if (node.id === nodeId) {
                        return {
                            ...node,
                            data: newData,
                        }
                    }
                    return node
                })
            )
            triggerAutoSave()
        },
        [triggerAutoSave]
    )

    // 更新节点标题
    const onUpdateNodeLabel = useCallback(
        (nodeId: string, newLabel: string) => {
            setNodes(nodes =>
                nodes.map(node => {
                    if (node.id === nodeId) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                label: newLabel,
                            },
                        }
                    }
                    return node
                })
            )
            triggerAutoSave()
        },
        [triggerAutoSave]
    )

    const fitViewOptions = useMemo(() => ({ padding: 0.2, includeHiddenNodes: true }), [])

    // 格式化最后保存时间
    const formatLastSavedTime = useCallback(() => {
        if (!lastSavedAt) return null
        return lastSavedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }, [lastSavedAt])

    // 进入测试运行模式
    const handleTestRun = () => {
        setTestRunOpen(true)
        setSelectedNode(null)
        setSelectedExecutionId(null)
    }

    // 退出详情/测试运行模式
    const handleExit = () => {
        setTestRunOpen(false)
        setSelectedExecutionId(null)
    }

    return (
        <div className="h-full relative flex flex-col">
            <FlowEditorHeader
                appName={appName}
                appId={appId}
                mode={mode}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
                lastSavedAt={formatLastSavedTime()}
                onSave={saveWorkflow}
                onTestRun={handleTestRun}
                onExitTestRun={handleExit}
                onSelectExecution={executionId => {
                    setSelectedExecutionId(executionId)
                    setSelectedNode(null)
                }}
            />

            <div className="flex-1">
                <FlowEditorContext.Provider value={{ onAddNode, hasStartNode, nodes }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={(_, node) => {
                            if (mode === 'edit') {
                                setSelectedNode(node)
                            }
                        }}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        onSelectionChange={({ nodes }) => {
                            if (mode === 'edit') {
                                setSelectedNode(nodes[0] || null)
                            }
                        }}
                        fitView
                        fitViewOptions={fitViewOptions}
                        proOptions={{
                            hideAttribution: true,
                        }}
                    >
                        <Background bgColor="#f4f6fb" />
                        <MiniMap
                            pannable
                            zoomable
                            style={{
                                right:
                                    mode === 'detail'
                                        ? 420
                                        : selectedNode && testRunOpen
                                          ? 830
                                          : selectedNode
                                            ? 400
                                            : testRunOpen
                                              ? 420
                                              : 0,
                                width: 120,
                                height: 80,
                            }}
                        />
                        <Controls />
                    </ReactFlow>
                </FlowEditorContext.Provider>
            </div>

            {/* Right side panels */}
            <div className="absolute top-12 right-4 flex gap-1">
                {/* Detail mode - only show execution detail panel */}
                {mode === 'detail' && (
                    <ExecutionDetailPanel
                        open={!!selectedExecutionId}
                        onOpenChange={open => !open && setSelectedExecutionId(null)}
                        appId={appId}
                        executionId={selectedExecutionId}
                        nodes={nodes}
                        edges={edges}
                    />
                )}

                {/* Edit mode - show settings panel and test run panel side by side */}
                {mode === 'edit' && (
                    <>
                        {selectedNode && (
                            <Settings
                                node={selectedNode}
                                onUpdateNode={onUpdateNode}
                                onUpdateNodeLabel={onUpdateNodeLabel}
                                onClose={() => setSelectedNode(null)}
                                nodes={nodes}
                                edges={edges}
                            />
                        )}
                        {testRunOpen && (
                            <TestRunPanel open={testRunOpen} onOpenChange={setTestRunOpen} appId={appId} nodes={nodes} edges={edges} />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

interface FlowEditorPropsWrapper {
    appId: string
    appName: string
    initialNodes?: WorkflowFlowNode[]
    initialEdges?: WorkflowFlowEdge[]
}

export function FlowEditor({ appId, appName, initialNodes, initialEdges }: FlowEditorPropsWrapper) {
    return (
        <ReactFlowProvider>
            <EditorInner appId={appId} appName={appName} initialNodes={initialNodes} initialEdges={initialEdges} />
        </ReactFlowProvider>
    )
}

export default FlowEditor
