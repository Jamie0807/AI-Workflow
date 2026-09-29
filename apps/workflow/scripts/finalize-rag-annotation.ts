import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import type { AnnotationManifest, AnnotationReview, EvaluationDataset } from '@ai-workflow/ai-engine'
import { finalizeAnnotationDataset, parseAnnotationReviews } from '@ai-workflow/ai-engine'

import { CliConfigError } from './rag-evaluation-runtime'

const execFileAsync = promisify(execFile)

export interface FinalizeAnnotationCliOptions {
    reviewPath: string
    manifestPath: string
    datasetPath: string
    annotator: string
    reviewedAt: string
}

export interface FinalizeAnnotationRuntimeDependencies {
    rename: typeof rename
}

const DEFAULT_FINALIZE_RUNTIME: FinalizeAnnotationRuntimeDependencies = { rename }

const HELP_TEXT = `Usage:
  pnpm --filter @ai-workflow/workflow finalize:rag-annotation -- \
    --review docs/rag/evaluation/prometheus-global-guardian-v1.review.jsonl \
    --manifest docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json \
    --dataset docs/rag/evaluation/prometheus-global-guardian-v1.jsonl \
    --annotator project-owner

Options:
  --review <path>       Candidate review JSONL (required)
  --manifest <path>     Candidate manifest JSON (required)
  --dataset <path>      Formal evaluation JSONL (required)
  --annotator <name>    Human annotator identifier (required)
  --reviewed-at <ISO>   Review timestamp (default: current ISO timestamp)
  --help                Show this help
`

