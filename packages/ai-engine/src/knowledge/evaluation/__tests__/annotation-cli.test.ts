import { mkdtemp, readdir, readFile, rename as renameFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { main as finalizeMain, writeAtomicOutputs } from '../../../../../../apps/workflow/scripts/finalize-rag-annotation'
import {
    type AnnotationCorpusChunk,
    type AnnotationRuntimeDependencies,
    buildAnnotationManifest,
    buildAnnotationReview,
    FIXED_KNOWLEDGE_BASE_ID,
    main,
    parseAnnotationCliArgs,
} from '../../../../../../apps/workflow/scripts/prepare-rag-annotation'
import type { RetrievalMode, RetrievalResult } from '../../types'
import type { AnnotationManifest, AnnotationReview } from '../annotation'
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

function annotationManifest(overrides: Partial<AnnotationManifest> = {}): AnnotationManifest {
    return {
        datasetVersion: 'prometheus-global-guardian-v1',
        knowledgeBaseId: 'kb-1',
        knowledgeBaseName: '知识库',
        documentId: 'document-1',
        documentName: 'document.md',
        documentSha256: 'document-hash',
        chunkCount: 2,
        chunkSize: 500,
        chunkOverlap: 50,
        embeddingProvider: 'ollama',
        embeddingModel: 'mxbai-embed-large:latest',
        embeddingDimensions: 1024,
        queryCount: 1,
        annotationGuideVersion: 'v1',
        annotationStatus: 'candidate',
        annotator: null,
        reviewedAt: null,
        datasetSha256: null,
        ...overrides,
    }
}

function annotationReview(overrides: Partial<AnnotationReview> = {}): AnnotationReview {
    return {
        id: 'query-1',
        query: '灾害风险等级如何判断？',
        intent: 'risk-levels',
        knowledgeBaseId: 'kb-1',
        candidates: [
            {
                chunkId: 'document-1_0',
                content: '高相关内容',
                chunkIndex: 0,
                documentId: 'document-1',
                knowledgeBaseId: 'kb-1',
                candidateSources: { vector: { rank: 1, score: 0.9 } },
                humanRelevance: 3,
                rationale: '直接回答问题。',
            },
            {
                chunkId: 'document-1_1',
                content: '无关内容',
                chunkIndex: 1,
                documentId: 'document-1',
                knowledgeBaseId: 'kb-1',
                candidateSources: {},
                humanRelevance: 0,
                rationale: '',
            },
        ],
        ...overrides,
    }
}

async function readIfPresent(path: string): Promise<string | undefined> {
    try {
        return await readFile(path, 'utf8')
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
            return undefined
        }
        throw error
    }
}

