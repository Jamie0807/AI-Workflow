// cspell:ignore ndcg

import { describe, expect, it } from 'vitest'

import type { FailureAnalysisInput } from '../failure-analysis'
import { analyzeModeFailure, validateModeFailureInput } from '../failure-analysis'
import { analyzeRagFailure, validateFailureAnalysisInput } from '../index'
import type { EvaluationDataset, EvaluationReport, RankingMetrics } from '../types'

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

const threeQueryDataset: EvaluationDataset = {
    samples: [
        {
            id: 'q-1',
            query: 'scope',
            knowledgeBaseId: 'kb-1',
            relevantChunks: [
                { chunkId: 'core-3', relevance: 3 },
                { chunkId: 'core-2', relevance: 1 },
                { chunkId: 'background-1', relevance: 1 },
            ],
        },
        {
            id: 'q-2',
            query: 'index',
            knowledgeBaseId: 'kb-1',
            relevantChunks: [
                { chunkId: 'core-3', relevance: 3 },
                { chunkId: 'background-2', relevance: 1 },
            ],
        },
        {
            id: 'q-3',
            query: 'chunk',
            knowledgeBaseId: 'kb-1',
            relevantChunks: [{ chunkId: 'background-3', relevance: 1 }],
        },
    ],
}

type QueryDefinition = {
    sampleId: string
    query: string
    retrievedChunkIds: string[]
    metrics: RankingMetrics
}

