import { describe, expect, it, vi } from 'vitest'

import { createExecutionContext } from '../../../core/context'
import type { EndNodeConfig, ExecutionLogger } from '../../../types'
import { EndExecutor } from '../end-executor'

function createLogger() {
    const warnings: Array<{ message: string; data?: Record<string, unknown> }> = []

    const logger: ExecutionLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn((message: string, data?: Record<string, unknown>) => {
            warnings.push({ message, data })
        }),
        error: vi.fn(),
        nodeStart: vi.fn(),
        nodeEnd: vi.fn(),
        variableResolve: vi.fn(),
        llmRequest: vi.fn(),
        llmResponse: vi.fn(),
        httpRequest: vi.fn(),
        httpResponse: vi.fn(),
        getEntries: vi.fn(() => []),
        setCurrentNode: vi.fn(),
    }

    return { logger, warnings }
}

function createContext(initialOutputs: Record<string, Record<string, unknown>>) {
    const context = createExecutionContext(
        'test-execution',
        {
            id: 'workflow-1',
            name: 'workflow-1',
            nodes: [],
            edges: [],
        },
        {}
    )

    for (const [nodeId, outputs] of Object.entries(initialOutputs)) {
        context.variables.setNodeOutputs(nodeId, outputs)
    }

    return context
}

describe('EndExecutor', () => {
    it('extracts structured fields with path while preserving outputs without path', async () => {
        const executor = new EndExecutor()
        const context = createContext({
            llm: {
                output: '```json\n{"result":"Stay indoors","risk_level":"HIGH","recommendations":["Close windows"]}\n```',
            },
            meta: {
                title: 'Typhoon report',
            },
        })
        const { logger, warnings } = createLogger()
        const config: EndNodeConfig = {
            outputs: [
                {
                    name: 'result',
                    type: 'string',
                    value: '${llm.output}',
                    path: 'result',
                    fallback: '${llm.output}',
                },
                {
                    name: 'risk_level',
                    type: 'string',
                    value: '${llm.output}',
                    path: 'risk_level',
                },
                {
                    name: 'recommendations',
                    type: 'array',
                    value: '${llm.output}',
                    path: 'recommendations',
                },
                {
                    name: 'summary',
                    type: 'string',
                    value: 'Report: ${meta.title}',
                },
            ],
        }

        const result = await executor.execute('end-1', config, context, logger)

        expect(result.success).toBe(true)
        expect(result.outputs).toEqual({
            result: 'Stay indoors',
            risk_level: 'HIGH',
            recommendations: ['Close windows'],
            summary: 'Report: Typhoon report',
        })
        expect(warnings).toHaveLength(0)
    })

    it('uses fallback only when JSON parsing fails and keeps structured fields empty without fallback', async () => {
        const executor = new EndExecutor()
        const context = createContext({
            llm: {
                output: 'Model raw text response',
            },
        })
        const { logger, warnings } = createLogger()
        const config: EndNodeConfig = {
            outputs: [
                {
                    name: 'result',
                    type: 'string',
                    value: '${llm.output}',
                    path: 'result',
                    fallback: '${llm.output}',
                },
                {
                    name: 'risk_level',
                    type: 'string',
                    value: '${llm.output}',
                    path: 'risk_level',
                },
                {
                    name: 'recommendations',
                    type: 'array',
                    value: '${llm.output}',
                    path: 'recommendations',
                    fallback: '[]',
                },
            ],
        }

        const result = await executor.execute('end-1', config, context, logger)

        expect(result.outputs.result).toBe('Model raw text response')
        expect(result.outputs.risk_level).toBeUndefined()
        expect(result.outputs.recommendations).toEqual([])
        expect(warnings).toHaveLength(3)
        expect(warnings.map(item => item.data?.outputName)).toEqual(['result', 'risk_level', 'recommendations'])
    })

    it('does not use fallback when JSON is valid but the configured path is missing', async () => {
        const executor = new EndExecutor()
        const context = createContext({
            llm: {
                output: '{"risk_level":"MEDIUM","recommendations":["Monitor alerts"]}',
            },
        })
        const { logger, warnings } = createLogger()
        const config: EndNodeConfig = {
            outputs: [
                {
                    name: 'result',
                    type: 'string',
                    value: '${llm.output}',
                    path: 'result',
                    fallback: '${llm.output}',
                },
                {
                    name: 'risk_level',
                    type: 'string',
                    value: '${llm.output}',
                    path: 'risk_level',
                },
                {
                    name: 'recommendations',
                    type: 'array',
                    value: '${llm.output}',
                    path: 'recommendations',
                },
                {
                    name: 'follow_up',
                    type: 'string',
                    value: '${llm.output}',
                    path: 'follow_up',
                },
            ],
        }

        const result = await executor.execute('end-1', config, context, logger)

        expect(result.outputs.result).toBeUndefined()
        expect(result.outputs.risk_level).toBe('MEDIUM')
        expect(result.outputs.recommendations).toEqual(['Monitor alerts'])
        expect(result.outputs.follow_up).toBeUndefined()
        expect(warnings).toHaveLength(2)
        expect(warnings.map(item => item.data?.outputName)).toEqual(['result', 'follow_up'])
        expect(warnings.every(item => item.message === 'JSON path not found for output parameter')).toBe(true)
    })
})
