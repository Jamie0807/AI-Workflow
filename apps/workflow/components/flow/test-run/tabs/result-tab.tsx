'use client'

import type { WorkflowResult } from '@ai-workflow/ai-engine'
import { AlertCircleIcon, CheckCircle2Icon, CopyIcon, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import type { TestRunStatus } from '@/lib/types/test-run'

interface ResultTabProps {
    result: WorkflowResult | null
    status: TestRunStatus
}

const TEXT_OUTPUT_KEYS = ['translation', 'result', 'output', 'content', 'text', 'answer']

function getPrimaryTextOutput(outputs: Record<string, unknown> | undefined): string | null {
    if (!outputs) return null

    for (const key of TEXT_OUTPUT_KEYS) {
        const value = outputs[key]
        if (typeof value === 'string' && value.trim()) {
            return value
        }
    }

    const entries = Object.entries(outputs)
    if (entries.length === 1 && typeof entries[0][1] === 'string') {
        return entries[0][1]
    }

    return null
}

/**
 * Format JSON with syntax highlighting
 */
function JsonViewer({ data, className }: { data: unknown; className?: string }) {
    const formattedJson = useMemo(() => {
        try {
            return JSON.stringify(data, null, 2)
        } catch {
            return String(data)
        }
    }, [data])

    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(formattedJson)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Ignore copy errors
        }
    }

    return (
        <div className={`relative group overflow-hidden ${className || ''}`}>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono max-h-[400px] whitespace-pre-wrap break-all">
                {formattedJson}
            </pre>
            <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleCopy}
            >
                {copied ? <CheckCircle2Icon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
            </Button>
        </div>
    )
}

/**
 * Result Tab Component
 * Displays workflow execution result
 */
export function ResultTab({ result, status }: ResultTabProps) {
    if (status === 'idle') {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">运行工作流后查看结果</p>
            </div>
        )
    }

    if (status === 'running') {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p className="text-sm">工作流正在运行中...</p>
            </div>
        )
    }

    if (!result) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">暂无结果</p>
            </div>
        )
    }

    const primaryTextOutput = getPrimaryTextOutput(result.outputs)

    return (
        <div className="space-y-4">
            {/* Status Banner */}
            <div
                className={`flex items-center gap-2 p-3 rounded-lg ${
                    result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}
            >
                {result.success ? <CheckCircle2Icon className="h-5 w-5" /> : <AlertCircleIcon className="h-5 w-5" />}
                <span className="font-medium">{result.success ? '执行成功' : '执行失败'}</span>
            </div>

            {/* Error Message */}
            {result.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 overflow-hidden">
                    <h4 className="text-sm font-medium text-red-700 mb-2">错误信息</h4>
                    <p className="text-sm text-red-600 font-mono break-all">{result.error.message}</p>
                </div>
            )}

            {/* Output Data */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium">输出结果</h4>
                {result.outputs && Object.keys(result.outputs).length > 0 ? (
                    primaryTextOutput ? (
                        <div className="rounded-lg bg-muted/50 p-4 text-sm leading-7 whitespace-pre-wrap break-words">
                            {primaryTextOutput}
                        </div>
                    ) : (
                        <JsonViewer data={result.outputs} />
                    )
                ) : (
                    <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
                        <p className="text-sm">无输出数据</p>
                    </div>
                )}
            </div>
        </div>
    )
}
