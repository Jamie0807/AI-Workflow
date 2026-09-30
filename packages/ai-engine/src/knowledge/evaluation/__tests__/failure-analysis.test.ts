// cspell:ignore ndcg

import { describe, expect, it } from 'vitest'

import { analyzeModeFailure, validateModeFailureInput } from '../failure-analysis'
import type { EvaluationDataset, EvaluationReport } from '../types'

const dataset: EvaluationDataset = {
    samples: [
        {
            id: 'q-1',
            query: 'scope',
            knowledgeBaseId: 'kb-1',
            relevantChunks: [
                { chunkId: 'core-3', relevance: 3 },
                { chunkId: 'core-2', relevance: 2 },
                { chunkId: 'background-1', relevance: 1 },
            ],
        },
    ],
}

function report(mode: EvaluationReport['mode'], retrievedChunkIds: string[]): EvaluationReport {
    return {
        mode,
        config: { mode, topK: 3, knowledgeBaseIds: ['kb-1'], threshold: 0.2, vectorWeight: 0.7 },
        sampleCount: 1,
        metrics: { precisionAtK: 0, recallAtK: 0, mrrAtK: 0, ndcgAtK: 0 },
        latencyMs: { p50: 10, p95: 20 },
        queries: [
            {
                sampleId: 'q-1',
                query: 'scope',
                retrievedChunkIds,
                retrievedResults: retrievedChunkIds.map((chunkId, index) => ({ chunkId, score: 1 - index / 10 })),
                metrics: { precisionAtK: 0.5, recallAtK: 0.5, mrrAtK: 1, ndcgAtK: 0.5 },
                latencyMs: 12,
            },
        ],
        metadata: {
            hashStatus: 'computed',
            datasetSha256: 'dataset-sha',
            topK: 3,
            mode,
            knowledgeBaseIds: ['kb-1'],
            retrievalConfig: { threshold: 0.2, vectorWeight: 0.7 },
        },
    }
}

it('classifies coverage and preserves the relevance-level distinctions', () => {
    const vector = analyzeModeFailure(dataset, report('vector', ['core-3', 'core-2', 'background-1']))
    const fulltext = analyzeModeFailure(dataset, report('fulltext', ['background-1', 'noise']))
    const hybrid = analyzeModeFailure(dataset, report('hybrid', ['noise']))

    expect(vector.queries[0]).toMatchObject({
        coverageStatus: 'complete',
        coveredRelevantChunkIds: ['core-3', 'core-2', 'background-1'],
        missedRelevantChunkIds: [],
        falsePositiveChunkIds: [],
        missedCoreChunkIds: [],
        backgroundOnly: false,
        maxRetrievedRelevance: 3,
    })
    expect(fulltext.queries[0]).toMatchObject({
        coverageStatus: 'partial',
        coveredRelevantChunkIds: ['background-1'],
        missedRelevantChunkIds: ['core-3', 'core-2'],
        falsePositiveChunkIds: ['noise'],
        missedCoreChunkIds: ['core-3', 'core-2'],
        backgroundOnly: true,
        maxRetrievedRelevance: 1,
    })
    expect(hybrid.queries[0]).toMatchObject({
        coverageStatus: 'zero',
        coveredRelevantChunkIds: [],
        missedRelevantChunkIds: ['core-3', 'core-2', 'background-1'],
        falsePositiveChunkIds: ['noise'],
        missedCoreChunkIds: ['core-3', 'core-2'],
        backgroundOnly: false,
        maxRetrievedRelevance: 0,
    })

    expect(fulltext.summary).toEqual({
        queryCount: 1,
        completeCoverageCount: 0,
        partialCoverageCount: 1,
        zeroCoverageCount: 0,
        backgroundOnlyCount: 1,
        falsePositiveCount: 1,
        averageFalsePositivePerQuery: 1,
        mostMissedRelevantChunks: [
            { chunkId: 'core-2', missedCount: 1 },
            { chunkId: 'core-3', missedCount: 1 },
        ],
    })
    expect(fulltext).toMatchObject({
        mode: 'fulltext',
        topK: 3,
        metrics: { precisionAtK: 0, recallAtK: 0, mrrAtK: 0, ndcgAtK: 0 },
        latencyMs: { p50: 10, p95: 20 },
    })
})

describe('validateModeFailureInput', () => {
    it('rejects mismatched mode fields', () => {
        const invalidReport = report('vector', ['noise'])
        invalidReport.config = { ...invalidReport.config, mode: 'fulltext' }

        const errors = validateModeFailureInput(dataset, invalidReport).join('\n')

        expect(errors).toContain('vector')
        expect(errors).toContain('fulltext')
    })

    it('rejects report queries that do not match dataset sample IDs', () => {
        const invalidReport = report('vector', ['noise'])
        invalidReport.queries = [{ ...invalidReport.queries[0]!, sampleId: 'q-unknown' }]

        expect(validateModeFailureInput(dataset, invalidReport).join('\n')).toEqual(expect.stringContaining('q-unknown'))
    })

    it('rejects duplicate report queries and duplicate retrieved chunk IDs', () => {
        const invalidReport = report('vector', ['noise'])
        const query = invalidReport.queries[0]!
        invalidReport.queries = [query, { ...query }]
        invalidReport.queries[0] = {
            ...invalidReport.queries[0]!,
            retrievedChunkIds: ['noise', 'noise'],
            retrievedResults: [
                { chunkId: 'noise', score: 1 },
                { chunkId: 'noise', score: 0.9 },
            ],
        }

        const errors = validateModeFailureInput(dataset, invalidReport).join('\n')

        expect(errors).toContain('vector')
        expect(errors).toContain('q-1')
        expect(errors).toContain('noise')
    })

    it('rejects retrieved result IDs that differ from retrieved chunk IDs', () => {
        const invalidReport = report('vector', ['noise'])
        invalidReport.queries[0] = {
            ...invalidReport.queries[0]!,
            retrievedResults: [{ chunkId: 'other', score: 1 }],
        }

        expect(validateModeFailureInput(dataset, invalidReport).join('\n')).toContain('q-1')
        expect(validateModeFailureInput(dataset, invalidReport).join('\n')).toContain('other')
    })

    it('rejects duplicate relevant chunk IDs in a dataset sample', () => {
        const invalidDataset: EvaluationDataset = {
            samples: [
                {
                    ...dataset.samples[0]!,
                    relevantChunks: [...dataset.samples[0]!.relevantChunks, { chunkId: 'core-3', relevance: 1 }],
                },
            ],
        }

        const errors = validateModeFailureInput(invalidDataset, report('vector', ['noise'])).join('\n')

        expect(errors).toContain('q-1')
        expect(errors).toContain('core-3')
    })
})
