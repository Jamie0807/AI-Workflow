import { execFile } from 'node:child_process'
// cspell:ignore ndcg
import { createHash } from 'node:crypto'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import type { BaselineComparison, EvaluationMetadata, EvaluationReport, RetrievalMode, RetrieverService } from '@ai-workflow/ai-engine'
import {
    compareWithBaseline,
    createHybridRetriever,
    createOllamaEmbeddingService,
    createQdrantFulltextProvider,
    createQdrantVectorStore,
    evaluateRetrievalDataset,
    parseEvaluationDataset,
    validateEvaluationReport,
} from '@ai-workflow/ai-engine'

const execFileAsync = promisify(execFile)

export const RETRIEVAL_MODES = ['vector', 'fulltext', 'hybrid'] as const satisfies readonly RetrievalMode[]

export interface CliOptions {
    datasetPath: string
    modes: RetrievalMode[]
    baselinePath?: string
    threshold?: number
    vectorWeight?: number
    topK: number
    outputDir: string
}

export class CliConfigError extends Error {
    readonly exitCode = 2

    constructor(message: string) {
        super(message)
        this.name = 'CliConfigError'
    }
}

interface KnowledgeBaseConfig {
    id: string
    embeddingModel: string
    embeddingProvider: string
    dimensions: number
    threshold: number
    vectorWeight: number
}

interface EmbeddingConfigReport {
    knowledgeBaseId: string
    provider: string
    model: string
    dimensions: number
    baseUrl: string
}

type CliReportMetadata = Extract<EvaluationMetadata, { hashStatus: 'computed' }> & {
    gitRevision: string
    embedding: EmbeddingConfigReport[]
    qdrant: {
        url: string
        collectionName: string
    }
}

type CliEvaluationReport = Omit<EvaluationReport, 'metadata'> & {
    metadata: CliReportMetadata
    baselineComparison?: BaselineComparison
}

interface ReportEnvelope {
    generatedAt: string
    dataset: {
        path: string
        sha256: string
        sampleCount: number
    }
    reports: CliEvaluationReport[]
}

function isRetrievalMode(value: string): value is RetrievalMode {
    return RETRIEVAL_MODES.includes(value as RetrievalMode)
}

function requireValue(argv: readonly string[], index: number, option: string): string {
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
        throw new CliConfigError(`${option} requires a value`)
    }

    return value
}

function parseBoundedNumber(value: string, option: string): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
        throw new CliConfigError(`${option} must be a number between 0 and 1`)
    }

    return parsed
}

function parsePositiveInteger(value: string, option: string): number {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new CliConfigError(`${option} must be a positive integer`)
    }

    return parsed
}

function splitOption(token: string): { name: string; inlineValue?: string } {
    const separator = token.indexOf('=')
    if (separator < 0) {
        return { name: token }
    }

    return { name: token.slice(0, separator), inlineValue: token.slice(separator + 1) }
}

function readOptionValue(argv: readonly string[], index: number, name: string, inlineValue?: string): { value: string; nextIndex: number } {
    if (inlineValue !== undefined) {
        if (inlineValue.length === 0) {
            throw new CliConfigError(`${name} requires a value`)
        }
        return { value: inlineValue, nextIndex: index }
    }

    return { value: requireValue(argv, index, name), nextIndex: index + 1 }
}

