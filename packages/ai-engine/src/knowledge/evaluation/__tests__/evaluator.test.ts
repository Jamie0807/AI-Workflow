// cspell:ignore ndcg

import { describe, expect, it } from 'vitest'

import type { RetrievalOptions, RetrievalResult, RetrieverService } from '../../types'
import { evaluateRetrievalDataset } from '../evaluator'
import type { EvaluationDataset } from '../types'

const createRetrievalResult = (chunkId: string, score: number, knowledgeBaseId: string): RetrievalResult => ({
    chunkId,
    content: '',
    chunkIndex: 0,
    documentId: `document-${chunkId}`,
    knowledgeBaseId,
    score,
})

const dataset: EvaluationDataset = {
    samples: [
        {
            id: 'sample-1',
            query: 'q-1',
            knowledgeBaseId: 'kb-1',
            relevantChunks: [
                { chunkId: 'c-1', relevance: 3 },
                { chunkId: 'c-2', relevance: 1 },
            ],
        },
        {
            id: 'sample-2',
            query: 'q-2',
            knowledgeBaseId: 'kb-2',
            relevantChunks: [{ chunkId: 'c-3', relevance: 2 }],
        },
    ],
}

describe('evaluateRetrievalDataset', () => {
    it('evaluates samples in order, passes isolated retrieval options, and retains query results', async () => {
        const calls: Array<RetrievalOptions> = []
        const retriever: RetrieverService = {
            async retrieve(options) {
                calls.push({ ...options, knowledgeBaseIds: [...options.knowledgeBaseIds] })

                return options.query === 'q-1'
                    ? [createRetrievalResult('c-1', 1, 'kb-1'), createRetrievalResult('other', 0.25, 'kb-1')]
                    : []
            },
        }

        const report = await evaluateRetrievalDataset(
            retriever,
            dataset,
            { mode: 'hybrid', topK: 2, threshold: 0.3, vectorWeight: 0.8 },
            {
                now: (() => {
                    const timestamps = [0, 10, 30, 70, 100]
                    let index = 0
                    return () => timestamps[index++] ?? 100
                })(),
            }
        )

        expect(calls).toEqual([
            {
                query: 'q-1',
                knowledgeBaseIds: ['kb-1'],
                mode: 'hybrid',
                topK: 2,
                threshold: 0.3,
                vectorWeight: 0.8,
            },
            {
                query: 'q-2',
                knowledgeBaseIds: ['kb-2'],
                mode: 'hybrid',
                topK: 2,
                threshold: 0.3,
                vectorWeight: 0.8,
            },
        ])
        expect(report.config).toEqual({
            mode: 'hybrid',
            topK: 2,
            threshold: 0.3,
            vectorWeight: 0.8,
            knowledgeBaseIds: ['kb-1', 'kb-2'],
        })
        expect(report.sampleCount).toBe(2)
        expect(report.metrics).toEqual({
            precisionAtK: 0.25,
            recallAtK: 0.25,
            mrrAtK: 0.5,
            ndcgAtK: 7 / (7 + 1 / Math.log2(3)) / 2,
        })
        expect(report.latencyMs).toEqual({ p50: 10, p95: 40 })
        expect(report.queries).toEqual([
            {
                sampleId: 'sample-1',
                query: 'q-1',
                retrievedChunkIds: ['c-1', 'other'],
                retrievedResults: [
                    { chunkId: 'c-1', score: 1 },
                    { chunkId: 'other', score: 0.25 },
                ],
                metrics: {
                    precisionAtK: 0.5,
                    recallAtK: 0.5,
                    mrrAtK: 1,
                    ndcgAtK: 7 / (7 + 1 / Math.log2(3)),
                },
                latencyMs: 10,
            },
            {
                sampleId: 'sample-2',
                query: 'q-2',
                retrievedChunkIds: [],
                retrievedResults: [],
                metrics: {
                    precisionAtK: 0,
                    recallAtK: 0,
                    mrrAtK: 0,
                    ndcgAtK: 0,
                },
                latencyMs: 40,
            },
        ])
    })

    it('fails with the sample ID when a retrieval query throws', async () => {
        const retriever: RetrieverService = {
            async retrieve(options) {
                if (options.query === 'q-2') {
                    throw new Error('retrieval unavailable')
                }

                return []
            },
        }

        await expect(evaluateRetrievalDataset(retriever, dataset, { mode: 'vector', topK: 1 }, { now: () => 0 })).rejects.toThrow(
            'Evaluation failed for sample sample-2: retrieval unavailable'
        )
    })
})
