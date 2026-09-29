// cspell:ignore ndcg

import { describe, expect, it } from 'vitest'

import { compareWithBaseline, validateEvaluationReport } from '../baseline'
import type { EvaluationMetadata, EvaluationReport, RankingMetrics } from '../types'

const baseMetrics: RankingMetrics = {
    precisionAtK: 0.8,
    recallAtK: 0.7,
    mrrAtK: 0.6,
    ndcgAtK: 0.5,
}

const createMetadata = (): EvaluationMetadata => ({
    hashStatus: 'computed',
    datasetSha256: 'dataset-sha256',
    topK: 5,
    mode: 'hybrid',
    knowledgeBaseIds: ['kb-1', 'kb-2'],
    retrievalConfig: {
        threshold: 0.2,
        vectorWeight: 0.7,
    },
})

const createReport = (overrides: Partial<Pick<EvaluationReport, 'metadata' | 'metrics' | 'latencyMs'>> = {}): EvaluationReport => ({
    mode: 'hybrid',
    config: {
        mode: 'hybrid',
        topK: 5,
        knowledgeBaseIds: ['kb-1', 'kb-2'],
        threshold: 0.2,
        vectorWeight: 0.7,
    },
    sampleCount: 2,
    metrics: { ...baseMetrics, ...overrides.metrics },
    latencyMs: overrides.latencyMs ?? { p50: 20, p95: 40 },
    queries: [],
    metadata: overrides.metadata ?? createMetadata(),
})

const createExternalReport = (overrides: { metadata?: unknown; metrics?: unknown } = {}): EvaluationReport =>
    ({ ...createReport(), ...overrides }) as unknown as EvaluationReport

