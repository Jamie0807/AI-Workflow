/* eslint-disable no-console */

import { createWorkflowEngine, WorkflowDefinition } from '../index'

/**
 * 示例工作流：包含所有节点类型
 *
 * 流程说明：
 * 1. 开始节点：接收 count 和 userName 参数
 * 2. LLM 节点：根据用户名生成问候语
 * 3. 条件节点：根据 LLM 输出识别意图
 *    - 查询订单 → HTTP 节点 → 结束节点
 *    - 技术问题 → 结束节点
 */
const exampleWorkflow: WorkflowDefinition = {
    id: 'workflow-demo-1',
    name: '智能问答工作流示例',
    nodes: [
        {
            id: 'start-1',
            type: 'start',
            data: {
                label: '开始',
                config: {
                    inputs: [
                        {
                            name: 'count',
                            type: 'number',
                            defaultValue: '10',
                            required: true,
                            description: '循环次数',
                        },
                        {
                            name: 'userName',
                            type: 'string',
                            defaultValue: 'Guest',
                            required: false,
                            description: '用户名称',
                        },
                        {
                            name: 'question',
                            type: 'string',
                            defaultValue: '请帮我查询订单状态',
                            required: true,
                            description: '用户问题',
                        },
                    ],
                },
            },
        },
        {
            id: 'llm-1',
            type: 'llm',
            data: {
                label: '大模型处理',
                config: {
                    model: 'qwen3:0.6b',
                    systemPrompt: '你是一个智能助手，请根据用户的问题给出专业的回答。',
                    userPrompt: '用户 ${start-1.userName} 问：${start-1.question}',
                    temperature: 0.7,
                    maxTokens: 2000,
                },
            },
        },
        {
            id: 'http-1',
            type: 'http',
            data: {
                label: 'HTTP 请求',
                config: {
                    url: 'http://localhost:3000/api/run-workflow-test',
                    method: 'POST',
                    headers: [{ key: 'Content-Type', value: 'application/json' }],
                    params: [],
                    bodyType: 'json',
                    body: JSON.stringify({
                        user: '${start-1.userName}',
                        question: '${start-1.question}',
                        count: '${start-1.count}',
                    }),
                    formData: [],
                    timeout: 30000,
                },
            },
        },
        {
            id: 'condition-1',
            type: 'condition',
            data: {
                label: '意图识别',
                config: {
                    model: 'qwen3:0.6b',
                    intents: [
                        {
                            name: '查询订单',
                            description: '用户 ${start-1.userName} 的问题「${start-1.question}」是关于查询订单状态、物流信息等',
                        },
                        {
                            name: '技术问题',
                            description: '用户 ${start-1.userName} 的问题「${start-1.question}」是关于技术问题需要帮助',
                        },
                    ],
                },
            },
        },
        {
            id: 'end-order',
            type: 'end',
            data: {
                label: '订单查询结果',
                config: {
                    outputs: [
                        {
                            name: 'answer',
                            type: 'string',
                            // value: '${llm-1.output}',
                            value: '${http-1.data}',
                            description: 'LLM 生成的回答',
                        },
                        {
                            name: 'intent',
                            type: 'string',
                            value: '${condition-1.matchedIntent}',
                            description: '识别的意图',
                        },
                        {
                            name: 'httpStatus',
                            type: 'number',
                            value: '${http-1.status}',
                            description: 'HTTP 请求状态码',
                        },
                    ],
                },
            },
        },
        {
            id: 'end-tech',
            type: 'end',
            data: {
                label: '技术问题结果',
                config: {
                    outputs: [
                        {
                            name: 'answer',
                            type: 'string',
                            value: '${llm-1.output}',
                            description: 'LLM 生成的回答',
                        },
                        {
                            name: 'intent',
                            type: 'string',
                            value: '${condition-1.matchedIntent}',
                            description: '识别的意图',
                        },
                    ],
                },
            },
        },
    ],
    edges: [
        { id: 'e1', source: 'start-1', target: 'llm-1' },
        { id: 'e2', source: 'llm-1', target: 'condition-1' },
        { id: 'e3', source: 'condition-1', sourceHandle: 'intent-0', target: 'http-1' },
        { id: 'e4', source: 'http-1', target: 'end-order' },
        { id: 'e5', source: 'condition-1', sourceHandle: 'intent-1', target: 'end-tech' },
    ],
}

