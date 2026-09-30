// cspell:ignore ndcg worktree

import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, isAbsolute, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import type { EvaluationDataset, EvaluationReport, FailureAnalysisResult } from '@ai-workflow/ai-engine'
import { analyzeRagFailure, parseEvaluationDataset, validateEvaluationReport, validateFailureAnalysisInput } from '@ai-workflow/ai-engine'

const execFileAsync = promisify(execFile)

const DEFAULT_OUTPUT_DIR = 'docs/rag/evaluation/analyses'

export class CliConfigError extends Error {
    readonly exitCode: number

    constructor(message: string, exitCode = 2) {
        super(message)
        this.name = 'CliConfigError'
        this.exitCode = exitCode
    }
}

export class CliInputError extends Error {
    readonly exitCode = 1

    constructor(message: string) {
        super(message)
        this.name = 'CliInputError'
    }
}

export interface FailureAnalysisCliOptions {
    datasetPath: string
    reportPath: string
    outputDir: string
}

export interface FailureAnalysisWriteDependencies {
    writeFile?: (path: string, data: string, encoding: 'utf8') => Promise<void>
    rename?: (source: string, target: string) => Promise<void>
    unlink?: (path: string) => Promise<void>
}

interface GitContext {
    workspaceRoot: string
    revision: string
}

interface ReportEnvelope {
    dataset?: unknown
    reports: unknown[]
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
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

    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
        throw new CliConfigError(`${name} requires a value`)
    }

    return { value, nextIndex: index + 1 }
}

export function parseFailureAnalysisCliArgs(argv: readonly string[]): FailureAnalysisCliOptions {
    let datasetPath: string | undefined
    let reportPath: string | undefined
    let outputDir = DEFAULT_OUTPUT_DIR
    const seenOptions = new Set<string>()

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index]
        if (!token || token === '--') {
            continue
        }

        const { name, inlineValue } = splitOption(token)
        if (!name.startsWith('--')) {
            throw new CliConfigError(`unexpected argument: ${name}`)
        }
        if (name !== '--dataset' && name !== '--report' && name !== '--output-dir') {
            throw new CliConfigError(`unknown option: ${name}`)
        }
        if (seenOptions.has(name)) {
            throw new CliConfigError(`${name} must not be repeated`)
        }
        seenOptions.add(name)

        const option = readOptionValue(argv, index, name, inlineValue)
        index = option.nextIndex
        if (name === '--dataset') {
            datasetPath = option.value
        } else if (name === '--report') {
            reportPath = option.value
        } else {
            outputDir = option.value
        }
    }

    if (datasetPath === undefined) {
        throw new CliConfigError('--dataset is required')
    }
    if (reportPath === undefined) {
        throw new CliConfigError('--report is required')
    }

    return { datasetPath, reportPath, outputDir }
}

async function getGitContext(): Promise<GitContext> {
    let workspaceRoot = process.cwd()
    try {
        const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd() })
        workspaceRoot = stdout.trim() || workspaceRoot
    } catch {
        // Keep the current directory when the command is run outside a Git worktree.
    }

    let revision = 'unknown'
    try {
        const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd() })
        revision = stdout.trim() || revision
    } catch {
        // A missing Git revision is metadata, not a reason to prevent offline analysis.
    }

    return { workspaceRoot, revision }
}

function resolveWorkspacePath(inputPath: string, workspaceRoot: string): string {
    return isAbsolute(inputPath) ? inputPath : resolve(workspaceRoot, inputPath)
}

