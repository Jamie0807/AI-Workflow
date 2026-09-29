import { describe, expect, it } from 'vitest'

import { parseCliArgs } from '../../../../../../apps/workflow/scripts/evaluate-rag'
import { createDatasetRetriever } from '../../../../../../apps/workflow/scripts/rag-evaluation-runtime'

describe('parseCliArgs', () => {
    it('rejects a missing dataset before any service setup can happen', () => {
        expect(() => parseCliArgs(['--mode', 'vector'])).toThrow('--dataset is required')
    })

    it('rejects an unsupported retrieval mode before any service setup can happen', () => {
        expect(() => parseCliArgs(['--dataset', 'dataset.jsonl', '--mode', 'bm25'])).toThrow(
            '--mode must be one of: vector, fulltext, hybrid'
        )
    })

    it('applies defaults and keeps multiple modes in their first-seen order', () => {
        expect(parseCliArgs(['--dataset', 'dataset.jsonl', '--mode', 'hybrid', '--mode', 'vector', '--mode', 'hybrid'])).toEqual({
            datasetPath: 'dataset.jsonl',
            modes: ['hybrid', 'vector'],
            topK: 5,
            outputDir: '.tmp/rag-evaluation',
        })
    })

    it('accepts the package-manager argument separator', () => {
        expect(parseCliArgs(['--', '--dataset', 'dataset.jsonl', '--mode', 'vector']).datasetPath).toBe('dataset.jsonl')
    })

    it('routes dataset retrieval through the knowledge base retriever', async () => {
        const results = [
            {
                chunkId: 'chunk-1',
                content: 'content',
                chunkIndex: 0,
                documentId: 'document-1',
                knowledgeBaseId: 'kb-1',
                score: 1,
            },
        ]
        const retrievers = new Map([
            [
                'kb-1',
                {
                    retrieve: async () => results,
                },
            ],
        ])
        const datasetRetriever = createDatasetRetriever(retrievers)

        await expect(
            datasetRetriever.retrieve({
                query: 'query',
                knowledgeBaseIds: ['kb-1'],
                mode: 'vector',
                topK: 5,
            })
        ).resolves.toBe(results)
    })
})
