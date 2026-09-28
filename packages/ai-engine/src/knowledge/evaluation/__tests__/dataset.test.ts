import { describe, expect, it } from 'vitest'

import { parseEvaluationDataset } from '../dataset'

describe('parseEvaluationDataset', () => {
    it('parses valid JSONL and preserves line metadata', () => {
        const dataset = parseEvaluationDataset(
            [
                JSON.stringify({
                    id: 'q-1',
                    query: '如何登录？',
                    knowledgeBaseId: 'kb-1',
                    relevantChunks: [{ chunkId: 'doc-1_0', relevance: 3 }],
                }),
            ].join('\n')
        )

        expect(dataset.samples[0]).toMatchObject({
            id: 'q-1',
            query: '如何登录？',
            knowledgeBaseId: 'kb-1',
        })
        expect(dataset.samples[0]?.relevantChunks).toEqual([{ chunkId: 'doc-1_0', relevance: 3 }])
    })

    it('reports the JSONL line for invalid input', () => {
        expect(() => parseEvaluationDataset('invalid-json')).toThrow('line 1')
    })

    it.each([
        ['empty query', { id: 'q-1', query: '', knowledgeBaseId: 'kb-1', relevantChunks: [{ chunkId: 'c-1', relevance: 1 }] }],
        ['empty relevant chunks', { id: 'q-1', query: '登录', knowledgeBaseId: 'kb-1', relevantChunks: [] }],
        ['invalid relevance', { id: 'q-1', query: '登录', knowledgeBaseId: 'kb-1', relevantChunks: [{ chunkId: 'c-1', relevance: 4 }] }],
    ])('rejects %s', (_, sample) => {
        expect(() => parseEvaluationDataset(JSON.stringify(sample))).toThrow()
    })

    it('rejects duplicate sample IDs and duplicate relevant chunk IDs', () => {
        const sample = JSON.stringify({
            id: 'q-1',
            query: '登录',
            knowledgeBaseId: 'kb-1',
            relevantChunks: [
                { chunkId: 'c-1', relevance: 1 },
                { chunkId: 'c-1', relevance: 3 },
            ],
        })
        expect(() => parseEvaluationDataset([sample, sample].join('\n'))).toThrow(/duplicate/i)
    })
})