function getReportStructureErrors(report: unknown, label: string): string[] {
    if (!isRecord(report)) {
        return [`${label} must be an object`]
    }

    const errors: string[] = []
    if (report.config === undefined || !isRecord(report.config)) {
        errors.push(`${label} config must be an object`)
    } else {
        if (report.config.mode !== 'vector' && report.config.mode !== 'fulltext' && report.config.mode !== 'hybrid') {
            errors.push(`${label} config.mode is malformed`)
        }
        if (typeof report.config.topK !== 'number' || !Number.isInteger(report.config.topK) || report.config.topK <= 0) {
            errors.push(`${label} config.topK must be a positive integer`)
        }
        if (!Array.isArray(report.config.knowledgeBaseIds) || !report.config.knowledgeBaseIds.every(item => typeof item === 'string')) {
            errors.push(`${label} config.knowledgeBaseIds must be a string array`)
        }
    }

    if (typeof report.sampleCount !== 'number' || !Number.isInteger(report.sampleCount) || report.sampleCount <= 0) {
        errors.push(`${label} sampleCount must be a positive integer`)
    }

    if (!isRecord(report.latencyMs)) {
        errors.push(`${label} latencyMs must be an object`)
    } else {
        for (const percentile of ['p50', 'p95'] as const) {
            if (typeof report.latencyMs[percentile] !== 'number' || !Number.isFinite(report.latencyMs[percentile])) {
                errors.push(`${label} latencyMs.${percentile} must be a finite number`)
            }
        }
    }

    if (!Array.isArray(report.queries)) {
        errors.push(`${label} queries must be an array`)
    } else {
        for (const [index, query] of report.queries.entries()) {
            const queryLabel = `${label} query ${index}`
            if (!isRecord(query)) {
                errors.push(`${queryLabel} must be an object`)
                continue
            }
            if (typeof query.sampleId !== 'string' || query.sampleId.length === 0) {
                errors.push(`${queryLabel} sampleId must be a non-empty string`)
            }
            if (typeof query.query !== 'string') {
                errors.push(`${queryLabel} query must be a string`)
            }
            if (!Array.isArray(query.retrievedChunkIds) || !query.retrievedChunkIds.every(item => typeof item === 'string')) {
                errors.push(`${queryLabel} retrievedChunkIds must be a string array`)
            }
            if (!Array.isArray(query.retrievedResults)) {
                errors.push(`${queryLabel} retrievedResults must be an array`)
            } else {
                for (const [resultIndex, result] of query.retrievedResults.entries()) {
                    if (
                        !isRecord(result) ||
                        typeof result.chunkId !== 'string' ||
                        typeof result.score !== 'number' ||
                        !Number.isFinite(result.score)
                    ) {
                        errors.push(`${queryLabel} retrievedResults[${resultIndex}] is malformed`)
                    }
                }
            }
            if (!isRecord(query.metrics)) {
                errors.push(`${queryLabel} metrics must be an object`)
            }
            if (typeof query.latencyMs !== 'number' || !Number.isFinite(query.latencyMs)) {
                errors.push(`${queryLabel} latencyMs must be a finite number`)
            }
        }
    }

    return errors
}

async function readDataset(datasetPath: string): Promise<{ dataset: EvaluationDataset; sha256: string }> {
    let text: string
    try {
        text = await readFile(datasetPath, 'utf8')
    } catch (error) {
        throw new CliInputError(`Failed to read dataset ${datasetPath}: ${errorMessage(error)}`)
    }

    const sha256 = createHash('sha256').update(text, 'utf8').digest('hex')
    let dataset: EvaluationDataset
    try {
        dataset = parseEvaluationDataset(text)
    } catch (error) {
        throw new CliInputError(`Invalid evaluation dataset ${datasetPath}: ${errorMessage(error)}`)
    }

    return { dataset, sha256 }
}