export function parseCliArgs(argv: readonly string[]): CliOptions {
    let datasetPath: string | undefined
    let baselinePath: string | undefined
    let threshold: number | undefined
    let vectorWeight: number | undefined
    let topK = 5
    let outputDir = '.tmp/rag-evaluation'
    const modes: RetrievalMode[] = []

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

        if (name === '--dataset') {
            const option = readOptionValue(argv, index, name, inlineValue)
            datasetPath = option.value
            index = option.nextIndex
        } else if (name === '--mode') {
            const option = readOptionValue(argv, index, name, inlineValue)
            if (!isRetrievalMode(option.value)) {
                throw new CliConfigError('--mode must be one of: vector, fulltext, hybrid')
            }
            if (!modes.includes(option.value)) {
                modes.push(option.value)
            }
            index = option.nextIndex
        } else if (name === '--baseline') {
            const option = readOptionValue(argv, index, name, inlineValue)
            baselinePath = option.value
            index = option.nextIndex
        } else if (name === '--threshold') {
            const option = readOptionValue(argv, index, name, inlineValue)
            threshold = parseBoundedNumber(option.value, name)
            index = option.nextIndex
        } else if (name === '--vector-weight') {
            const option = readOptionValue(argv, index, name, inlineValue)
            vectorWeight = parseBoundedNumber(option.value, name)
            index = option.nextIndex
        } else if (name === '--top-k') {
            const option = readOptionValue(argv, index, name, inlineValue)
            topK = parsePositiveInteger(option.value, name)
            index = option.nextIndex
        } else if (name === '--output-dir') {
            const option = readOptionValue(argv, index, name, inlineValue)
            outputDir = option.value
            index = option.nextIndex
        } else {
            throw new CliConfigError(`unknown option: ${name}`)
        }
    }

    if (!datasetPath) {
        throw new CliConfigError('--dataset is required')
    }
    if (modes.length === 0) {
        throw new CliConfigError('--mode is required and may be repeated')
    }

    return {
        datasetPath,
        modes,
        ...(baselinePath === undefined ? {} : { baselinePath }),
        ...(threshold === undefined ? {} : { threshold }),
        ...(vectorWeight === undefined ? {} : { vectorWeight }),
        topK,
        outputDir,
    }
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function resolveExistingPath(inputPath: string, workspaceRoot: string): Promise<string> {
    if (isAbsolute(inputPath)) {
        return inputPath
    }

    const candidates = [resolve(process.cwd(), inputPath), resolve(workspaceRoot, inputPath)]
    for (const candidate of candidates) {
        try {
            await access(candidate)
            return candidate
        } catch {
            // Try the next candidate so commands work from either the repository root or apps/workflow.
        }
    }

    return candidates[0] ?? resolve(workspaceRoot, inputPath)
}

async function getGitContext(): Promise<{ workspaceRoot: string; revision: string }> {
    try {
        const { stdout: rootOutput } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd() })
        const { stdout: revisionOutput } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd() })
        return {
            workspaceRoot: rootOutput.trim(),
            revision: revisionOutput.trim(),
        }
    } catch {
        return { workspaceRoot: process.cwd(), revision: 'unknown' }
    }
}

async function createEvaluationPrismaClient() {
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const { Pool } = await import('pg')
    const { PrismaClient } = await import('../app/generated/prisma/client')
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:xiaoer@localhost:5433/postgres'
    const pool = new Pool({ connectionString })

    try {
        const adapter = new PrismaPg(pool)
        const client = new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        })

        return { client, pool }
    } catch (error) {
        await pool.end().catch(() => undefined)
        throw error
    }
}

function getSingleValue<T>(values: readonly T[], label: string): T {
    const first = values[0]
    if (first === undefined || values.some(value => value !== first)) {
        throw new CliConfigError(`${label} differs between knowledge bases; provide an explicit CLI override`)
    }

    return first
}

function createRetrieverMap(knowledgeBases: readonly KnowledgeBaseConfig[]): {
    retrievers: Map<string, RetrieverService>
    embeddings: EmbeddingConfigReport[]
} {
    const retrievers = new Map<string, RetrieverService>()
    const embeddings: EmbeddingConfigReport[] = []
    const baseUrl = process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434'
    const qdrantUrl = process.env.QDRANT_URL?.trim() || 'http://localhost:6333'

    for (const knowledgeBase of knowledgeBases) {
        if (knowledgeBase.embeddingProvider.toLowerCase() !== 'ollama') {
            throw new CliConfigError(
                `Unsupported embedding provider for Knowledge Base ${knowledgeBase.id}: ${knowledgeBase.embeddingProvider}`
            )
        }

        const embeddingService = createOllamaEmbeddingService({
            model: knowledgeBase.embeddingModel,
            dimensions: knowledgeBase.dimensions,
            baseUrl,
        })
        const vectorStore = createQdrantVectorStore({
            url: qdrantUrl,
            collectionName: 'knowledge_chunks',
        })
        const fulltextProvider = createQdrantFulltextProvider(vectorStore)
        retrievers.set(knowledgeBase.id, createHybridRetriever(embeddingService, vectorStore, fulltextProvider))
        embeddings.push({
            knowledgeBaseId: knowledgeBase.id,
            provider: knowledgeBase.embeddingProvider,
            model: knowledgeBase.embeddingModel,
            dimensions: knowledgeBase.dimensions,
            baseUrl,
        })
    }

    return { retrievers, embeddings }
}