function createReport(mode: EvaluationReport['mode'], definitions: readonly QueryDefinition[]): EvaluationReport {
    return {
        mode,
        config: { mode, topK: 3, knowledgeBaseIds: ['kb-1'], threshold: 0.2, vectorWeight: 0.7 },
        sampleCount: definitions.length,
        metrics: { precisionAtK: 0, recallAtK: 0, mrrAtK: 0, ndcgAtK: 0 },
        latencyMs: { p50: 10, p95: 20 },
        queries: definitions.map(definition => ({
            sampleId: definition.sampleId,
            query: definition.query,
            retrievedChunkIds: definition.retrievedChunkIds,
            retrievedResults: definition.retrievedChunkIds.map((chunkId, index) => ({ chunkId, score: 1 - index / 10 })),
            metrics: { ...definition.metrics },
            latencyMs: 12,
        })),
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

function createInputWithThreeQueries(): FailureAnalysisInput {
    return {
        dataset: threeQueryDataset,
        datasetSha256: 'dataset-sha',
        datasetPath: '/tmp/evaluation-dataset.json',
        reportPath: '/tmp/baseline-report.json',
        gitRevision: 'abc123',
        generatedAt: '2026-09-30T00:00:00.000Z',
        reports: [
            createReport('vector', [
                {
                    sampleId: 'q-1',
                    query: 'scope',
                    retrievedChunkIds: ['core-3'],
                    metrics: { precisionAtK: 0.8, recallAtK: 0.8, mrrAtK: 1, ndcgAtK: 0.9 },
                },
                {
                    sampleId: 'q-2',
                    query: 'index',
                    retrievedChunkIds: ['noise'],
                    metrics: { precisionAtK: 0.1, recallAtK: 0.1, mrrAtK: 0.1, ndcgAtK: 0.1 },
                },
                {
                    sampleId: 'q-3',
                    query: 'chunk',
                    retrievedChunkIds: ['background-3'],
                    metrics: { precisionAtK: 0.8, recallAtK: 1, mrrAtK: 1, ndcgAtK: 0.7 },
                },
            ]),
            createReport('fulltext', [
                {
                    sampleId: 'q-1',
                    query: 'scope',
                    retrievedChunkIds: ['core-2', 'noise'],
                    metrics: { precisionAtK: 0.4, recallAtK: 0.3, mrrAtK: 0.6, ndcgAtK: 0.3 },
                },
                {
                    sampleId: 'q-2',
                    query: 'index',
                    retrievedChunkIds: ['noise'],
                    metrics: { precisionAtK: 0, recallAtK: 0, mrrAtK: 0, ndcgAtK: 0.05 },
                },
                {
                    sampleId: 'q-3',
                    query: 'chunk',
                    retrievedChunkIds: ['noise'],
                    metrics: { precisionAtK: 0, recallAtK: 0, mrrAtK: 0, ndcgAtK: 0.2 },
                },
            ]),
            createReport('hybrid', [
                {
                    sampleId: 'q-1',
                    query: 'scope',
                    retrievedChunkIds: ['noise'],
                    metrics: { precisionAtK: 0, recallAtK: 0, mrrAtK: 0, ndcgAtK: 0.2 },
                },
                {
                    sampleId: 'q-2',
                    query: 'index',
                    retrievedChunkIds: ['noise'],
                    metrics: { precisionAtK: 0, recallAtK: 0, mrrAtK: 0, ndcgAtK: 0.12 },
                },
                {
                    sampleId: 'q-3',
                    query: 'chunk',
                    retrievedChunkIds: ['noise'],
                    metrics: { precisionAtK: 0, recallAtK: 0, mrrAtK: 0, ndcgAtK: 0.1 },
                },
            ]),
        ],
    }
}

function createInputWithEqualMetrics(): FailureAnalysisInput {
    const input = createInputWithThreeQueries()
    const equalMetrics: RankingMetrics = { precisionAtK: 0.5, recallAtK: 0.5, mrrAtK: 0.5, ndcgAtK: 0.5 }

    return {
        ...input,
        reports: input.reports.map(report => ({
            ...report,
            queries: report.queries.map(query => ({ ...query, metrics: { ...equalMetrics } })),
        })),
    }
}

function createInputForPriorityTieBreaks(): FailureAnalysisInput {
    const input = createInputWithThreeQueries()
    const additionalSample: EvaluationDataset['samples'][number] = {
        id: 'q-4',
        query: 'tie',
        knowledgeBaseId: 'kb-1',
        relevantChunks: [{ chunkId: 'core-4', relevance: 3 }],
    }
    const priorityDefinitions = new Map([
        ['q-1', { retrievedChunkIds: ['noise'], recall: 0.4 }],
        ['q-2', { retrievedChunkIds: ['noise', 'noise-2'], recall: 0.5 }],
        ['q-3', { retrievedChunkIds: ['noise'], recall: 0.5 }],
        ['q-4', { retrievedChunkIds: ['noise'], recall: 0.5 }],
    ])

    return {
        ...input,
        dataset: { ...input.dataset, samples: [...input.dataset.samples, additionalSample] },
        reports: input.reports.map(report => ({
            ...report,
            sampleCount: 4,
            queries: [
                ...report.queries.map(query => {
                    const definition = priorityDefinitions.get(query.sampleId)!
                    return {
                        ...query,
                        retrievedChunkIds: [...definition.retrievedChunkIds],
                        retrievedResults: definition.retrievedChunkIds.map((chunkId, index) => ({ chunkId, score: 1 - index / 10 })),
                        metrics: { precisionAtK: 0, recallAtK: definition.recall, mrrAtK: 0, ndcgAtK: 0.2 },
                    }
                }),
                {
                    sampleId: 'q-4',
                    query: 'tie',
                    retrievedChunkIds: ['noise'],
                    retrievedResults: [{ chunkId: 'noise', score: 1 }],
                    metrics: { precisionAtK: 0, recallAtK: 0.5, mrrAtK: 0, ndcgAtK: 0.2 },
                    latencyMs: 12,
                },
            ],
        })),
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

it('compares modes with deterministic focus ranking and summarizes misses', () => {
    const result = analyzeRagFailure(createInputWithThreeQueries())

    expect(result.queryComparisons[0]).toMatchObject({
        sampleId: 'q-1',
        recommendedFocusMode: 'vector',
    })
    expect(result.queryComparisons[0]?.modes.vector.uniqueCoveredRelevantChunkIds).toEqual(['core-3'])
    expect(result.queryComparisons[0]?.modes.hybrid.uniqueMissedRelevantChunkIds).toEqual(['core-3', 'core-2'])

    expect(result.byMode.fulltext.summary).toMatchObject({
        queryCount: 3,
        completeCoverageCount: 0,
        partialCoverageCount: 1,
        zeroCoverageCount: 2,
        backgroundOnlyCount: 1,
        falsePositiveCount: 3,
        averageFalsePositivePerQuery: 1,
    })
    expect(result.byMode.fulltext.summary.mostMissedRelevantChunks[0]).toEqual({
        chunkId: 'core-3',
        missedCount: 2,
    })

    expect(result.priorityFailures.map(item => item.sampleId)).toEqual(['q-2', 'q-3', 'q-1'])
})

it('uses vector, fulltext, hybrid as the final tie-break order', () => {
    const result = analyzeRagFailure(createInputWithEqualMetrics())

    expect(result.queryComparisons[0]?.recommendedFocusMode).toBe('vector')
})

it('orders priority failures by recall, false positives, then sample ID', () => {
    const result = analyzeRagFailure(createInputForPriorityTieBreaks())

    expect(result.priorityFailures.map(item => item.sampleId)).toEqual(['q-1', 'q-2', 'q-3', 'q-4'])
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

describe('validateFailureAnalysisInput', () => {
    it.each([
        [
            'dataset SHA',
            (input: FailureAnalysisInput) => ({
                ...input,
                reports: input.reports.map(report =>
                    report.metadata === undefined ? report : { ...report, metadata: { ...report.metadata, datasetSha256: 'other-sha' } }
                ),
            }),
            'mode vector dataset SHA',
        ],
        [
            'missing metadata',
            (input: FailureAnalysisInput) => ({
                ...input,
                reports: input.reports.map(report => (report.mode === 'vector' ? { ...report, metadata: undefined } : report)),
            }),
            'mode vector metadata is required for dataset SHA validation',
        ],
        [
            'missing dataset SHA',
            (input: FailureAnalysisInput) => ({
                ...input,
                reports: input.reports.map(report =>
                    report.mode === 'fulltext'
                        ? {
                              ...report,
                              metadata: { ...report.metadata, datasetSha256: undefined } as unknown as EvaluationReport['metadata'],
                          }
                        : report
                ),
            }),
            'mode fulltext metadata.datasetSha256 is required for dataset SHA validation',
        ],
        [
            'missing query',
            (input: FailureAnalysisInput) => ({
                ...input,
                reports: input.reports.map(report => ({
                    ...report,
                    queries: report.queries.filter(query => query.sampleId !== 'q-2'),
                })),
            }),
            'sample q-2',
        ],
        [
            'topK mismatch',
            (input: FailureAnalysisInput) => ({
                ...input,
                reports: input.reports.map((report, index) =>
                    index === 1 ? { ...report, config: { ...report.config, topK: 10 } } : report
                ),
            }),
            'mode fulltext topK 10',
        ],
        [
            'duplicate retrieved chunk',
            (input: FailureAnalysisInput) => ({
                ...input,
                reports: input.reports.map(report => ({
                    ...report,
                    queries: report.queries.map(query =>
                        query.sampleId === 'q-1' ? { ...query, retrievedChunkIds: ['core-3', 'core-3'] } : query
                    ),
                })),
            }),
            'mode vector sample q-1 has duplicate retrieved chunk ID core-3',
        ],
    ] as const)('rejects %s with a localized error', (_label, mutate, expectedLocation) => {
        const errors = validateFailureAnalysisInput(mutate(createInputWithThreeQueries()))

        expect(errors).toEqual(expect.arrayContaining([expect.stringContaining(expectedLocation)]))
    })

    it('rejects missing and duplicate modes', () => {
        const input = createInputWithThreeQueries()

        expect(validateFailureAnalysisInput({ ...input, reports: input.reports.slice(0, 2) }).join('\n')).toContain('hybrid')
        expect(
            validateFailureAnalysisInput({ ...input, reports: [input.reports[0]!, input.reports[0]!, input.reports[2]!] }).join('\n')
        ).toContain('duplicate')
    })

    it('rejects query IDs that do not match the dataset and retrieved result mismatches', () => {
        const input = createInputWithThreeQueries()
        const invalidReports = input.reports.map(report => ({
            ...report,
            queries: report.queries.map(query =>
                query.sampleId === 'q-3'
                    ? { ...query, sampleId: 'q-unknown' }
                    : query.sampleId === 'q-1'
                      ? { ...query, retrievedResults: [{ chunkId: 'other', score: 1 }] }
                      : query
            ),
        }))

        const errors = validateFailureAnalysisInput({ ...input, reports: invalidReports }).join('\n')

        expect(errors).toContain('q-unknown')
        expect(errors).toContain('other')
    })
})
