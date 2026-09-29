// cspell:ignore cmtjxa dyygofy skckk

import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import type {
    AnnotationManifest,
    AnnotationQuery,
    AnnotationReview,
    CandidateSource,
    RetrievalMode,
    RetrievalResult,
    VectorSearchResult,
} from '@ai-workflow/ai-engine'
import { createQdrantVectorStore, parseAnnotationQueries } from '@ai-workflow/ai-engine'

import type { PrismaClient } from '../app/generated/prisma/client'
import {
    CliConfigError,
    createDatasetRetriever,
    createEvaluationPrismaClient,
    createRetrieverMap,
    loadKnowledgeBases,
} from './rag-evaluation-runtime'

const execFileAsync = promisify(execFile)

export const FIXED_KNOWLEDGE_BASE_ID = 'cmtjxa48x000dyygofy7skckk'
export const EXPECTED_QUERY_COUNT = 24
export const EXPECTED_CHUNK_COUNT = 30
export const DATASET_VERSION = 'prometheus-global-guardian-v1'
export const ANNOTATION_GUIDE_VERSION = 'v1'
export const RETRIEVAL_MODES = ['vector', 'fulltext', 'hybrid'] as const satisfies readonly RetrievalMode[]

export interface AnnotationCliOptions {
    queriesPath: string
    outputPath: string
    manifestPath: string
    topK: number
}

export interface AnnotationCorpusChunk {
    chunkId: string
    content: string
    chunkIndex: number
    documentId: string
    knowledgeBaseId: string
}

export interface AnnotationKnowledgeBaseSnapshot {
    id: string
    name: string
    chunkSize: number
    chunkOverlap: number
    embeddingProvider: string
    embeddingModel: string
    dimensions: number
}

export interface AnnotationDocumentSnapshot {
    id: string
    name: string
    content: string
}

export type RetrievalResultsByMode = Record<RetrievalMode, readonly RetrievalResult[]>

const HELP_TEXT = `Usage:
  pnpm --filter @ai-workflow/workflow prepare:rag-annotation -- \\
    --queries docs/rag/evaluation/prometheus-global-guardian-v1.queries.jsonl \\
    --output docs/rag/evaluation/prometheus-global-guardian-v1.review.jsonl \\
    --manifest docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json \\
    --top-k 10

Options:
  --queries <path>   Query catalog JSONL (required)
  --output <path>    Candidate review JSONL (required)
  --manifest <path>  Candidate manifest JSON (required)
  --top-k <integer>  Candidates per retrieval mode (default: 10)
  --help             Show this help
`

const splitOption = (token: string): { name: string; inlineValue?: string } => {
    const separator = token.indexOf('=')
    if (separator < 0) {
        return { name: token }
    }

    return { name: token.slice(0, separator), inlineValue: token.slice(separator + 1) }
}

function requireOptionValue(argv: readonly string[], index: number, name: string): string {
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
        throw new CliConfigError(`${name} requires a value`)
    }

    return value
}

function readOptionValue(argv: readonly string[], index: number, name: string, inlineValue?: string): { value: string; nextIndex: number } {
    if (inlineValue !== undefined) {
        if (inlineValue.length === 0) {
            throw new CliConfigError(`${name} requires a value`)
        }
        return { value: inlineValue, nextIndex: index }
    }

    return { value: requireOptionValue(argv, index, name), nextIndex: index + 1 }
}

function parsePositiveInteger(value: string, option: string): number {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new CliConfigError(`${option} must be a positive integer`)
    }

    return parsed
}