function createDatasetRetriever(retrievers: Map<string, RetrieverService>): RetrieverService {
    return {
        async retrieve(options) {
            const knowledgeBaseId = options.knowledgeBaseIds[0]
            if (!knowledgeBaseId) {
                throw new Error('Evaluation query did not specify a knowledge base ID')
            }

            const retriever = retrievers.get(knowledgeBaseId)
            if (!retriever) {
                throw new Error(`No retriever configured for Knowledge Base ${knowledgeBaseId}`)
            }

            return retriever.retrieve(options)
        },
    }
}

function addCliMetadata(
    report: EvaluationReport,
    datasetSha256: string,
    gitRevision: string,
    embedding: EmbeddingConfigReport[],
    qdrantUrl: string
): CliEvaluationReport {
    const metadata: CliReportMetadata = {
        hashStatus: 'computed',
        datasetSha256,
        topK: report.config.topK,
        mode: report.mode,
        knowledgeBaseIds: report.config.knowledgeBaseIds,
        retrievalConfig: {
            threshold: report.config.threshold ?? null,
            vectorWeight: report.config.vectorWeight ?? null,
            embedding: embedding.map(item => ({
                knowledgeBaseId: item.knowledgeBaseId,
                provider: item.provider,
                model: item.model,
                dimensions: item.dimensions,
                baseUrl: item.baseUrl,
            })),
            qdrant: {
                url: qdrantUrl,
                collectionName: 'knowledge_chunks',
            },
        },
        gitRevision,
        embedding,
        qdrant: {
            url: qdrantUrl,
            collectionName: 'knowledge_chunks',
        },
    }

    return { ...report, metadata }
}

