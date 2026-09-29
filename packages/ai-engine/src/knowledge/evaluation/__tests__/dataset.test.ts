import { describe, expect, it } from 'vitest'

import { parseEvaluationDataset } from '../dataset'
import type { EvaluationMetadata } from '../types'

const metadataFixtures = [
    {
        hashStatus: 'computed',
        datasetSha256: 'computed-sha256',
        topK: 5,
        mode: 'vector',
        knowledgeBaseIds: ['kb-1'],
        retrievalConfig: { threshold: 0.2, vectorWeight: 1 },
    },
    {
        hashStatus: 'unverified',
        datasetSha256: 'unverified-sha256',
        topK: 5,
        mode: 'vector',
        knowledgeBaseIds: ['kb-1'],
        retrievalConfig: { threshold: 0.2, vectorWeight: 1 },
    },
] as const satisfies readonly EvaluationMetadata[]

const getHashStatus = (metadata: EvaluationMetadata): 'computed' | 'unverified' => {
    if (metadata.hashStatus === 'computed') {
        return 'computed'
    }

    return metadata.hashStatus
}

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

    it.each(['', '\n', '\n\n'])('rejects an empty evaluation dataset: %j', text => {
        expect(() => parseEvaluationDataset(text)).toThrow('at least one sample is required')
    })

    it.each([
        ['empty query', { id: 'q-1', query: '', knowledgeBaseId: 'kb-1', relevantChunks: [{ chunkId: 'c-1', relevance: 1 }] }],
        ['empty relevant chunks', { id: 'q-1', query: '登录', knowledgeBaseId: 'kb-1', relevantChunks: [] }],
        ['invalid relevance', { id: 'q-1', query: '登录', knowledgeBaseId: 'kb-1', relevantChunks: [{ chunkId: 'c-1', relevance: 4 }] }],
    ])('rejects %s', (_, sample) => {
        expect(() => parseEvaluationDataset(JSON.stringify(sample))).toThrow()
    })

    it('rejects duplicate sample IDs when their chunk IDs are distinct', () => {
        const samples = [
            {
                id: 'q-1',
                query: '登录',
                knowledgeBaseId: 'kb-1',
                relevantChunks: [{ chunkId: 'c-1', relevance: 1 }],
            },
            {
                id: 'q-1',
                query: '退出',
                knowledgeBaseId: 'kb-1',
                relevantChunks: [{ chunkId: 'c-2', relevance: 3 }],
            },
        ]

        expect(() => parseEvaluationDataset(samples.map(sample => JSON.stringify(sample)).join('\n'))).toThrow('duplicate sample ID')
    })

    it('rejects duplicate relevant chunk IDs within a sample with a unique sample ID', () => {
        const sample = JSON.stringify({
            id: 'q-1',
            query: '登录',
            knowledgeBaseId: 'kb-1',
            relevantChunks: [
                { chunkId: 'c-1', relevance: 1 },
                { chunkId: 'c-1', relevance: 3 },
            ],
        })

        expect(() => parseEvaluationDataset(sample)).toThrow('duplicate relevant chunk ID')
    })

    it('constructs metadata with explicit hash states and narrows them reliably', () => {
        expect(metadataFixtures.map(getHashStatus)).toEqual(['computed', 'unverified'])
    })
})