export function parseAnnotationCliArgs(argv: readonly string[]): AnnotationCliOptions {
    let queriesPath: string | undefined
    let outputPath: string | undefined
    let manifestPath: string | undefined
    let topK = 10
    const seenOptions = new Set<string>()

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index]
        if (!token) {
            continue
        }
        if (token === '--') {
            continue
        }

        const { name, inlineValue } = splitOption(token)
        if (!name.startsWith('--')) {
            throw new CliConfigError(`unexpected argument: ${name}`)
        }
        if (name === '--help') {
            throw new CliConfigError('use --help as a standalone option')
        }
        if (seenOptions.has(name)) {
            throw new CliConfigError(`${name} must not be repeated`)
        }
        seenOptions.add(name)

        if (name === '--queries') {
            const option = readOptionValue(argv, index, name, inlineValue)
            queriesPath = option.value
            index = option.nextIndex
        } else if (name === '--output') {
            const option = readOptionValue(argv, index, name, inlineValue)
            outputPath = option.value
            index = option.nextIndex
        } else if (name === '--manifest') {
            const option = readOptionValue(argv, index, name, inlineValue)
            manifestPath = option.value
            index = option.nextIndex
        } else if (name === '--top-k') {
            const option = readOptionValue(argv, index, name, inlineValue)
            topK = parsePositiveInteger(option.value, name)
            index = option.nextIndex
        } else {
            throw new CliConfigError(`unknown option: ${name}`)
        }
    }

    if (!queriesPath) {
        throw new CliConfigError('--queries is required')
    }
    if (!outputPath) {
        throw new CliConfigError('--output is required')
    }
    if (!manifestPath) {
        throw new CliConfigError('--manifest is required')
    }
    if (outputPath === manifestPath) {
        throw new CliConfigError('--output and --manifest must be different paths')
    }

    return { queriesPath, outputPath, manifestPath, topK }
}

function isValidCorpusChunk(chunk: VectorSearchResult): boolean {
    return (
        chunk.chunkId.trim().length > 0 &&
        chunk.content.length > 0 &&
        Number.isInteger(chunk.chunkIndex) &&
        chunk.chunkIndex >= 0 &&
        chunk.documentId.trim().length > 0 &&
        chunk.knowledgeBaseId.trim().length > 0
    )
}

function sortCorpus(corpus: readonly AnnotationCorpusChunk[]): AnnotationCorpusChunk[] {
    return [...corpus].sort((left, right) => left.chunkIndex - right.chunkIndex || left.chunkId.localeCompare(right.chunkId))
}

function sourceForResult(result: RetrievalResult, rank: number): CandidateSource {
    return { rank, score: result.score }
}

export function buildAnnotationReview(
    query: AnnotationQuery,
    corpus: readonly AnnotationCorpusChunk[],
    retrievals: RetrievalResultsByMode
): AnnotationReview {
    const corpusById = new Map(corpus.map(chunk => [chunk.chunkId, chunk]))
    const sourcesByChunk = new Map<string, Partial<Record<RetrievalMode, CandidateSource>>>()

    for (const mode of RETRIEVAL_MODES) {
        for (const [index, result] of retrievals[mode].entries()) {
            if (!corpusById.has(result.chunkId)) {
                continue
            }

            const sources = sourcesByChunk.get(result.chunkId) ?? {}
            if (sources[mode] === undefined) {
                sources[mode] = sourceForResult(result, index + 1)
            }
            sourcesByChunk.set(result.chunkId, sources)
        }
    }

    return {
        id: query.id,
        query: query.query,
        intent: query.intent,
        knowledgeBaseId: query.knowledgeBaseId,
        candidates: sortCorpus(corpus).map(chunk => ({
            ...chunk,
            candidateSources: sourcesByChunk.get(chunk.chunkId) ?? {},
            humanRelevance: null,
            rationale: '',
        })),
    }
}

export function buildAnnotationManifest(input: {
    knowledgeBase: AnnotationKnowledgeBaseSnapshot
    document: AnnotationDocumentSnapshot
    chunkCount: number
    queryCount: number
}): AnnotationManifest {
    const documentSha256 = createHash('sha256').update(input.document.content, 'utf8').digest('hex')

    return {
        datasetVersion: DATASET_VERSION,
        knowledgeBaseId: input.knowledgeBase.id,
        knowledgeBaseName: input.knowledgeBase.name,
        documentId: input.document.id,
        documentName: input.document.name,
        documentSha256,
        chunkCount: input.chunkCount,
        chunkSize: input.knowledgeBase.chunkSize,
        chunkOverlap: input.knowledgeBase.chunkOverlap,
        embeddingProvider: input.knowledgeBase.embeddingProvider,
        embeddingModel: input.knowledgeBase.embeddingModel,
        embeddingDimensions: input.knowledgeBase.dimensions,
        queryCount: input.queryCount,
        annotationGuideVersion: ANNOTATION_GUIDE_VERSION,
        annotationStatus: 'candidate',
        annotator: null,
        reviewedAt: null,
        datasetSha256: null,
    }
}

function errorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error)
    let redacted = message
    for (const value of Object.values(process.env)) {
        if (!value) {
            continue
        }
        redacted = redacted.split(value).join('[redacted]')
    }
    return redacted
}

async function getWorkspaceRoot(): Promise<string> {
    try {
        const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd() })
        return stdout.trim() || process.cwd()
    } catch {
        return process.cwd()
    }
}