async function readBaselineReport(path: string, mode: RetrievalMode, workspaceRoot: string): Promise<EvaluationReport> {
    const baselinePath = await resolveExistingPath(path, workspaceRoot)
    let raw: string
    try {
        raw = await readFile(baselinePath, 'utf8')
    } catch (error) {
        throw new CliConfigError(`Failed to read baseline report ${baselinePath}: ${errorMessage(error)}`)
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch (error) {
        throw new CliConfigError(`Baseline report ${baselinePath} is not valid JSON: ${errorMessage(error)}`)
    }

    const candidates = isRecord(parsed) && Array.isArray(parsed.reports) ? parsed.reports : [parsed]
    const report = candidates.find(candidate => isRecord(candidate) && candidate.mode === mode)
    if (!isRecord(report)) {
        throw new CliConfigError(`Baseline report ${baselinePath} does not contain a ${mode} report`)
    }

    const validationReasons = validateEvaluationReport(report, `baseline ${mode}`)
    if (validationReasons.length > 0) {
        throw new CliConfigError(`Baseline report ${baselinePath} is malformed: ${validationReasons.join('; ')}`)
    }
    if (!isRecord(report.metadata) || report.metadata.mode !== mode) {
        throw new CliConfigError(`Baseline report ${baselinePath} metadata mode does not match ${mode}`)
    }

    return report as unknown as EvaluationReport
}

function formatMetric(value: number): string {
    return value.toFixed(4)
}

function renderMarkdown(envelope: ReportEnvelope, baselinePath?: string): string {
    const lines = [
        '# RAG Retrieval Evaluation',
        '',
        `- Generated at: ${envelope.generatedAt}`,
        `- Dataset: \`${envelope.dataset.path}\``,
        `- Dataset SHA-256: \`${envelope.dataset.sha256}\``,
        `- Samples: ${envelope.dataset.sampleCount}`,
        `- Baseline: ${baselinePath ? `\`${baselinePath}\`` : 'not provided; report only'}`,
        '',
    ]

    for (const report of envelope.reports) {
        lines.push(`## Mode: ${report.mode}`, '')
        lines.push('| Metric | Value |', '| --- | ---: |')
        lines.push(
            `| Precision@K | ${formatMetric(report.metrics.precisionAtK ?? 0)} |`,
            `| Recall@K | ${formatMetric(report.metrics.recallAtK ?? 0)} |`,
            `| MRR@K | ${formatMetric(report.metrics.mrrAtK ?? 0)} |`,
            `| nDCG@K | ${formatMetric(report.metrics.ndcgAtK ?? 0)} |`,
            `| p50 latency (ms) | ${formatMetric(report.latencyMs.p50)} |`,
            `| p95 latency (ms) | ${formatMetric(report.latencyMs.p95)} |`,
            ''
        )
        lines.push('### Configuration', '')
        lines.push(
            `- Knowledge Base IDs: ${report.metadata.knowledgeBaseIds.map(id => `\`${id}\``).join(', ')}`,
            `- Top K: ${report.config.topK}`,
            `- Threshold: ${report.config.threshold ?? 'null'}`,
            `- Vector weight: ${report.config.vectorWeight ?? 'null'}`,
            `- Git revision: \`${report.metadata.gitRevision}\``,
            `- Qdrant collection: \`${report.metadata.qdrant.collectionName}\` (${report.metadata.qdrant.url})`,
            `- Embedding: ${report.metadata.embedding.map(item => `${item.knowledgeBaseId}=${item.provider}/${item.model} (${item.dimensions}d)`).join('; ')}`,
            ''
        )
        lines.push('### Query results', '')
        for (const query of report.queries) {
            const retrieved = query.retrievedChunkIds.length > 0 ? query.retrievedChunkIds.map(id => `\`${id}\``).join(', ') : 'none'
            lines.push(
                `- **${query.sampleId}** — ${query.query}  `,
                `  - Retrieved: ${retrieved}`,
                `  - Metrics: Precision ${formatMetric(query.metrics.precisionAtK ?? 0)}, Recall ${formatMetric(query.metrics.recallAtK ?? 0)}, MRR ${formatMetric(query.metrics.mrrAtK ?? 0)}, nDCG ${formatMetric(query.metrics.ndcgAtK ?? 0)}`,
                `  - Latency: ${formatMetric(query.latencyMs)} ms`,
                ''
            )
        }

        if (report.baselineComparison) {
            lines.push('### Baseline comparison', '')
            lines.push(`- Compatible: ${report.baselineComparison.compatible ? 'yes' : 'no'}`)
            lines.push(`- Quality gate: ${report.baselineComparison.passed ? 'passed' : 'failed'}`)
            if (report.baselineComparison.reasons.length > 0) {
                lines.push('- Failure details:')
                for (const reason of report.baselineComparison.reasons) {
                    lines.push(`  - ${reason}`)
                }
            }
            lines.push('')
        }
    }

    return `${lines.join('\n').trimEnd()}\n`
}

