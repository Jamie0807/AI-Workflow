'use client'

import { CheckCircleIcon, CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ApiDocumentationProps {
    appId: string
    appName: string
}

// 代码块组件 - 移到组件外部避免每次渲染重新创建
interface CodeBlockProps {
    code: string
    section: string
    copiedSection: string | null
    onCopy: (code: string, section: string) => void
}

function CodeBlock({ code, section, copiedSection, onCopy }: CodeBlockProps) {
    return (
        <div className="group relative">
            <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100">
                <code>{code}</code>
            </pre>
            <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onCopy(code, section)}
            >
                {copiedSection === section ? <CheckCircleIcon className="size-4 text-green-500" /> : <CopyIcon className="size-4" />}
            </Button>
        </div>
    )
}

export function ApiDocumentation({ appId, appName }: ApiDocumentationProps) {
    const [copiedSection, setCopiedSection] = useState<string | null>(null)

    // API 基础信息 - api-server 运行在 3100 端口
    const apiServerHost = process.env.NEXT_PUBLIC_API_SERVER_URL || 'http://localhost:3100'
    const workflowEndpoint = `${apiServerHost}/api/v1/apps/run`

    // 复制代码
    const handleCopy = async (code: string, section: string) => {
        try {
            await navigator.clipboard.writeText(code)
            setCopiedSection(section)
            toast.success('已复制到剪贴板')
            setTimeout(() => setCopiedSection(null), 2000)
        } catch {
            toast.error('复制失败')
        }
    }

    // cURL 示例
    const curlExample = `curl -X POST "${workflowEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "inputs": {
      "message": "你好，请介绍一下你自己"
    }
  }'`

    // JavaScript/TypeScript 示例
    const jsExample = `const response = await fetch("${workflowEndpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
  },
  body: JSON.stringify({
    inputs: {
      message: "你好，请介绍一下你自己"
    }
  })
});

const result = await response.json();
console.log(result.data);`

    // Python 示例
    const pythonExample = `import requests

url = "${workflowEndpoint}"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
}
payload = {
    "inputs": {
        "message": "你好，请介绍一下你自己"
    }
}

response = requests.post(url, json=payload, headers=headers)
result = response.json()
print(result["data"])`

    // 响应示例
    const responseExample = `{
  "success": true,
  "data": {
    "executionId": "exec_abc123",
    "status": "SUCCESS",
    "outputs": {
      "result": "你好！我是一个 AI 助手，很高兴为你服务..."
    },
    "duration": 1234,
    "totalTokens": 256
  }
}`

    // 错误响应示例
    const errorResponseExample = `{
  "code": "API_KEY_INVALID",
  "message": "无效的 API Key"
}`

    // 流式响应示例
    const streamExample = `// 流式调用（SSE）
const eventSource = new EventSource(
  "${workflowEndpoint}?stream=true",
  {
    headers: {
      "Authorization": "Bearer YOUR_API_KEY"
    }
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};

eventSource.onerror = (error) => {
  console.error("Stream error:", error);
  eventSource.close();
};`

    return (
        <div>
            {/* 标题 */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold">接入文档</h2>
                <p className="text-muted-foreground text-sm">了解如何通过 API 调用「{appName}」应用</p>
            </div>

            <div className="space-y-8">
                {/* API 端点 */}
                <section>
                    <h3 className="mb-3 font-semibold">API 端点</h3>
                    <div className="bg-muted rounded-lg p-4">
                        <div className="mb-2 flex items-center gap-2">
                            <Badge>POST</Badge>
                            <code className="font-mono text-sm">{workflowEndpoint}</code>
                        </div>
                        <p className="text-muted-foreground text-sm">运行工作流并获取结果</p>
                    </div>
                </section>

                {/* 认证 */}
                <section>
                    <h3 className="mb-3 font-semibold">认证方式</h3>
                    <p className="text-muted-foreground mb-3 text-sm">所有 API 请求都需要在 Header 中携带 API Key 进行认证：</p>
                    <CodeBlock
                        code={`Authorization: Bearer YOUR_API_KEY`}
                        section="auth"
                        copiedSection={copiedSection}
                        onCopy={handleCopy}
                    />
                </section>

                {/* 请求参数 */}
                <section>
                    <h3 className="mb-3 font-semibold">请求参数</h3>
                    <div className="overflow-hidden rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-3 text-left font-medium">参数</th>
                                    <th className="p-3 text-left font-medium">类型</th>
                                    <th className="p-3 text-left font-medium">必填</th>
                                    <th className="p-3 text-left font-medium">说明</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t">
                                    <td className="p-3 font-mono text-xs">inputs</td>
                                    <td className="p-3">object</td>
                                    <td className="p-3">是</td>
                                    <td className="p-3">工作流输入参数，对应开始节点定义的变量</td>
                                </tr>
                                <tr className="border-t">
                                    <td className="p-3 font-mono text-xs">stream</td>
                                    <td className="p-3">boolean</td>
                                    <td className="p-3">否</td>
                                    <td className="p-3">是否使用流式响应，默认 false</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 代码示例 */}
                <section>
                    <h3 className="mb-3 font-semibold">代码示例</h3>
                    <Tabs defaultValue="curl">
                        <TabsList>
                            <TabsTrigger value="curl">cURL</TabsTrigger>
                            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                            <TabsTrigger value="python">Python</TabsTrigger>
                            <TabsTrigger value="stream">流式调用</TabsTrigger>
                        </TabsList>
                        <TabsContent value="curl" className="mt-3">
                            <CodeBlock code={curlExample} section="curl" copiedSection={copiedSection} onCopy={handleCopy} />
                        </TabsContent>
                        <TabsContent value="javascript" className="mt-3">
                            <CodeBlock code={jsExample} section="js" copiedSection={copiedSection} onCopy={handleCopy} />
                        </TabsContent>
                        <TabsContent value="python" className="mt-3">
                            <CodeBlock code={pythonExample} section="python" copiedSection={copiedSection} onCopy={handleCopy} />
                        </TabsContent>
                        <TabsContent value="stream" className="mt-3">
                            <CodeBlock code={streamExample} section="stream" copiedSection={copiedSection} onCopy={handleCopy} />
                        </TabsContent>
                    </Tabs>
                </section>

                {/* 响应格式 */}
                <section>
                    <h3 className="mb-3 font-semibold">响应格式</h3>
                    <Tabs defaultValue="success">
                        <TabsList>
                            <TabsTrigger value="success">成功响应</TabsTrigger>
                            <TabsTrigger value="error">错误响应</TabsTrigger>
                        </TabsList>
                        <TabsContent value="success" className="mt-3">
                            <CodeBlock code={responseExample} section="response" copiedSection={copiedSection} onCopy={handleCopy} />
                        </TabsContent>
                        <TabsContent value="error" className="mt-3">
                            <CodeBlock code={errorResponseExample} section="error" copiedSection={copiedSection} onCopy={handleCopy} />
                        </TabsContent>
                    </Tabs>
                </section>

                {/* 错误码 */}
                <section>
                    <h3 className="mb-3 font-semibold">错误码说明</h3>
                    <div className="overflow-hidden rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-3 text-left font-medium">错误码</th>
                                    <th className="p-3 text-left font-medium">HTTP 状态码</th>
                                    <th className="p-3 text-left font-medium">说明</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t">
                                    <td className="p-3 font-mono text-xs">API_KEY_INVALID</td>
                                    <td className="p-3">401</td>
                                    <td className="p-3">无效的 API Key</td>
                                </tr>
                                <tr className="border-t">
                                    <td className="p-3 font-mono text-xs">API_KEY_EXPIRED</td>
                                    <td className="p-3">401</td>
                                    <td className="p-3">API Key 已过期</td>
                                </tr>
                                <tr className="border-t">
                                    <td className="p-3 font-mono text-xs">API_KEY_DISABLED</td>
                                    <td className="p-3">403</td>
                                    <td className="p-3">API Key 已禁用</td>
                                </tr>
                                <tr className="border-t">
                                    <td className="p-3 font-mono text-xs">APP_NOT_FOUND</td>
                                    <td className="p-3">404</td>
                                    <td className="p-3">应用不存在或未发布</td>
                                </tr>
                                <tr className="border-t">
                                    <td className="p-3 font-mono text-xs">INVALID_WORKFLOW</td>
                                    <td className="p-3">400</td>
                                    <td className="p-3">工作流配置无效</td>
                                </tr>
                                <tr className="border-t">
                                    <td className="p-3 font-mono text-xs">INTERNAL_SERVER_ERROR</td>
                                    <td className="p-3">500</td>
                                    <td className="p-3">服务器内部错误</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 使用限制 */}
                <section>
                    <h3 className="mb-3 font-semibold">使用限制</h3>
                    <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                        <li>每个 API Key 默认无调用次数限制</li>
                        <li>单次请求超时时间为 60 秒</li>
                        <li>请求体最大 1MB</li>
                        <li>建议为不同环境（开发、测试、生产）创建独立的 API Key</li>
                    </ul>
                </section>
            </div>
        </div>
    )
}