function resolveWorkspacePath(inputPath: string, workspaceRoot: string): string {
    return isAbsolute(inputPath) ? inputPath : resolve(workspaceRoot, inputPath)
}

function validateQueries(queries: readonly AnnotationQuery[]): void {
    if (queries.length !== EXPECTED_QUERY_COUNT) {
        throw new CliConfigError(`expected ${EXPECTED_QUERY_COUNT} annotation queries, found ${queries.length}`)
    }
    const invalidKnowledgeBase = queries.find(query => query.knowledgeBaseId !== FIXED_KNOWLEDGE_BASE_ID)
    if (invalidKnowledgeBase) {
        throw new CliConfigError(`query ${invalidKnowledgeBase.id} does not target the fixed Knowledge Base`)
    }
}

async function loadSnapshot(client: PrismaClient): Promise<{
    knowledgeBase: AnnotationKnowledgeBaseSnapshot
    document: AnnotationDocumentSnapshot & { chunkCount: number }
}> {
    const knowledgeBase = await client.knowledgeBase.findUnique({
        where: { id: FIXED_KNOWLEDGE_BASE_ID },
        select: {
            id: true,
            name: true,
            chunkSize: true,
            chunkOverlap: true,
            embeddingProvider: true,
            embeddingModel: true,
            dimensions: true,
        },
    })
    if (!knowledgeBase) {
        throw new CliConfigError(`Knowledge Base not found: ${FIXED_KNOWLEDGE_BASE_ID}`)
    }

    const documents = await client.document.findMany({
        where: { knowledgeBaseId: FIXED_KNOWLEDGE_BASE_ID, status: 'COMPLETED' },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, content: true, chunkCount: true },
    })
    if (documents.length !== 1) {
        throw new CliConfigError(`expected exactly one completed document, found ${documents.length}`)
    }

    const document = documents[0]
    if (!document || typeof document.content !== 'string') {
        throw new CliConfigError('completed document content is empty')
    }

    return {
        knowledgeBase,
        document: {
            id: document.id,
            name: document.name,
            content: document.content,
            chunkCount: document.chunkCount,
        },
    }
}

function validateCorpus(corpus: readonly VectorSearchResult[], documentId: string): AnnotationCorpusChunk[] {
    if (corpus.length !== EXPECTED_CHUNK_COUNT) {
        throw new CliConfigError(`expected ${EXPECTED_CHUNK_COUNT} Qdrant chunks, found ${corpus.length}`)
    }

    const chunkIds = new Set<string>()
    const normalized: AnnotationCorpusChunk[] = []
    for (const chunk of corpus) {
        if (!isValidCorpusChunk(chunk)) {
            throw new CliConfigError('Qdrant corpus contains a malformed chunk')
        }
        if (chunkIds.has(chunk.chunkId)) {
            throw new CliConfigError(`Qdrant corpus contains duplicate chunk ID ${chunk.chunkId}`)
        }
        if (chunk.documentId !== documentId || chunk.knowledgeBaseId !== FIXED_KNOWLEDGE_BASE_ID) {
            throw new CliConfigError(`Qdrant corpus chunk ${chunk.chunkId} does not match the recorded document snapshot`)
        }

        chunkIds.add(chunk.chunkId)
        normalized.push({
            chunkId: chunk.chunkId,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            documentId: chunk.documentId,
            knowledgeBaseId: chunk.knowledgeBaseId,
        })
    }

    return normalized
}