async function writeReports(envelope: ReportEnvelope, outputDir: string, baselinePath?: string): Promise<void> {
    try {
        await mkdir(outputDir, { recursive: true })
        await writeFile(resolve(outputDir, 'report.json'), `${JSON.stringify(envelope, null, 2)}\n`, 'utf8')
        await writeFile(resolve(outputDir, 'report.md'), renderMarkdown(envelope, baselinePath), 'utf8')
    } catch (error) {
        throw new CliConfigError(`Failed to write evaluation reports to ${outputDir}: ${errorMessage(error)}`)
    }
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
    let options: CliOptions
    try {
        options = parseCliArgs(argv)
    } catch (error) {
        process.stderr.write(`[evaluate:rag] ${errorMessage(error)}\n`)
        return 2
    }

    let evaluationDatabase: Awaited<ReturnType<typeof createEvaluationPrismaClient>> | undefined
    try {
        const gitContext = await getGitContext()
        const datasetPath = await resolveExistingPath(options.datasetPath, gitContext.workspaceRoot)
        let datasetText: string
        try {
            datasetText = await readFile(datasetPath, 'utf8')
        } catch (error) {
            throw new CliConfigError(`Failed to read dataset ${datasetPath}: ${errorMessage(error)}`)
        }

        const datasetSha256 = createHash('sha256').update(datasetText, 'utf8').digest('hex')
        let dataset
        try {
            dataset = parseEvaluationDataset(datasetText)
        } catch (error) {
            throw new CliConfigError(`Invalid evaluation dataset ${datasetPath}: ${errorMessage(error)}`)
        }
        if (dataset.samples.length === 0) {
            throw new CliConfigError('evaluation dataset must not be empty')
        }

        const baselineReports = new Map<RetrievalMode, EvaluationReport>()
        if (options.baselinePath) {
            for (const mode of options.modes) {
                baselineReports.set(mode, await readBaselineReport(options.baselinePath, mode, gitContext.workspaceRoot))
            }
        }

        const knowledgeBaseIds = [...new Set(dataset.samples.map(sample => sample.knowledgeBaseId))]
        evaluationDatabase = await createEvaluationPrismaClient()
        const knowledgeBases = (await evaluationDatabase.client.knowledgeBase.findMany({
            where: { id: { in: knowledgeBaseIds } },
            select: {
                id: true,
                embeddingModel: true,
                embeddingProvider: true,
                dimensions: true,
                threshold: true,
                vectorWeight: true,
            },
        })) as KnowledgeBaseConfig[]

        const foundIds = new Set(knowledgeBases.map(knowledgeBase => knowledgeBase.id))
        const missingId = knowledgeBaseIds.find(id => !foundIds.has(id))
        if (missingId) {
            throw new CliConfigError(`Knowledge Base not found: ${missingId}`)
        }

        const threshold =
            options.threshold ??
            getSingleValue(
                knowledgeBases.map(knowledgeBase => knowledgeBase.threshold),
                'threshold'
            )
        const vectorWeight =
            options.vectorWeight ??
            getSingleValue(
                knowledgeBases.map(knowledgeBase => knowledgeBase.vectorWeight),
                'vector weight'
            )
        const { retrievers, embeddings } = createRetrieverMap(knowledgeBases)
        const datasetRetriever = createDatasetRetriever(retrievers)
        const qdrantUrl = process.env.QDRANT_URL?.trim() || 'http://localhost:6333'
        const reports: CliEvaluationReport[] = []
        let baselineFailed = false

        for (const mode of options.modes) {
            const report = await evaluateRetrievalDataset(datasetRetriever, dataset, {
                mode,
                topK: options.topK,
                threshold,
                vectorWeight,
            })
            const enrichedReport = addCliMetadata(report, datasetSha256, gitContext.revision, embeddings, qdrantUrl)

            if (options.baselinePath) {
                const baseline = baselineReports.get(mode)
                if (!baseline) {
                    throw new Error(`Baseline report is missing for mode ${mode}`)
                }
                const comparison = compareWithBaseline(enrichedReport, baseline)
                enrichedReport.baselineComparison = comparison
                baselineFailed ||= !comparison.passed
            }

            reports.push(enrichedReport)
        }

        const outputDir = isAbsolute(options.outputDir) ? options.outputDir : resolve(gitContext.workspaceRoot, options.outputDir)
        const envelope: ReportEnvelope = {
            generatedAt: new Date().toISOString(),
            dataset: {
                path: datasetPath,
                sha256: datasetSha256,
                sampleCount: dataset.samples.length,
            },
            reports,
        }
        await writeReports(envelope, outputDir, options.baselinePath)
        process.stdout.write(`[evaluate:rag] wrote ${resolve(outputDir, 'report.json')}\n`)
        process.stdout.write(`[evaluate:rag] wrote ${resolve(outputDir, 'report.md')}\n`)
        return baselineFailed ? 1 : 0
    } catch (error) {
        const exitCode = error instanceof CliConfigError ? error.exitCode : 1
        process.stderr.write(`[evaluate:rag] ${errorMessage(error)}\n`)
        return exitCode
    } finally {
        if (evaluationDatabase) {
            await evaluationDatabase.client.$disconnect().catch(error => {
                process.stderr.write(`[evaluate:rag] failed to disconnect Prisma: ${errorMessage(error)}\n`)
            })
            await evaluationDatabase.pool.end().catch(error => {
                process.stderr.write(`[evaluate:rag] failed to close PostgreSQL pool: ${errorMessage(error)}\n`)
            })
        }
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main().then(exitCode => {
        process.exitCode = exitCode
    })
}
