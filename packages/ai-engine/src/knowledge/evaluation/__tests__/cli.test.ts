import { describe, expect, it } from 'vitest'

import { parseCliArgs } from '../../../../../../apps/workflow/scripts/evaluate-rag'

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
})