async function writeAtomicOutputs(
    outputPath: string,
    manifestPath: string,
    reviews: readonly AnnotationReview[],
    manifest: AnnotationManifest
): Promise<void> {
    await mkdir(dirname(outputPath), { recursive: true })
    await mkdir(dirname(manifestPath), { recursive: true })

    const outputTempPath = `${outputPath}.${randomUUID()}.tmp`
    const manifestTempPath = `${manifestPath}.${randomUUID()}.tmp`
    try {
        await writeFile(outputTempPath, `${reviews.map(review => JSON.stringify(review)).join('\n')}\n`, 'utf8')
        await writeFile(manifestTempPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
        await rename(outputTempPath, outputPath)
        await rename(manifestTempPath, manifestPath)
    } finally {
        await unlink(outputTempPath).catch(() => undefined)
        await unlink(manifestTempPath).catch(() => undefined)
    }
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
    if (argv.includes('--help')) {
        process.stdout.write(HELP_TEXT)
        return 0
    }

    let options: AnnotationCliOptions
    try {
        options = parseAnnotationCliArgs(argv)
    } catch (error) {
        process.stderr.write(`[prepare:rag-annotation] ${errorMessage(error)}\n`)
        return 2
    }

    let evaluationDatabase: Awaited<ReturnType<typeof createEvaluationPrismaClient>> | undefined
    try {
        const workspaceRoot = await getWorkspaceRoot()
        const queriesPath = resolveWorkspacePath(options.queriesPath, workspaceRoot)
        let queryText: string
        try {
            queryText = await readFile(queriesPath, 'utf8')
        } catch (error) {
            throw new CliConfigError(`Failed to read queries ${queriesPath}: ${errorMessage(error)}`)
        }

        let queries: AnnotationQuery[]
        try {
            queries = parseAnnotationQueries(queryText)
        } catch (error) {
            throw new CliConfigError(`Invalid annotation queries ${queriesPath}: ${errorMessage(error)}`)
        }
        validateQueries(queries)

        evaluationDatabase = await createEvaluationPrismaClient()
        const { client } = evaluationDatabase
        const knowledgeBases = await loadKnowledgeBases(client, [FIXED_KNOWLEDGE_BASE_ID])
        const knowledgeBase = knowledgeBases[0]
        if (!knowledgeBase) {
            throw new CliConfigError(`Knowledge Base not found: ${FIXED_KNOWLEDGE_BASE_ID}`)
        }
        const snapshot = await loadSnapshot(client)
        if (snapshot.document.chunkCount !== EXPECTED_CHUNK_COUNT) {
            throw new CliConfigError(
                `expected the completed document to record ${EXPECTED_CHUNK_COUNT} chunks, found ${snapshot.document.chunkCount}`
            )
        }
        const { retrievers } = createRetrieverMap(knowledgeBases)
        const datasetRetriever = createDatasetRetriever(retrievers)
        const qdrantUrl = process.env.QDRANT_URL?.trim() || 'http://localhost:6333'
        const vectorStore = createQdrantVectorStore({ url: qdrantUrl, collectionName: 'knowledge_chunks' })
        const corpus = validateCorpus(await vectorStore.listChunks([FIXED_KNOWLEDGE_BASE_ID]), snapshot.document.id)

        const reviews: AnnotationReview[] = []
        for (const query of queries) {
            const retrievals: RetrievalResultsByMode = { vector: [], fulltext: [], hybrid: [] }
            for (const mode of RETRIEVAL_MODES) {
                retrievals[mode] = await datasetRetriever.retrieve({
                    query: query.query,
                    knowledgeBaseIds: [FIXED_KNOWLEDGE_BASE_ID],
                    mode,
                    topK: options.topK,
                    threshold: knowledgeBase.threshold,
                    vectorWeight: knowledgeBase.vectorWeight,
                })
            }
            reviews.push(buildAnnotationReview(query, corpus, retrievals))
        }

        const manifest = buildAnnotationManifest({
            knowledgeBase: snapshot.knowledgeBase,
            document: snapshot.document,
            chunkCount: corpus.length,
            queryCount: queries.length,
        })
        const outputPath = resolveWorkspacePath(options.outputPath, workspaceRoot)
        const manifestPath = resolveWorkspacePath(options.manifestPath, workspaceRoot)
        try {
            await writeAtomicOutputs(outputPath, manifestPath, reviews, manifest)
        } catch (error) {
            throw new CliConfigError(`Failed to write annotation outputs: ${errorMessage(error)}`)
        }

        process.stdout.write(`[prepare:rag-annotation] wrote ${outputPath}\n`)
        process.stdout.write(`[prepare:rag-annotation] wrote ${manifestPath}\n`)
        return 0
    } catch (error) {
        const exitCode = error instanceof CliConfigError ? error.exitCode : 1
        process.stderr.write(`[prepare:rag-annotation] ${errorMessage(error)}\n`)
        return exitCode
    } finally {
        if (evaluationDatabase) {
            await evaluationDatabase.client.$disconnect().catch(error => {
                process.stderr.write(`[prepare:rag-annotation] failed to disconnect Prisma: ${errorMessage(error)}\n`)
            })
            await evaluationDatabase.pool.end().catch(error => {
                process.stderr.write(`[prepare:rag-annotation] failed to close PostgreSQL pool: ${errorMessage(error)}\n`)
            })
        }
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main().then(exitCode => {
        process.exitCode = exitCode
    })
}
