'use client'

import { Loader2Icon, SaveIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { useKnowledge } from '@/lib/contexts/knowledge-context'
import { knowledgeService } from '@/lib/services/knowledge-service'

interface SettingsFormData {
    name: string
    description: string
    icon: string
    retrievalMode: 'VECTOR' | 'FULLTEXT' | 'HYBRID'
    vectorWeight: number
    topK: number
    threshold: number
    chunkSize: number
    chunkOverlap: number
}

export function KnowledgeSettings() {
    const { knowledgeBase, setKnowledgeBase } = useKnowledge()
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<SettingsFormData>({
        name: '',
        description: '',
        icon: '📚',
        retrievalMode: 'VECTOR',
        vectorWeight: 0.7,
        topK: 5,
        threshold: 0.5,
        chunkSize: 500,
        chunkOverlap: 50,
    })

    useEffect(() => {
        if (knowledgeBase) {
            setFormData({
                name: knowledgeBase.name,
                description: knowledgeBase.description || '',
                icon: knowledgeBase.icon,
                retrievalMode: knowledgeBase.retrievalMode,
                vectorWeight: knowledgeBase.vectorWeight,
                topK: knowledgeBase.topK,
                threshold: knowledgeBase.threshold,
                chunkSize: knowledgeBase.chunkSize,
                chunkOverlap: knowledgeBase.chunkOverlap,
            })
        }
    }, [knowledgeBase])

    const handleSave = async () => {
        if (!knowledgeBase) return

        try {
            setSaving(true)
            const updated = await knowledgeService.update(knowledgeBase.id, formData)
            setKnowledgeBase(updated)
            toast.success('设置已保存')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '保存设置失败')
        } finally {
            setSaving(false)
        }
    }

    const updateField = <K extends keyof SettingsFormData>(field: K, value: SettingsFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h2 className="text-lg font-semibold">设置</h2>
                <p className="text-sm text-muted-foreground">配置知识库的基本信息和检索参数</p>
            </div>

            {/* 基本信息 */}
            <div className="space-y-4">
                <h3 className="font-medium">基本信息</h3>

                <div className="space-y-2">
                    <Label>知识库名称</Label>
                    <Input value={formData.name} onChange={e => updateField('name', e.target.value)} placeholder="输入知识库名称" />
                </div>

                <div className="space-y-2">
                    <Label>描述</Label>
                    <Textarea
                        value={formData.description}
                        onChange={e => updateField('description', e.target.value)}
                        placeholder="输入知识库描述（可选）"
                        rows={3}
                    />
                </div>

                <div className="space-y-2">
                    <Label>图标</Label>
                    <Input value={formData.icon} onChange={e => updateField('icon', e.target.value)} className="w-20" maxLength={2} />
                </div>
            </div>

            <Separator />

            {/* 检索配置 */}
            <div className="space-y-4">
                <h3 className="font-medium">检索配置</h3>

                <div className="space-y-2">
                    <Label>检索模式</Label>
                    <Select
                        value={formData.retrievalMode}
                        onValueChange={v => updateField('retrievalMode', v as SettingsFormData['retrievalMode'])}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="VECTOR">向量检索</SelectItem>
                            <SelectItem value="FULLTEXT">全文检索</SelectItem>
                            <SelectItem value="HYBRID">混合检索</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">向量检索基于语义相似度，全文检索基于关键词匹配，混合检索结合两者优势</p>
                </div>

                {formData.retrievalMode === 'HYBRID' && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>向量权重</Label>
                            <span className="text-sm text-muted-foreground">{(formData.vectorWeight * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                            value={[formData.vectorWeight]}
                            onValueChange={([v]: number[]) => updateField('vectorWeight', v)}
                            min={0}
                            max={1}
                            step={0.05}
                        />
                        <p className="text-xs text-muted-foreground">混合检索中向量检索的权重，剩余为全文检索权重</p>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Top K</Label>
                        <span className="text-sm text-muted-foreground">{formData.topK}</span>
                    </div>
                    <Slider value={[formData.topK]} onValueChange={([v]: number[]) => updateField('topK', v)} min={1} max={20} step={1} />
                    <p className="text-xs text-muted-foreground">返回的最大切片数量</p>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>相似度阈值</Label>
                        <span className="text-sm text-muted-foreground">{formData.threshold.toFixed(2)}</span>
                    </div>
                    <Slider
                        value={[formData.threshold]}
                        onValueChange={([v]: number[]) => updateField('threshold', v)}
                        min={0}
                        max={1}
                        step={0.05}
                    />
                    <p className="text-xs text-muted-foreground">仅返回相似度高于此阈值的结果</p>
                </div>
            </div>

            <Separator />

            {/* 切分配置 */}
            <div className="space-y-4">
                <h3 className="font-medium">切分配置</h3>
                <p className="text-sm text-muted-foreground">修改切分配置后，需要重新处理所有文档才能生效</p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>切片大小</Label>
                        <Input
                            type="number"
                            value={formData.chunkSize}
                            onChange={e => updateField('chunkSize', parseInt(e.target.value) || 500)}
                            min={100}
                            max={2000}
                        />
                        <p className="text-xs text-muted-foreground">每个切片的最大字符数</p>
                    </div>

                    <div className="space-y-2">
                        <Label>重叠字符数</Label>
                        <Input
                            type="number"
                            value={formData.chunkOverlap}
                            onChange={e => updateField('chunkOverlap', parseInt(e.target.value) || 50)}
                            min={0}
                            max={500}
                        />
                        <p className="text-xs text-muted-foreground">相邻切片的重叠字符数</p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* 嵌入模型信息（只读） */}
            {knowledgeBase && (
                <div className="space-y-4">
                    <h3 className="font-medium">嵌入模型</h3>
                    <div className="rounded-lg bg-muted/50 p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">模型</p>
                                <p className="font-medium">{knowledgeBase.embeddingModel}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">提供商</p>
                                <p className="font-medium">{knowledgeBase.embeddingProvider}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">维度</p>
                                <p className="font-medium">{knowledgeBase.dimensions}</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">嵌入模型在创建知识库时确定，暂不支持修改</p>
                </div>
            )}

            {/* 保存按钮 */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || !knowledgeBase}>
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
    )
}