describe('compareWithBaseline', () => {
    it('passes when current quality metrics equal the baseline', () => {
        const comparison = compareWithBaseline(createReport(), createReport())

        expect(comparison).toEqual({
            compatible: true,
            passed: true,
            deltas: {
                precisionAtK: 0,
                recallAtK: 0,
                mrrAtK: 0,
                ndcgAtK: 0,
            },
            reasons: [],
        })
    })

    it('fails when recall drops beyond the default zero tolerance', () => {
        const comparison = compareWithBaseline(createReport({ metrics: { recallAtK: baseMetrics.recallAtK - 0.01 } }), createReport())

        expect(comparison.passed).toBe(false)
        expect(comparison.deltas.recallAtK).toBe(baseMetrics.recallAtK - 0.01 - baseMetrics.recallAtK)
        expect(comparison.reasons).toContain('recallAtK decreased beyond tolerance')
    })

    it('passes when recall drops within the configured tolerance', () => {
        const comparison = compareWithBaseline(createReport({ metrics: { recallAtK: baseMetrics.recallAtK - 0.01 } }), createReport(), {
            recallAtK: 0.02,
        })

        expect(comparison).toMatchObject({
            compatible: true,
            passed: true,
            deltas: { recallAtK: baseMetrics.recallAtK - 0.01 - baseMetrics.recallAtK },
        })
    })

    it.each([
        ['datasetSha256', { datasetSha256: 'different-dataset-sha256' }],
        ['topK', { topK: 10 }],
        ['mode', { mode: 'vector' }],
        ['knowledgeBaseIds', { knowledgeBaseIds: ['kb-3'] }],
        ['retrievalConfig', { retrievalConfig: { threshold: 0.4, vectorWeight: 0.7 } }],
    ])('rejects comparison when %s is incompatible', (field, metadataChange) => {
        const currentMetadata = { ...createMetadata(), ...metadataChange } as EvaluationMetadata
        const comparison = compareWithBaseline(createReport({ metadata: currentMetadata }), createReport())

        expect(comparison.compatible).toBe(false)
        expect(comparison.passed).toBe(false)
        expect(comparison.reasons).toContain(`metadata.${String(field)} differs`)
    })

    it('does not let latency changes affect the quality gate', () => {
        const comparison = compareWithBaseline(
            createReport({ latencyMs: { p50: 200, p95: 900 } }),
            createReport({ latencyMs: { p50: 20, p95: 40 } })
        )

        expect(comparison.passed).toBe(true)
    })

    it('compares retrieval config by value instead of object insertion order', () => {
        const currentMetadata = {
            ...createMetadata(),
            retrievalConfig: {
                vectorWeight: 0.7,
                threshold: 0.2,
            },
        } as EvaluationMetadata

        expect(compareWithBaseline(createReport({ metadata: currentMetadata }), createReport()).passed).toBe(true)
    })

    it('validates report mode, metadata, and quality metrics before service execution', () => {
        expect(validateEvaluationReport(createReport(), 'baseline')).toEqual([])
        expect(validateEvaluationReport({ mode: 'vector', metrics: {} }, 'baseline')).toEqual([
            'baseline metadata is missing comparison context',
            'baseline metrics missing metric: precisionAtK',
            'baseline metrics missing metric: recallAtK',
            'baseline metrics missing metric: mrrAtK',
            'baseline metrics missing metric: ndcgAtK',
        ])
    })

    it('returns current minus baseline for all four quality metrics', () => {
        const comparison = compareWithBaseline(
            createReport({
                metrics: {
                    precisionAtK: 0.9,
                    recallAtK: 0.6,
                    mrrAtK: 0.65,
                    ndcgAtK: 0.45,
                },
            }),
            createReport()
        )

        expect(comparison.deltas).toEqual({
            precisionAtK: 0.9 - 0.8,
            recallAtK: 0.6 - 0.7,
            mrrAtK: 0.65 - 0.6,
            ndcgAtK: 0.45 - 0.5,
        })
        expect(comparison.passed).toBe(false)
    })

    it.each([
        ['null metadata', null],
        ['string metadata', 'metadata'],
        ['missing dataset hash', { ...createMetadata(), datasetSha256: undefined }],
        ['invalid hash status', { ...createMetadata(), hashStatus: 'invalid' }],
    ])('rejects %s without throwing', (_description, metadata) => {
        expect(() => compareWithBaseline(createExternalReport({ metadata }), createReport())).not.toThrow()

        const comparison = compareWithBaseline(createExternalReport({ metadata }), createReport())

        expect(comparison.compatible).toBe(false)
        expect(comparison.passed).toBe(false)
        expect(comparison.reasons.some(reason => reason.includes('metadata'))).toBe(true)
    })

    it.each([
        ['empty metrics', {}],
        ['missing metric', { precisionAtK: baseMetrics.precisionAtK }],
        ['non-finite metric', { ...baseMetrics, mrrAtK: Number.NaN }],
    ])('rejects %s on both reports with a structured failure', (_description, metrics) => {
        for (const side of ['current', 'baseline'] as const) {
            const current = side === 'current' ? createExternalReport({ metrics }) : createReport()
            const baseline = side === 'baseline' ? createExternalReport({ metrics }) : createReport()
            const comparison = compareWithBaseline(current, baseline)

            expect(comparison.compatible).toBe(false)
            expect(comparison.passed).toBe(false)
            expect(
                comparison.reasons.some(
                    reason => reason.includes(`${side} metrics`) && (reason.includes('malformed') || reason.includes('missing metric'))
                )
            ).toBe(true)
        }
    })

    it('preserves a tiny negative delta instead of rounding it to zero', () => {
        const currentRecall = baseMetrics.recallAtK - 1e-13
        const comparison = compareWithBaseline(createReport({ metrics: { recallAtK: currentRecall } }), createReport())

        expect(comparison.deltas.recallAtK).toBe(currentRecall - baseMetrics.recallAtK)
        expect(comparison.deltas.recallAtK).toBeLessThan(0)
        expect(comparison.passed).toBe(false)
        expect(comparison.reasons).toContain('recallAtK decreased beyond tolerance')
    })
})