function finalizeArgs(reviewPath: string, manifestPath: string, datasetPath: string): string[] {
    return ['--review', reviewPath, '--manifest', manifestPath, '--dataset', datasetPath, '--annotator', 'project-owner']
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

    it('orchestrates mocked retrieval for all queries and writes valid review and manifest outputs', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'rag-annotation-cli-'))
        const queriesPath = join(tempRoot, 'queries.jsonl')
        const outputPath = join(tempRoot, 'review.jsonl')
        const manifestPath = join(tempRoot, 'manifest.json')
        const corpus = Array.from({ length: 30 }, (_, chunkIndex) => ({
            chunkId: `document-1_${chunkIndex}`,
            content: `完整 chunk ${chunkIndex}`,
            chunkIndex,
            documentId: 'document-1',
            knowledgeBaseId: FIXED_KNOWLEDGE_BASE_ID,
            score: 0,
        }))
        const queryText = Array.from({ length: 24 }, (_, index) =>
            JSON.stringify({
                id: `query-${index + 1}`,
                query: `问题 ${index + 1}`,
                intent: 'risk-levels',
                knowledgeBaseId: FIXED_KNOWLEDGE_BASE_ID,
            })
        ).join('\n')
        const retrieve = vi.fn(async ({ mode, topK }: { mode: RetrievalMode; topK: number }) =>
            corpus.slice(0, topK).map((chunk, index) => ({
                ...chunk,
                score: mode === 'vector' ? 0.9 - index / 100 : mode === 'fulltext' ? 0.8 - index / 100 : 0.7 - index / 100,
            }))
        )
        const listChunks = vi.fn().mockResolvedValue(corpus)
        const createEvaluationPrismaClient = vi.fn()
        const loadKnowledgeBases = vi.fn()
        const createRetrieverMap = vi.fn()
        const createDatasetRetriever = vi.fn()
        const createQdrantVectorStore = vi.fn()
        const client = {
            $disconnect: vi.fn().mockResolvedValue(undefined),
            document: {
                findMany: vi.fn().mockResolvedValue([{ id: 'document-1', name: 'document.md', content: '原始文档内容', chunkCount: 30 }]),
            },
            knowledgeBase: {
                findUnique: vi.fn().mockResolvedValue({
                    id: FIXED_KNOWLEDGE_BASE_ID,
                    name: '知识库',
                    chunkSize: 500,
                    chunkOverlap: 50,
                    embeddingProvider: 'ollama',
                    embeddingModel: 'mxbai-embed-large:latest',
                    dimensions: 1024,
                }),
            },
        }
        const pool = { end: vi.fn().mockResolvedValue(undefined) }

        createEvaluationPrismaClient.mockResolvedValue({ client, pool })
        loadKnowledgeBases.mockResolvedValue([
            {
                id: FIXED_KNOWLEDGE_BASE_ID,
                embeddingModel: 'mxbai-embed-large:latest',
                embeddingProvider: 'ollama',
                dimensions: 1024,
                threshold: 0.2,
                vectorWeight: 0.7,
            },
        ])
        createRetrieverMap.mockReturnValue({ retrievers: new Map([[FIXED_KNOWLEDGE_BASE_ID, {}]]) })
        createDatasetRetriever.mockReturnValue({ retrieve })
        createQdrantVectorStore.mockReturnValue({ listChunks })
        const runtime = {
            parseAnnotationQueries,
            createEvaluationPrismaClient,
            loadKnowledgeBases,
            createRetrieverMap,
            createDatasetRetriever,
            createQdrantVectorStore,
        } satisfies AnnotationRuntimeDependencies

        try {
            await writeFile(queriesPath, `${queryText}\n`, 'utf8')

            await expect(main(['--queries', queriesPath, '--output', outputPath, '--manifest', manifestPath], runtime)).resolves.toBe(0)

            expect(retrieve).toHaveBeenCalledTimes(72)
            for (const mode of ['vector', 'fulltext', 'hybrid'] as const) {
                expect(retrieve.mock.calls.filter(([options]) => options.mode === mode)).toHaveLength(24)
            }
            expect(retrieve.mock.calls.every(([options]) => options.topK === 10)).toBe(true)
            expect(listChunks).toHaveBeenCalledWith([FIXED_KNOWLEDGE_BASE_ID])

            const reviews = (await readFile(outputPath, 'utf8'))
                .trim()
                .split('\n')
                .map(line => JSON.parse(line) as { candidates: Array<{ chunkId: string; humanRelevance: number | null }> })
            expect(reviews).toHaveLength(24)
            for (const review of reviews) {
                expect(review.candidates).toHaveLength(30)
                expect(review.candidates.map(candidate => candidate.chunkId)).toEqual(corpus.map(chunk => chunk.chunkId))
                expect(review.candidates.every(candidate => candidate.humanRelevance === null)).toBe(true)
            }

            const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>
            expect(manifest).toMatchObject({
                knowledgeBaseId: FIXED_KNOWLEDGE_BASE_ID,
                documentId: 'document-1',
                chunkCount: 30,
                queryCount: 24,
                annotationStatus: 'candidate',
                annotator: null,
                datasetSha256: null,
            })
            expect(client.$disconnect).toHaveBeenCalledTimes(1)
            expect(pool.end).toHaveBeenCalledTimes(1)
        } finally {
            await rm(tempRoot, { recursive: true, force: true })
        }
    })
})

