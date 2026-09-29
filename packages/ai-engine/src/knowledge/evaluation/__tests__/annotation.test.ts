// cspell:ignore unreviewed

import { describe, expect, it } from 'vitest'

import { finalizeAnnotationDataset, parseAnnotationQueries, parseAnnotationReviews } from '..'

const baseQuery = {
    id: 'q-1',
    query: '洪水风险？',
    intent: 'risk',
    knowledgeBaseId: 'kb-1',
}

const candidate = {
    chunkId: 'chunk-1',
    content: '洪水风险取决于降雨量和地形。',
    chunkIndex: 0,
    documentId: 'doc-1',
    knowledgeBaseId: 'kb-1',
    candidateSources: {
        vector: { rank: 1, score: 0.95 },
    },
    humanRelevance: 3,
    rationale: '直接解释风险判断。',
}

describe('parseAnnotationQueries', () => {
    it('parses valid JSONL queries', () => {
        expect(parseAnnotationQueries(JSON.stringify(baseQuery))).toEqual([baseQuery])
    })

    it('rejects duplicate query IDs with the line number', () => {
        const text = [
            JSON.stringify({ id: 'q-1', query: '洪水风险？', intent: 'risk', knowledgeBaseId: 'kb-1' }),
            JSON.stringify({ id: 'q-1', query: '地震记录？', intent: 'hazard', knowledgeBaseId: 'kb-1' }),
        ].join('\n')

        expect(() => parseAnnotationQueries(text)).toThrow('duplicate query ID q-1 on line 2')
    })

    it.each([
        ['', 'at least one annotation query is required'],
        ['not-json', 'line 1'],
        [JSON.stringify({ ...baseQuery, query: '   ' }), 'query must be a non-empty string'],
        [JSON.stringify({ ...baseQuery, intent: '' }), 'intent must be a non-empty string'],
        [JSON.stringify({ ...baseQuery, knowledgeBaseId: '' }), 'knowledgeBaseId must be a non-empty string'],
    ])('rejects malformed or blank query input %j', (text, message) => {
        expect(() => parseAnnotationQueries(text)).toThrow(message)
    })
})

describe('parseAnnotationReviews', () => {
    it('parses candidates and preserves nullable human decisions', () => {
        const review = {
            ...baseQuery,
            candidates: [{ ...candidate, humanRelevance: null, rationale: '' }],
        }

        expect(parseAnnotationReviews(JSON.stringify(review))).toEqual([review])
    })

    it('rejects duplicate review IDs with the line number', () => {
        const review = JSON.stringify({ ...baseQuery, candidates: [candidate] })

        expect(() => parseAnnotationReviews([review, review].join('\n'))).toThrow('duplicate review ID q-1 on line 2')
    })

    it.each([
        ['missing candidates', { ...baseQuery }, 'candidates must be a non-empty array'],
        [
            'duplicate candidates',
            { ...baseQuery, candidates: [candidate, { ...candidate, content: '重复块' }] },
            'duplicate candidate chunk ID: chunk-1',
        ],
        [
            'invalid relevance',
            { ...baseQuery, candidates: [{ ...candidate, humanRelevance: 4 }] },
            'humanRelevance must be 0, 1, 2, or 3, or null',
        ],
        [
            'non-zero relevance without rationale',
            { ...baseQuery, candidates: [{ ...candidate, rationale: '   ' }] },
            'rationale must be a non-empty string when humanRelevance is non-zero',
        ],
    ])('rejects %s', (_, review, message) => {
        expect(() => parseAnnotationReviews(JSON.stringify(review))).toThrow(message)
    })
})

describe('finalizeAnnotationDataset', () => {
    it('rejects an unreviewed candidate during finalization', () => {
        const review = parseAnnotationReviews(
            JSON.stringify({
                ...baseQuery,
                candidates: [{ ...candidate, humanRelevance: null, rationale: '' }],
            })
        )

        expect(() => finalizeAnnotationDataset(review)).toThrow('q-1 has unreviewed candidate chunk-1')
    })

    it('keeps only non-zero labels and preserves graded relevance', () => {
        const review = parseAnnotationReviews(
            JSON.stringify({
                ...baseQuery,
                candidates: [
                    { ...candidate, chunkId: 'chunk-1', humanRelevance: 1, rationale: '提供相关背景。' },
                    { ...candidate, chunkId: 'chunk-2', humanRelevance: 3, rationale: '直接解释风险判断。' },
                    { ...candidate, chunkId: 'chunk-3', humanRelevance: 0, rationale: '只讨论地震。' },
                    { ...candidate, chunkId: 'chunk-4', humanRelevance: 3, rationale: '补充风险判断。' },
                ],
            })
        )

        expect(finalizeAnnotationDataset(review).samples[0]?.relevantChunks).toEqual([
            { chunkId: 'chunk-2', relevance: 3 },
            { chunkId: 'chunk-4', relevance: 3 },
            { chunkId: 'chunk-1', relevance: 1 },
        ])
    })

    it('rejects a sample without a non-zero label', () => {
        const review = parseAnnotationReviews(
            JSON.stringify({
                ...baseQuery,
                candidates: [{ ...candidate, humanRelevance: 0, rationale: '' }],
            })
        )

        expect(() => finalizeAnnotationDataset(review)).toThrow('q-1 has no non-zero human relevance label')
    })
})
