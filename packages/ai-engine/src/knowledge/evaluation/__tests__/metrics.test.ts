// cspell:ignore ndcg

import { describe, expect, it } from 'vitest'

import { aggregateRankingMetrics, calculateRankingMetrics } from '../metrics'

describe('calculateRankingMetrics', () => {
    it('scores a perfect ranking', () => {
        expect(
            calculateRankingMetrics(
                ['c-1', 'c-2', 'c-3'],
                [
                    { chunkId: 'c-1', relevance: 3 },
                    { chunkId: 'c-2', relevance: 1 },
                ],
                3
            )
        ).toEqual({
            precisionAtK: 2 / 3,
            recallAtK: 1,
            mrrAtK: 1,
            ndcgAtK: 1,
        })
    })

    it('penalizes a relevant result that is ranked below an irrelevant result', () => {
        expect(
            calculateRankingMetrics(
                ['c-3', 'c-1', 'c-2'],
                [
                    { chunkId: 'c-1', relevance: 3 },
                    { chunkId: 'c-2', relevance: 1 },
                ],
                3
            ).mrrAtK
        ).toBe(1 / 2)
    })

    it('uses graded relevance for nDCG', () => {
        const metrics = calculateRankingMetrics(
            ['low', 'high'],
            [
                { chunkId: 'high', relevance: 3 },
                { chunkId: 'low', relevance: 1 },
            ],
            2
        )

        expect(metrics.ndcgAtK).toBeCloseTo((1 + 7 / Math.log2(3)) / (7 + 1 / Math.log2(3)))
    })

    it('returns zero for a ranking with no relevant hit', () => {
        expect(calculateRankingMetrics(['irrelevant'], [{ chunkId: 'relevant', relevance: 3 }], 1)).toEqual({
            precisionAtK: 0,
            recallAtK: 0,
            mrrAtK: 0,
            ndcgAtK: 0,
        })
    })

    it('deduplicates retrieved IDs before scoring', () => {
        expect(
            calculateRankingMetrics(
                ['c-1', 'c-1', 'irrelevant'],
                [
                    { chunkId: 'c-1', relevance: 3 },
                    { chunkId: 'c-2', relevance: 1 },
                ],
                3
            )
        ).toEqual({
            precisionAtK: 1 / 3,
            recallAtK: 1 / 2,
            mrrAtK: 1,
            ndcgAtK: 7 / (7 + 1 / Math.log2(3)),
        })
    })

    it('keeps K as the precision denominator when fewer results are returned', () => {
        expect(calculateRankingMetrics(['c-1'], [{ chunkId: 'c-1', relevance: 1 }], 3).precisionAtK).toBe(1 / 3)
    })

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid K: %s', invalidK => {
        expect(() => calculateRankingMetrics([], [{ chunkId: 'c-1', relevance: 1 }], invalidK)).toThrow('k must be a positive integer')
    })

    it('rejects an empty relevant chunk set', () => {
        expect(() => calculateRankingMetrics([], [], 1)).toThrow('relevantChunks must not be empty')
    })
})

describe('aggregateRankingMetrics', () => {
    it('returns a singleton metric unchanged', () => {
        expect(aggregateRankingMetrics([{ precisionAtK: 1, recallAtK: 1, mrrAtK: 1, ndcgAtK: 1 }])).toEqual({
            precisionAtK: 1,
            recallAtK: 1,
            mrrAtK: 1,
            ndcgAtK: 1,
        })
    })

    it('calculates an unweighted macro average', () => {
        expect(
            aggregateRankingMetrics([
                { precisionAtK: 1, recallAtK: 0.5, mrrAtK: 0, ndcgAtK: 1 },
                { precisionAtK: 0, recallAtK: 1, mrrAtK: 1, ndcgAtK: 0 },
            ])
        ).toEqual({
            precisionAtK: 0.5,
            recallAtK: 0.75,
            mrrAtK: 0.5,
            ndcgAtK: 0.5,
        })
    })

    it('keeps averages of extreme finite metrics finite', () => {
        const aggregated = aggregateRankingMetrics([
            { precisionAtK: Number.MAX_VALUE, recallAtK: Number.MAX_VALUE, mrrAtK: Number.MAX_VALUE, ndcgAtK: Number.MAX_VALUE },
            { precisionAtK: Number.MAX_VALUE, recallAtK: Number.MAX_VALUE, mrrAtK: Number.MAX_VALUE, ndcgAtK: Number.MAX_VALUE },
            { precisionAtK: Number.MAX_VALUE, recallAtK: Number.MAX_VALUE, mrrAtK: Number.MAX_VALUE, ndcgAtK: Number.MAX_VALUE },
        ])

        expect(Object.values(aggregated).every(value => Number.isFinite(value))).toBe(true)
    })

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('rejects non-finite metric input: %s', invalidValue => {
        expect(() => aggregateRankingMetrics([{ precisionAtK: invalidValue, recallAtK: 0, mrrAtK: 0, ndcgAtK: 0 }])).toThrow(
            'metric precisionAtK must be finite'
        )
    })

    it('rejects an empty metric set', () => {
        expect(() => aggregateRankingMetrics([])).toThrow('metrics must not be empty')
    })
})