describe('finalize-rag-annotation CLI', () => {
    it.each([
        ['--manifest', 'manifest.json', '--dataset', 'dataset.jsonl', '--annotator', 'project-owner'],
        ['--review', 'review.jsonl', '--manifest', 'manifest.json', '--dataset', 'dataset.jsonl'],
        ['--review', 'review.jsonl', '--manifest', 'manifest.json', '--annotator', 'project-owner'],
        ['--review', 'review.jsonl', '--dataset', 'dataset.jsonl', '--annotator', 'project-owner'],
    ])('requires all four input options: %s', async (...argv: string[]) => {
        await expect(finalizeMain(argv)).resolves.toBe(2)
    })

    it('fails with exit code 2 when any human decision is null', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'rag-annotation-finalize-'))
        const reviewPath = join(tempRoot, 'review.jsonl')
        const manifestPath = join(tempRoot, 'manifest.json')
        const datasetPath = join(tempRoot, 'dataset.jsonl')
        const review = annotationReview({
            candidates: annotationReview().candidates.map(candidate => ({ ...candidate, humanRelevance: null, rationale: '' })),
        })

        try {
            await writeFile(reviewPath, `${JSON.stringify(review)}\n`, 'utf8')
            await writeFile(manifestPath, `${JSON.stringify(annotationManifest(), null, 2)}\n`, 'utf8')

            await expect(
                finalizeMain(['--review', reviewPath, '--manifest', manifestPath, '--dataset', datasetPath, '--annotator', 'project-owner'])
            ).resolves.toBe(2)

            await expect(readFile(datasetPath, 'utf8')).rejects.toThrow()
            expect(JSON.parse(await readFile(manifestPath, 'utf8'))).toMatchObject({ annotationStatus: 'candidate' })
        } finally {
            await rm(tempRoot, { recursive: true, force: true })
        }
    })

    it('rejects a non-zero relevance label without rationale and leaves output files unchanged', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'rag-annotation-finalize-'))
        const reviewPath = join(tempRoot, 'review.jsonl')
        const manifestPath = join(tempRoot, 'manifest.json')
        const datasetPath = join(tempRoot, 'dataset.jsonl')
        const manifestText = `${JSON.stringify(annotationManifest(), null, 2)}\n`
        const datasetText = 'old dataset\n'
        const review = annotationReview({
            candidates: annotationReview().candidates.map((candidate, index) =>
                index === 0 ? { ...candidate, rationale: '   ' } : candidate
            ),
        })

        try {
            await writeFile(reviewPath, `${JSON.stringify(review)}\n`, 'utf8')
            await writeFile(manifestPath, manifestText, 'utf8')
            await writeFile(datasetPath, datasetText, 'utf8')

            await expect(finalizeMain(finalizeArgs(reviewPath, manifestPath, datasetPath))).resolves.toBe(2)
            expect(await readFile(datasetPath, 'utf8')).toBe(datasetText)
            expect(await readFile(manifestPath, 'utf8')).toBe(manifestText)
        } finally {
            await rm(tempRoot, { recursive: true, force: true })
        }
    })

    it('rejects a review with only zero relevance labels and leaves output files unchanged', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'rag-annotation-finalize-'))
        const reviewPath = join(tempRoot, 'review.jsonl')
        const manifestPath = join(tempRoot, 'manifest.json')
        const datasetPath = join(tempRoot, 'dataset.jsonl')
        const manifestText = `${JSON.stringify(annotationManifest(), null, 2)}\n`
        const datasetText = 'old dataset\n'
        const review = annotationReview({
            candidates: annotationReview().candidates.map(candidate => ({ ...candidate, humanRelevance: 0, rationale: '' })),
        })

        try {
            await writeFile(reviewPath, `${JSON.stringify(review)}\n`, 'utf8')
            await writeFile(manifestPath, manifestText, 'utf8')
            await writeFile(datasetPath, datasetText, 'utf8')

            await expect(finalizeMain(finalizeArgs(reviewPath, manifestPath, datasetPath))).resolves.toBe(2)
            expect(await readFile(datasetPath, 'utf8')).toBe(datasetText)
            expect(await readFile(manifestPath, 'utf8')).toBe(manifestText)
        } finally {
            await rm(tempRoot, { recursive: true, force: true })
        }
    })

    it('rejects duplicate candidates and leaves output files unchanged', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'rag-annotation-finalize-'))
        const reviewPath = join(tempRoot, 'review.jsonl')
        const manifestPath = join(tempRoot, 'manifest.json')
        const datasetPath = join(tempRoot, 'dataset.jsonl')
        const manifestText = `${JSON.stringify(annotationManifest(), null, 2)}\n`
        const datasetText = 'old dataset\n'
        const review = annotationReview({ candidates: [annotationReview().candidates[0]!] })

        try {
            const duplicateReview = { ...review, candidates: [review.candidates[0], review.candidates[0]] }
            await writeFile(reviewPath, `${JSON.stringify(duplicateReview)}\n`, 'utf8')
            await writeFile(manifestPath, manifestText, 'utf8')
            await writeFile(datasetPath, datasetText, 'utf8')

            await expect(finalizeMain(finalizeArgs(reviewPath, manifestPath, datasetPath))).resolves.toBe(2)
            expect(await readFile(datasetPath, 'utf8')).toBe(datasetText)
            expect(await readFile(manifestPath, 'utf8')).toBe(manifestText)
        } finally {
            await rm(tempRoot, { recursive: true, force: true })
        }
    })

    it('rejects a candidate-level Knowledge Base mismatch and leaves output files unchanged', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'rag-annotation-finalize-'))
        const reviewPath = join(tempRoot, 'review.jsonl')
        const manifestPath = join(tempRoot, 'manifest.json')
        const datasetPath = join(tempRoot, 'dataset.jsonl')
        const manifestText = `${JSON.stringify(annotationManifest(), null, 2)}\n`
        const datasetText = 'old dataset\n'
        const review = annotationReview({
            candidates: annotationReview().candidates.map((candidate, index) =>
                index === 0 ? { ...candidate, knowledgeBaseId: 'other-kb' } : candidate
            ),
        })

        try {
            await writeFile(reviewPath, `${JSON.stringify(review)}\n`, 'utf8')
            await writeFile(manifestPath, manifestText, 'utf8')
            await writeFile(datasetPath, datasetText, 'utf8')

            await expect(finalizeMain(finalizeArgs(reviewPath, manifestPath, datasetPath))).resolves.toBe(2)
            expect(await readFile(datasetPath, 'utf8')).toBe(datasetText)
            expect(await readFile(manifestPath, 'utf8')).toBe(manifestText)
        } finally {
            await rm(tempRoot, { recursive: true, force: true })
        }
    })

    it('writes multiple JSONL samples with a stable dataset hash', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'rag-annotation-finalize-'))
        const reviewPath = join(tempRoot, 'review.jsonl')
        const manifestPath = join(tempRoot, 'manifest.json')
        const datasetPath = join(tempRoot, 'dataset.jsonl')
        const reviews = [annotationReview(), annotationReview({ id: 'query-2', query: '另一个问题' })]
        const reviewText = `${reviews.map(review => JSON.stringify(review)).join('\n')}\n`

        try {
            await writeFile(reviewPath, reviewText, 'utf8')
            await writeFile(manifestPath, `${JSON.stringify(annotationManifest({ queryCount: 2 }), null, 2)}\n`, 'utf8')

            await expect(
                finalizeMain([...finalizeArgs(reviewPath, manifestPath, datasetPath), '--reviewed-at', '2026-09-29T12:00:00.000Z'])
            ).resolves.toBe(0)

            const datasetText = await readFile(datasetPath, 'utf8')
            expect(datasetText).toContain('"relevance":3')
            expect(datasetText).not.toContain('"relevance":0')
            expect(datasetText.trim().split('\n')).toHaveLength(2)
            expect(
                datasetText
                    .trim()
                    .split('\n')
                    .map(line => JSON.parse(line))
            ).toEqual([
                {
                    id: 'query-1',
                    query: '灾害风险等级如何判断？',
                    knowledgeBaseId: 'kb-1',
                    relevantChunks: [{ chunkId: 'document-1_0', relevance: 3 }],
                },
                {
                    id: 'query-2',
                    query: '另一个问题',
                    knowledgeBaseId: 'kb-1',
                    relevantChunks: [{ chunkId: 'document-1_0', relevance: 3 }],
                },
            ])

            const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as AnnotationManifest
            expect(manifest).toMatchObject({
                annotationStatus: 'human-reviewed',
                annotator: 'project-owner',
                reviewedAt: '2026-09-29T12:00:00.000Z',
                datasetSha256: 'b78ca1b9b87d8b49426ce381e5494998c00907ab1adcff4bd77fc4748db2d8a7',
            })
            expect(await readFile(reviewPath, 'utf8')).toBe(reviewText)
        } finally {
            await rm(tempRoot, { recursive: true, force: true })
        }
    })

    it('fails with exit code 2 when the review Knowledge Base differs from the manifest', async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'rag-annotation-finalize-'))
        const reviewPath = join(tempRoot, 'review.jsonl')
        const manifestPath = join(tempRoot, 'manifest.json')
        const datasetPath = join(tempRoot, 'dataset.jsonl')

        try {
            await writeFile(reviewPath, `${JSON.stringify(annotationReview())}\n`, 'utf8')
            await writeFile(manifestPath, `${JSON.stringify(annotationManifest({ knowledgeBaseId: 'other-kb' }), null, 2)}\n`, 'utf8')

            await expect(
                finalizeMain(['--review', reviewPath, '--manifest', manifestPath, '--dataset', datasetPath, '--annotator', 'project-owner'])
            ).resolves.toBe(2)
            await expect(readFile(datasetPath, 'utf8')).rejects.toThrow()
        } finally {
            await rm(tempRoot, { recursive: true, force: true })
        }
    })

    it.each([
        ['no old outputs', false, false],
        ['only old dataset', true, false],
        ['only old manifest', false, true],
    ])('rolls back both outputs when manifest publish fails: %s', async (_, hasDataset, hasManifest) => {
        const tempRoot = await mkdtemp(join(tmpdir(), 'rag-annotation-rollback-'))
        const datasetPath = join(tempRoot, 'dataset.jsonl')
        const manifestPath = join(tempRoot, 'manifest.json')
        const oldDatasetText = 'old dataset\n'
        const oldManifestText = 'old manifest\n'
        const failingRename = async (
            source: Parameters<typeof renameFile>[0],
            destination: Parameters<typeof renameFile>[1]
        ): Promise<void> => {
            if (source.toString().endsWith('.tmp') && destination.toString() === manifestPath) {
                throw new Error('simulated manifest publish failure')
            }
            await renameFile(source, destination)
        }

        try {
            if (hasDataset) {
                await writeFile(datasetPath, oldDatasetText, 'utf8')
            }
            if (hasManifest) {
                await writeFile(manifestPath, oldManifestText, 'utf8')
            }

            await expect(writeAtomicOutputs(datasetPath, 'new dataset\n', manifestPath, 'new manifest\n', failingRename)).rejects.toThrow(
                'simulated manifest publish failure'
            )
            expect(await readIfPresent(datasetPath)).toBe(hasDataset ? oldDatasetText : undefined)
            expect(await readIfPresent(manifestPath)).toBe(hasManifest ? oldManifestText : undefined)
            expect((await readdir(tempRoot)).filter(name => name.endsWith('.tmp') || name.endsWith('.bak'))).toEqual([])
        } finally {
            await rm(tempRoot, { recursive: true, force: true })
        }
    })
})