function splitOption(token: string): { name: string; inlineValue?: string } {
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

function parseReviewedAt(value: string, option: string): string {
    if (!Number.isFinite(Date.parse(value))) {
        throw new CliConfigError(`${option} must be a valid ISO timestamp`)
    }

    return value
}

export function parseFinalizeAnnotationCliArgs(argv: readonly string[], now: Date = new Date()): FinalizeAnnotationCliOptions {
    let reviewPath: string | undefined
    let manifestPath: string | undefined
    let datasetPath: string | undefined
    let annotator: string | undefined
    let reviewedAt = now.toISOString()
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
        if (name === '--help') {
            throw new CliConfigError('use --help as a standalone option')
        }
        if (seenOptions.has(name)) {
            throw new CliConfigError(`${name} must not be repeated`)
        }
        seenOptions.add(name)

        if (name === '--review') {
            const option = readOptionValue(argv, index, name, inlineValue)
            reviewPath = option.value
            index = option.nextIndex
        } else if (name === '--manifest') {
            const option = readOptionValue(argv, index, name, inlineValue)
            manifestPath = option.value
            index = option.nextIndex
        } else if (name === '--dataset') {
            const option = readOptionValue(argv, index, name, inlineValue)
            datasetPath = option.value
            index = option.nextIndex
        } else if (name === '--annotator') {
            const option = readOptionValue(argv, index, name, inlineValue)
            if (option.value.trim().length === 0) {
                throw new CliConfigError('--annotator must be a non-empty string')
            }
            annotator = option.value.trim()
            index = option.nextIndex
        } else if (name === '--reviewed-at') {
            const option = readOptionValue(argv, index, name, inlineValue)
            reviewedAt = parseReviewedAt(option.value, name)
            index = option.nextIndex
        } else {
            throw new CliConfigError(`unknown option: ${name}`)
        }
    }

    if (!reviewPath) {
        throw new CliConfigError('--review is required')
    }
    if (!manifestPath) {
        throw new CliConfigError('--manifest is required')
    }
    if (!datasetPath) {
        throw new CliConfigError('--dataset is required')
    }
    if (!annotator) {
        throw new CliConfigError('--annotator is required')
    }
    if (reviewPath === manifestPath || reviewPath === datasetPath || manifestPath === datasetPath) {
        throw new CliConfigError('--review, --manifest, and --dataset must be different paths')
    }

    return { reviewPath, manifestPath, datasetPath, annotator, reviewedAt }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
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

async function pathExists(path: string): Promise<boolean> {
    try {
        await access(path)
        return true
    } catch (error) {
        if (isRecord(error) && error.code === 'ENOENT') {
            return false
        }
        throw error
    }
}

async function removeIfPresent(path: string): Promise<void> {
    await unlink(path).catch(() => undefined)
}

async function readReviewFile(reviewPath: string): Promise<AnnotationReview[]> {
    let reviewText: string
    try {
        reviewText = await readFile(reviewPath, 'utf8')
    } catch (error) {
        throw new CliConfigError(`Failed to read review ${reviewPath}: ${errorMessage(error)}`)
    }

    try {
        return parseAnnotationReviews(reviewText)
    } catch (error) {
        throw new CliConfigError(`Invalid annotation review ${reviewPath}: ${errorMessage(error)}`)
    }
}

async function readManifestFile(manifestPath: string): Promise<AnnotationManifest> {
    let manifestText: string
    try {
        manifestText = await readFile(manifestPath, 'utf8')
    } catch (error) {
        throw new CliConfigError(`Failed to read manifest ${manifestPath}: ${errorMessage(error)}`)
    }

    let value: unknown
    try {
        value = JSON.parse(manifestText)
    } catch (error) {
        throw new CliConfigError(`Manifest ${manifestPath} is not valid JSON: ${errorMessage(error)}`)
    }

    if (!isRecord(value) || typeof value.knowledgeBaseId !== 'string' || value.knowledgeBaseId.trim().length === 0) {
        throw new CliConfigError(`Manifest ${manifestPath} must contain a non-empty knowledgeBaseId`)
    }
    if (value.annotationStatus !== 'candidate') {
        throw new CliConfigError(`Manifest ${manifestPath} must have annotationStatus candidate`)
    }

    return value as unknown as AnnotationManifest
}

function validateManifestForReviews(manifest: AnnotationManifest, reviews: readonly AnnotationReview[]): void {
    if (typeof manifest.queryCount === 'number' && manifest.queryCount !== reviews.length) {
        throw new CliConfigError(`Manifest queryCount ${manifest.queryCount} does not match review count ${reviews.length}`)
    }

    for (const review of reviews) {
        if (review.knowledgeBaseId !== manifest.knowledgeBaseId) {
            throw new CliConfigError(
                `Review ${review.id} Knowledge Base ${review.knowledgeBaseId} does not match manifest Knowledge Base ${manifest.knowledgeBaseId}`
            )
        }
        for (const candidate of review.candidates) {
            if (candidate.knowledgeBaseId !== manifest.knowledgeBaseId) {
                throw new CliConfigError(
                    `Candidate ${candidate.chunkId} Knowledge Base ${candidate.knowledgeBaseId} does not match manifest Knowledge Base ${manifest.knowledgeBaseId}`
                )
            }
        }
    }
}

function serializeDataset(dataset: EvaluationDataset): string {
    return `${dataset.samples.map(sample => JSON.stringify(sample)).join('\n')}\n`
}

function buildReviewedManifest(
    manifest: AnnotationManifest,
    annotator: string,
    reviewedAt: string,
    datasetSha256: string
): AnnotationManifest {
    return {
        ...manifest,
        annotationStatus: 'human-reviewed',
        annotator,
        reviewedAt,
        datasetSha256,
    }
}

export async function writeAtomicOutputs(
    datasetPath: string,
    datasetText: string,
    manifestPath: string,
    manifestText: string,
    renameFile: typeof rename = rename
): Promise<void> {
    await mkdir(dirname(datasetPath), { recursive: true })
    await mkdir(dirname(manifestPath), { recursive: true })

    const datasetTempPath = `${datasetPath}.${randomUUID()}.tmp`
    const manifestTempPath = `${manifestPath}.${randomUUID()}.tmp`
    const datasetBackupPath = `${datasetPath}.${randomUUID()}.bak`
    const manifestBackupPath = `${manifestPath}.${randomUUID()}.bak`
    let datasetBackupCreated = false
    let manifestBackupCreated = false
    let datasetPublished = false
    let manifestPublished = false

    try {
        if (await pathExists(datasetPath)) {
            await renameFile(datasetPath, datasetBackupPath)
            datasetBackupCreated = true
        }
        if (await pathExists(manifestPath)) {
            await renameFile(manifestPath, manifestBackupPath)
            manifestBackupCreated = true
        }

        await writeFile(datasetTempPath, datasetText, 'utf8')
        await writeFile(manifestTempPath, manifestText, 'utf8')
        await renameFile(datasetTempPath, datasetPath)
        datasetPublished = true
        await renameFile(manifestTempPath, manifestPath)
        manifestPublished = true
    } catch (error) {
        if (datasetPublished || datasetBackupCreated) {
            await removeIfPresent(datasetPath)
        }
        if (manifestPublished || manifestBackupCreated) {
            await removeIfPresent(manifestPath)
        }
        if (datasetBackupCreated) {
            await renameFile(datasetBackupPath, datasetPath).catch(() => undefined)
        }
        if (manifestBackupCreated) {
            await renameFile(manifestBackupPath, manifestPath).catch(() => undefined)
        }
        throw error
    } finally {
        await removeIfPresent(datasetTempPath)
        await removeIfPresent(manifestTempPath)
        await removeIfPresent(datasetBackupPath)
        await removeIfPresent(manifestBackupPath)
    }
}

export async function main(
    argv: readonly string[] = process.argv.slice(2),
    runtime: FinalizeAnnotationRuntimeDependencies = DEFAULT_FINALIZE_RUNTIME
): Promise<number> {
    if (argv.includes('--help')) {
        process.stdout.write(HELP_TEXT)
        return 0
    }

    let options: FinalizeAnnotationCliOptions
    try {
        options = parseFinalizeAnnotationCliArgs(argv)
    } catch (error) {
        process.stderr.write(`[finalize:rag-annotation] ${errorMessage(error)}\n`)
        return 2
    }

    try {
        const workspaceRoot = await getWorkspaceRoot()
        const reviewPath = resolveWorkspacePath(options.reviewPath, workspaceRoot)
        const manifestPath = resolveWorkspacePath(options.manifestPath, workspaceRoot)
        const datasetPath = resolveWorkspacePath(options.datasetPath, workspaceRoot)
        if (reviewPath === manifestPath || reviewPath === datasetPath || manifestPath === datasetPath) {
            throw new CliConfigError('--review, --manifest, and --dataset must be different paths')
        }

        const reviews = await readReviewFile(reviewPath)
        const manifest = await readManifestFile(manifestPath)
        validateManifestForReviews(manifest, reviews)

        let dataset: EvaluationDataset
        try {
            dataset = finalizeAnnotationDataset(reviews)
        } catch (error) {
            throw new CliConfigError(`Cannot finalize annotation review: ${errorMessage(error)}`)
        }

        const datasetText = serializeDataset(dataset)
        const datasetSha256 = createHash('sha256').update(datasetText, 'utf8').digest('hex')
        const reviewedManifest = buildReviewedManifest(manifest, options.annotator, options.reviewedAt, datasetSha256)
        await writeAtomicOutputs(datasetPath, datasetText, manifestPath, `${JSON.stringify(reviewedManifest, null, 2)}\n`, runtime.rename)

        process.stdout.write(`[finalize:rag-annotation] wrote ${datasetPath}\n`)
        process.stdout.write(`[finalize:rag-annotation] updated ${manifestPath}\n`)
        return 0
    } catch (error) {
        const exitCode = error instanceof CliConfigError ? error.exitCode : 1
        process.stderr.write(`[finalize:rag-annotation] ${errorMessage(error)}\n`)
        return exitCode
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main().then(exitCode => {
        process.exitCode = exitCode
    })
}
