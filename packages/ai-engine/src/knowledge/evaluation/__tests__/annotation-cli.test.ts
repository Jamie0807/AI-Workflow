import { describe, expect, it, vi } from 'vitest'

import {
    type AnnotationCorpusChunk,
    buildAnnotationManifest,
    buildAnnotationReview,
    main,
    parseAnnotationCliArgs,
} from '../../../../../../apps/workflow/scripts/prepare-rag-annotation'
import type { RetrievalMode, RetrievalResult } from '../../types'
import { parseAnnotationQueries } from '../annotation'

const QUERY_PATH = 'docs/rag/evaluation/prometheus-global-guardian-v1.queries.jsonl'
const OUTPUT_PATH = 'docs/rag/evaluation/prometheus-global-guardian-v1.review.jsonl'
const MANIFEST_PATH = 'docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json'

function corpusChunk(overrides: Partial<AnnotationCorpusChunk> = {}): AnnotationCorpusChunk {
    return {
        chunkId: 'document-1_0',
        content: '完整的知识库 chunk 内容',
        chunkIndex: 0,
        documentId: 'document-1',
        knowledgeBaseId: 'kb-1',
        ...overrides,
    }
}

function retrievalResult(overrides: Partial<RetrievalResult> = {}): RetrievalResult {
    return {
        chunkId: 'document-1_0',
        content: '检索结果内容',
        chunkIndex: 0,
        documentId: 'document-1',
        knowledgeBaseId: 'kb-1',
        score: 0.8,
        ...overrides,
    }
}

describe('prepare-rag-annotation CLI', () => {
    it('uses the documented default top-k and paths', () => {
        expect(parseAnnotationCliArgs(['--queries', QUERY_PATH, '--output', OUTPUT_PATH, '--manifest', MANIFEST_PATH])).toEqual({
            queriesPath: QUERY_PATH,
            outputPath: OUTPUT_PATH,
            manifestPath: MANIFEST_PATH,
            topK: 10,
        })
    })

    it.each([
        ['--queries', '--output', OUTPUT_PATH, '--manifest', MANIFEST_PATH],
        ['--queries', QUERY_PATH, '--output', '--manifest', MANIFEST_PATH],
        ['--queries', QUERY_PATH, '--output', OUTPUT_PATH, '--manifest'],
    ])('rejects missing required option values: %s', (...argv: string[]) => {
        expect(() => parseAnnotationCliArgs(argv)).toThrow()
    })

    it.each(['0', '-1', '1.5', 'not-a-number'])('rejects a non-positive or non-integer top-k: %s', topK => {
        expect(() =>
            parseAnnotationCliArgs(['--queries', QUERY_PATH, '--output', OUTPUT_PATH, '--manifest', MANIFEST_PATH, '--top-k', topK])
        ).toThrow('--top-k must be a positive integer')
    })

    it('rejects duplicate query IDs before candidate generation', () => {
        const query = JSON.stringify({ id: 'duplicate', query: '问题', intent: 'intent', knowledgeBaseId: 'kb-1' })

        expect(() => parseAnnotationQueries(`${query}\n${query}`)).toThrow('duplicate query ID duplicate on line 2')
    })

    it('returns exit code 2 for CLI configuration errors without starting services', async () => {
        const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

        await expect(main([])).resolves.toBe(2)

        expect(stderr).toHaveBeenCalledWith(expect.stringContaining('[prepare:rag-annotation]'))
        stderr.mockRestore()
    })

    it('accepts the pnpm script argument separator before help', async () => {
        const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

        await expect(main(['--', '--help'])).resolves.toBe(0)

        expect(stdout).toHaveBeenCalledWith(expect.stringContaining('prepare:rag-annotation'))
        stdout.mockRestore()
    })

    it('writes every corpus chunk once and records only retrieval source rank and score', () => {
        const query = {
            id: 'query-1',
            query: '灾害风险等级如何判断？',
            intent: 'risk-levels',
            knowledgeBaseId: 'kb-1',
        }
        const corpus = [
            corpusChunk({ chunkId: 'document-1_1', chunkIndex: 1, content: '第二段' }),
            corpusChunk({ chunkId: 'document-1_0', chunkIndex: 0, content: '第一段' }),
        ]
        const retrievals: Record<RetrievalMode, RetrievalResult[]> = {
            vector: [retrievalResult({ chunkId: 'document-1_1', score: 0.91 }), retrievalResult({ chunkId: 'missing', score: 0.99 })],
            fulltext: [retrievalResult({ chunkId: 'document-1_0', score: 1 })],
            hybrid: [retrievalResult({ chunkId: 'document-1_1', score: 0.12 })],
        }

        expect(buildAnnotationReview(query, corpus, retrievals)).toEqual({
            id: 'query-1',
            query: '灾害风险等级如何判断？',
            intent: 'risk-levels',
            knowledgeBaseId: 'kb-1',
            candidates: [
                {
                    chunkId: 'document-1_0',
                    content: '第一段',
                    chunkIndex: 0,
                    documentId: 'document-1',
                    knowledgeBaseId: 'kb-1',
                    candidateSources: { fulltext: { rank: 1, score: 1 } },
                    humanRelevance: null,
                    rationale: '',
                },
                {
                    chunkId: 'document-1_1',
                    content: '第二段',
                    chunkIndex: 1,
                    documentId: 'document-1',
                    knowledgeBaseId: 'kb-1',
                    candidateSources: {
                        vector: { rank: 1, score: 0.91 },
                        hybrid: { rank: 1, score: 0.12 },
                    },
                    humanRelevance: null,
                    rationale: '',
                },
            ],
        })
    })

    it('builds a candidate manifest with a document snapshot and no dataset hash', () => {
        const manifest = buildAnnotationManifest({
            knowledgeBase: {
                id: 'kb-1',
                name: '知识库',
                chunkSize: 500,
                chunkOverlap: 50,
                embeddingProvider: 'ollama',
                embeddingModel: 'mxbai-embed-large:latest',
                dimensions: 1024,
            },
            document: { id: 'document-1', name: 'document.md', content: '文档内容' },
            chunkCount: 30,
            queryCount: 24,
        })

        expect(manifest).toMatchObject({
            datasetVersion: 'prometheus-global-guardian-v1',
            knowledgeBaseId: 'kb-1',
            documentId: 'document-1',
            documentSha256: 'e6bdf9a1bd91b2e4f2ca1f81a9c4ca272fe6d37216a3ae030f455de197233282',
            chunkCount: 30,
            queryCount: 24,
            annotationGuideVersion: 'v1',
            annotationStatus: 'candidate',
            annotator: null,
            reviewedAt: null,
            datasetSha256: null,
        })
    })
})