async function readReports(reportPath: string, datasetSha256: string): Promise<EvaluationReport[]> {
    let text: string
    try {
        text = await readFile(reportPath, 'utf8')
    } catch (error) {
        throw new CliInputError(`Failed to read report ${reportPath}: ${errorMessage(error)}`)
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(text)
    } catch (error) {
        throw new CliInputError(`Report ${reportPath} is not valid JSON: ${errorMessage(error)}`)
    }
    if (!isRecord(parsed) || !Array.isArray(parsed.reports)) {
        throw new CliInputError(`Report ${reportPath} reports must be an array`)
    }

    const envelope = parsed as unknown as ReportEnvelope
    if (envelope.dataset !== undefined) {
        if (!isRecord(envelope.dataset)) {
            throw new CliInputError(`Report ${reportPath} dataset must be an object`)
        }
        if (envelope.dataset.sha256 !== undefined) {
            if (typeof envelope.dataset.sha256 !== 'string') {
                throw new CliInputError(`Report ${reportPath} dataset.sha256 must be a string`)
            }
            if (envelope.dataset.sha256 !== datasetSha256) {
                throw new CliInputError(
                    `Report ${reportPath} dataset.sha256 ${envelope.dataset.sha256} does not match dataset SHA ${datasetSha256}`
                )
            }
        }
    }

    const reports: EvaluationReport[] = []
    for (const [index, report] of envelope.reports.entries()) {
        const label = `report ${index}`
        const validationErrors = validateEvaluationReport(report, label)
        const structureErrors = getReportStructureErrors(report, label)
        if (validationErrors.length > 0 || structureErrors.length > 0) {
            throw new CliInputError(`Report ${reportPath} is malformed: ${[...validationErrors, ...structureErrors].join('; ')}`)
        }

        const typedReport = report as EvaluationReport
        if (typedReport.metadata?.datasetSha256 !== datasetSha256) {
            throw new CliInputError(
                `Report ${reportPath} mode ${typedReport.mode} metadata.datasetSha256 ${typedReport.metadata?.datasetSha256} does not match dataset SHA ${datasetSha256}`
            )
        }
        reports.push(typedReport)
    }

    if (reports.length === 0) {
        throw new CliInputError(`Report ${reportPath} reports must contain at least one report`)
    }

    return reports
}

function formatMetric(value: number): string {
    return value.toFixed(4)
}

function markdownText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function markdownCodeSpan(value: string): string {
    const normalized = value.replace(/\r?\n/g, ' ')
    let longestBacktickRun = 0
    let currentBacktickRun = 0
    for (const character of normalized) {
        if (character === '`') {
            currentBacktickRun += 1
            longestBacktickRun = Math.max(longestBacktickRun, currentBacktickRun)
        } else {
            currentBacktickRun = 0
        }
    }

    const fence = '`'.repeat(longestBacktickRun + 1)
    return `${fence}${normalized}${fence}`
}

function formatIds(ids: readonly string[]): string {
    return ids.length === 0 ? 'none' : ids.map(id => markdownCodeSpan(id)).join(', ')
}

