export default function HomePage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-8">
            <div className="text-center">
                <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-4xl">
                    🤖
                </div>
                <h1 className="mb-2 text-2xl font-bold">AI Workflow</h1>
                <p className="text-muted-foreground">
                    访问 <code className="rounded bg-muted px-2 py-1 text-sm">/workflow/[id]</code> 运行已发布的工作流
                </p>
            </div>
        </div>
    )
}