/**
 * 简单工作流示例：不需要 HTTP 请求
 */
const simpleWorkflow: WorkflowDefinition = {
    id: 'workflow-simple-1',
    name: '简单问答工作流',
    nodes: [
        {
            id: 'start-1',
            type: 'start',
            data: {
                label: '开始',
                config: {
                    inputs: [
                        {
                            name: 'question',
                            type: 'string',
                            required: true,
                            description: '用户问题',
                        },
                    ],
                },
            },
        },
        {
            id: 'llm-1',
            type: 'llm',
            data: {
                label: '大模型',
                config: {
                    model: 'qwen3:0.6b',
                    systemPrompt: '你是一个友好的助手，请简洁地回答用户的问题。',
                    userPrompt: '${start-1.question}',
                    temperature: 0.7,
                    maxTokens: 500,
                },
            },
        },
        {
            id: 'end-1',
            type: 'end',
            data: {
                label: '结束',
                config: {
                    outputs: [
                        {
                            name: 'answer',
                            type: 'string',
                            value: '${llm-1.output}',
                        },
                        {
                            name: 'tokens',
                            type: 'number',
                            value: '${llm-1.tokens}',
                        },
                    ],
                },
            },
        },
    ],
    edges: [
        { id: 'e1', source: 'start-1', target: 'llm-1' },
        { id: 'e2', source: 'llm-1', target: 'end-1' },
    ],
}

/**
 * 运行示例
 */
async function runExample() {
    console.log('='.repeat(60))
    console.log('AI Workflow 引擎 - 示例运行')
    console.log('='.repeat(60))
    console.log()

    // 创建引擎（启用详细日志）
    const engine = createWorkflowEngine({
        verbose: true,
    })

    // 选择要运行的工作流
    const useSimpleWorkflow = process.argv.includes('--simple')
    const workflow = useSimpleWorkflow ? simpleWorkflow : exampleWorkflow

    console.log(`运行工作流: ${workflow.name}`)
    console.log(`节点数量: ${workflow.nodes.length}`)
    console.log(`边数量: ${workflow.edges.length}`)
    console.log()

    // 准备输入
    const inputs = useSimpleWorkflow
        ? { question: '你好，请介绍一下你自己' }
        : // 查询订单信息
          {
              count: 5,
              userName: 'AIWorkflow',
              question: '请帮我查询订单状态',
          }

    console.log('输入参数:', JSON.stringify(inputs, null, 2))
    console.log()
    console.log('-'.repeat(60))
    console.log('开始执行...')
    console.log('-'.repeat(60))
    console.log()

    try {
        // 执行工作流
        const result = await engine.execute(workflow, inputs)

        console.log()
        console.log('='.repeat(60))
        console.log('执行结果')
        console.log('='.repeat(60))
        console.log()

        if (result.success) {
            console.log('✅ 执行成功！')
            console.log(`执行 ID: ${result.executionId}`)
            console.log(`总耗时: ${result.duration}ms`)
            console.log()
            console.log('输出:')
            console.log(JSON.stringify(result.outputs, null, 2))
        } else {
            console.log('❌ 执行失败！')
            console.log(`错误: ${result.error?.message}`)
        }

        console.log()
        console.log('-'.repeat(60))
        console.log(`日志条目数: ${result.logs.length}`)
        console.log('-'.repeat(60))
    } catch (error) {
        console.error('执行出错:', error)
    }
}

// 运行示例
runExample().catch(console.error)

// npx tsx run-workflow.ts --simple
// npx tsx run-workflow.ts