export function renderFailureAnalysisMarkdown(result: FailureAnalysisResult): string {
    const lines = [
        '# RAG Retrieval Failure Analysis',
        '',
        '## Dataset and baseline',
        '',
        `- Dataset: ${markdownCodeSpan(result.dataset.path)}`,
        `- Dataset SHA-256: ${markdownCodeSpan(result.dataset.sha256)}`,
        `- Samples: ${result.dataset.sampleCount}`,
        `- Baseline report: ${markdownCodeSpan(result.baseline.path)}`,
        `- Top-K: ${result.topK}`,
        `- Generated at: ${result.generatedAt}`,
        `- Git revision: ${markdownCodeSpan(result.gitRevision)}`,
        '',
        '## Mode summary',
        '',
        '| Mode | Query count | Complete | Partial | Zero | background-only | False positives | Average false positives/query | Precision@K | Recall@K | MRR@K | nDCG@K | p50 latency (ms) | p95 latency (ms) |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ]

    for (const mode of result.modes) {
        const analysis = result.byMode[mode]
        const summary = analysis.summary
        lines.push(
            `| ${mode} | ${summary.queryCount} | ${summary.completeCoverageCount} | ${summary.partialCoverageCount} | ${summary.zeroCoverageCount} | ${summary.backgroundOnlyCount} | ${summary.falsePositiveCount} | ${formatMetric(summary.averageFalsePositivePerQuery)} | ${formatMetric(analysis.metrics.precisionAtK)} | ${formatMetric(analysis.metrics.recallAtK)} | ${formatMetric(analysis.metrics.mrrAtK)} | ${formatMetric(analysis.metrics.ndcgAtK)} | ${formatMetric(analysis.latencyMs.p50)} | ${formatMetric(analysis.latencyMs.p95)} |`
        )
    }

    lines.push(
        '',
        '## Priority failure queries',
        '',
        '| Rank | Sample | Query | Recommended focus mode | nDCG@K | Recall@K | False positives |',
        '| ---: | --- | --- | --- | ---: | ---: | ---: |'
    )
    for (const [index, failure] of result.priorityFailures.entries()) {
        lines.push(
            `| ${index + 1} | ${markdownText(failure.sampleId)} | ${markdownText(failure.query)} | ${failure.recommendedFocusMode} | ${formatMetric(failure.nDCG)} | ${formatMetric(failure.recall)} | ${failure.falsePositiveCount} |`
        )
    }

    lines.push('', '## Query-by-query diagnostics', '')
    for (const mode of result.modes) {
        const analysis = result.byMode[mode]
        lines.push(`### Mode: ${mode}`, '')
        for (const query of analysis.queries) {
            lines.push(
                `#### ${markdownText(query.sampleId)} — ${markdownText(query.query)}`,
                '',
                `- Coverage status: ${query.coverageStatus}`,
                `- Covered ratio: ${formatMetric(query.coverage)} (${query.coveredRelevantChunkCount}/${query.relevantChunkCount})`,
                `- Covered relevant IDs: ${formatIds(query.coveredRelevantChunkIds)}`,
                `- Missed relevant IDs: ${formatIds(query.missedRelevantChunkIds)}`,
                `- False-positive IDs: ${formatIds(query.falsePositiveChunkIds)}`,
                `- Missed core IDs: ${formatIds(query.missedCoreChunkIds)}`,
                `- Background-only: ${query.backgroundOnly ? 'yes' : 'no'}`,
                `- Max retrieved relevance: ${query.maxRetrievedRelevance}`,
                `- Raw metrics: Precision@K: ${formatMetric(query.metrics.precisionAtK)}, Recall@K: ${formatMetric(query.metrics.recallAtK)}, MRR@K: ${formatMetric(query.metrics.mrrAtK)}, nDCG@K: ${formatMetric(query.metrics.ndcgAtK)}`,
                `- Latency: ${formatMetric(query.latencyMs)} ms`,
                ''
            )
        }
    }

    lines.push(
        '## Interpretation boundary',
        '',
        'The recommended focus mode is a deterministic review ordering based on observed metrics, not an automatic root-cause proof.',
        'The analysis reports retrieval facts from the dataset and baseline reports; it does not infer or prescribe a retrieval fix.',
        ''
    )

    return `${lines.join('\n').trimEnd()}\n`
}

export async function writeFailureAnalysisReports(
    outputDir: string,
    result: FailureAnalysisResult,
    dependencies: FailureAnalysisWriteDependencies = {}
): Promise<{ jsonPath: string; markdownPath: string }> {
    await mkdir(outputDir, { recursive: true })

    const stem = basename(result.baseline.path).replace(/\.report\.json$/, '')
    const jsonPath = resolve(outputDir, `${stem}.failure-analysis.json`)
    const markdownPath = resolve(outputDir, `${stem}.failure-analysis.md`)
    const transactionId = randomUUID()
    const jsonTempPath = `${jsonPath}.${transactionId}.tmp`
    const markdownTempPath = `${markdownPath}.${transactionId}.tmp`
    const jsonBackupPath = `${jsonPath}.${transactionId}.bak`
    const markdownBackupPath = `${markdownPath}.${transactionId}.bak`
    const write = dependencies.writeFile ?? (async (path: string, data: string, encoding: 'utf8') => writeFile(path, data, encoding))
    const move = dependencies.rename ?? rename
    const remove = dependencies.unlink ?? unlink
    const backups: Array<{ target: string; backup: string }> = []
    const publishedTargets: string[] = []

    const isMissingFileError = (error: unknown): boolean => isRecord(error) && error.code === 'ENOENT'
    const cleanup = async (path: string): Promise<void> => {
        await remove(path).catch(() => undefined)
    }
    const backupExistingTarget = async (target: string, backup: string): Promise<void> => {
        try {
            await move(target, backup)
            backups.push({ target, backup })
        } catch (error) {
            if (!isMissingFileError(error)) {
                throw error
            }
        }
    }

    try {
        await write(jsonTempPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
        await write(markdownTempPath, renderFailureAnalysisMarkdown(result), 'utf8')
        await backupExistingTarget(jsonPath, jsonBackupPath)
        await backupExistingTarget(markdownPath, markdownBackupPath)
        await move(jsonTempPath, jsonPath)
        publishedTargets.push(jsonPath)
        await move(markdownTempPath, markdownPath)
        publishedTargets.push(markdownPath)
    } catch (error) {
        for (const target of publishedTargets.reverse()) {
            await cleanup(target)
        }
        for (const { target, backup } of backups.reverse()) {
            await move(backup, target).catch(() => undefined)
        }
        await cleanup(jsonTempPath)
        await cleanup(markdownTempPath)
        await cleanup(jsonBackupPath)
        await cleanup(markdownBackupPath)
        throw error
    }

    await cleanup(jsonTempPath)
    await cleanup(markdownTempPath)
    await cleanup(jsonBackupPath)
    await cleanup(markdownBackupPath)

    return { jsonPath, markdownPath }
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
    let options: FailureAnalysisCliOptions
    try {
        options = parseFailureAnalysisCliArgs(argv)
    } catch (error) {
        process.stderr.write(`[analyze:rag] ${errorMessage(error)}\n`)
        return error instanceof CliConfigError ? error.exitCode : 2
    }

    try {
        const gitContext = await getGitContext()
        const datasetPath = resolveWorkspacePath(options.datasetPath, gitContext.workspaceRoot)
        const reportPath = resolveWorkspacePath(options.reportPath, gitContext.workspaceRoot)
        const { dataset, sha256: datasetSha256 } = await readDataset(datasetPath)
        let reports: EvaluationReport[]
        try {
            reports = await readReports(reportPath, datasetSha256)
        } catch (error) {
            if (error instanceof CliInputError) {
                throw new CliInputError(`${error.message}\nDataset: ${datasetPath}\nReport: ${reportPath}`)
            }
            throw error
        }
        const input = {
            dataset,
            datasetSha256,
            datasetPath: relative(gitContext.workspaceRoot, datasetPath),
            reportPath: relative(gitContext.workspaceRoot, reportPath),
            gitRevision: gitContext.revision,
            generatedAt: new Date().toISOString(),
            reports,
        }
        const validationErrors = validateFailureAnalysisInput(input)
        if (validationErrors.length > 0) {
            throw new CliInputError(
                `Invalid RAG failure analysis input\nDataset: ${datasetPath}\nReport: ${reportPath}\n${validationErrors.join('\n')}`
            )
        }
        const result = analyzeRagFailure(input)
        const outputDir = resolveWorkspacePath(options.outputDir, gitContext.workspaceRoot)
        const { jsonPath, markdownPath } = await writeFailureAnalysisReports(outputDir, result)

        process.stdout.write(`[analyze:rag] wrote ${jsonPath}\n`)
        process.stdout.write(`[analyze:rag] wrote ${markdownPath}\n`)
        return 0
    } catch (error) {
        const exitCode = error instanceof CliConfigError || error instanceof CliInputError ? error.exitCode : 1
        process.stderr.write(`[analyze:rag] ${errorMessage(error)}\n`)
        return exitCode
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main().then(exitCode => {
        process.exitCode = exitCode
    })
}
