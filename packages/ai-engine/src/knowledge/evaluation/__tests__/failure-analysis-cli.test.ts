// cspell:ignore ndcg

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, rename as fsRename, rm, unlink as fsUnlink, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
    main,
    parseFailureAnalysisCliArgs,
    renderFailureAnalysisMarkdown,
    writeFailureAnalysisReports,
} from '../../../../../../apps/workflow/scripts/analyze-rag'
import type { FailureAnalysisResult } from '../failure-analysis'
import { analyzeRagFailure, parseEvaluationDataset } from '../index'
import type { EvaluationDataset, EvaluationReport, QueryEvaluation } from '../types'

const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()

const DATASET_SAMPLES = [
    {
        id: 'q-1',
        query: '系统边界是什么？',
        knowledgeBaseId: 'kb-1',
        relevantChunks: [
            { chunkId: 'chunk-core', relevance: 3 as const },
            { chunkId: 'chunk-background', relevance: 1 as const },
        ],
    },
    {
        id: 'q-2',
        query: '风险等级如何判断？',
        knowledgeBaseId: 'kb-1',
        relevantChunks: [{ chunkId: 'chunk-risk', relevance: 2 as const }],
    },
]

const datasetText = `${DATASET_SAMPLES.map(sample => JSON.stringify(sample)).join('\n')}\n`
const datasetSha256 = createHash('sha256').update(datasetText, 'utf8').digest('hex')

const metrics = {
    precisionAtK: 0.5,
    recallAtK: 0.5,
    mrrAtK: 1,
    ndcgAtK: 0.5,
}

const retrievedChunkIdsByMode: Record<'vector' | 'fulltext' | 'hybrid', Record<string, string[]>> = {
    vector: {
        'q-1': ['chunk-core', 'chunk-unrelated'],
        'q-2': ['chunk-unrelated'],
    },
    fulltext: {
        'q-1': ['chunk-background'],
        'q-2': ['chunk-risk'],
    },
    hybrid: {
        'q-1': ['chunk-unrelated'],
        'q-2': ['chunk-risk'],
    },
}

function createQuery(sampleId: string, retrievedChunkIds: string[], overrides: Partial<QueryEvaluation> = {}): QueryEvaluation {
    return {
        sampleId,
        query: DATASET_SAMPLES.find(sample => sample.id === sampleId)?.query ?? sampleId,
        retrievedChunkIds,
        retrievedResults: retrievedChunkIds.map((chunkId, index) => ({ chunkId, score: 1 - index / 10 })),
        metrics: { ...metrics },
        latencyMs: 10,
        ...overrides,
    }
}

function createReport(
    mode: 'vector' | 'fulltext' | 'hybrid',
    overrides: { datasetSha256?: string; topK?: number; queries?: QueryEvaluation[] } = {}
): EvaluationReport {
    const topK = overrides.topK ?? 2
    const datasetSha = overrides.datasetSha256 ?? datasetSha256
    const queries =
        overrides.queries ?? DATASET_SAMPLES.map(sample => createQuery(sample.id, retrievedChunkIdsByMode[mode][sample.id] ?? []))

    return {
        mode,
        config: { mode, topK, knowledgeBaseIds: ['kb-1'] },
        sampleCount: DATASET_SAMPLES.length,
        metrics: { ...metrics },
        latencyMs: { p50: 10, p95: 20 },
        queries,
        metadata: {
            hashStatus: 'computed',
            datasetSha256: datasetSha,
            topK,
            mode,
            knowledgeBaseIds: ['kb-1'],
            retrievalConfig: { threshold: null, vectorWeight: null },
        },
    }
}

function createReports(overrides: { datasetSha256?: string; topK?: number } = {}): EvaluationReport[] {
    return [createReport('vector', overrides), createReport('fulltext', overrides), createReport('hybrid', overrides)]
}

function createReportEnvelope(reports: EvaluationReport[] = createReports(), datasetSha = datasetSha256): object {
    return {
        generatedAt: '2026-09-30T00:00:00.000Z',
        dataset: { sha256: datasetSha },
        reports,
    }
}

interface Fixture {
    root: string
    datasetPath: string
    reportPath: string
    outputDir: string
    dataset: EvaluationDataset
    result: FailureAnalysisResult
}

async function createFixture(): Promise<Fixture> {
    const root = await mkdtemp(join(repositoryRoot, '.task-3-cli-'))
    const datasetPath = join(root, 'prometheus-global-guardian-v1.jsonl')
    const reportPath = join(root, 'prometheus-global-guardian-v1.report.json')
    const outputDir = join(root, 'analysis')
    const dataset = parseEvaluationDataset(datasetText)
    const reports = createReports()

    await writeFile(datasetPath, datasetText, 'utf8')
    await writeFile(reportPath, `${JSON.stringify(createReportEnvelope(reports), null, 2)}\n`, 'utf8')

    return {
        root,
        datasetPath,
        reportPath,
        outputDir,
        dataset,
        result: analyzeRagFailure({
            dataset,
            datasetSha256,
            datasetPath: relative(repositoryRoot, datasetPath),
            reportPath: relative(repositoryRoot, reportPath),
            gitRevision: 'test-revision',
            generatedAt: '2026-09-30T00:00:00.000Z',
            reports,
        }),
    }
}

async function withFixture<T>(callback: (fixture: Fixture) => Promise<T>): Promise<T> {
    const fixture = await createFixture()
    try {
        return await callback(fixture)
    } finally {
        await rm(fixture.root, { recursive: true, force: true })
    }
}

async function runMain(argv: readonly string[]): Promise<{ exitCode: number; stderr: string }> {
    const stderr: string[] = []
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(chunk => {
        stderr.push(String(chunk))
        return true
    })
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
        return { exitCode: await main(argv), stderr: stderr.join('') }
    } finally {
        stderrSpy.mockRestore()
        stdoutSpy.mockRestore()
    }
}

describe('analyze:rag CLI', () => {
    it('parses required options, equals syntax, and the pnpm separator', () => {
        expect(
            parseFailureAnalysisCliArgs([
                '--',
                '--dataset=docs/evaluation.jsonl',
                '--report',
                'docs/baseline.report.json',
                '--output-dir',
                'docs/analysis',
            ])
        ).toEqual({
            datasetPath: 'docs/evaluation.jsonl',
            reportPath: 'docs/baseline.report.json',
            outputDir: 'docs/analysis',
        })
        expect(parseFailureAnalysisCliArgs(['--dataset', 'dataset.jsonl', '--report', 'report.json'])).toEqual({
            datasetPath: 'dataset.jsonl',
            reportPath: 'report.json',
            outputDir: 'docs/rag/evaluation/analyses',
        })
    })

    it('rejects missing, duplicate, unknown, and valueless options with their option names', () => {
        expect(() => parseFailureAnalysisCliArgs(['--dataset', 'dataset.jsonl'])).toThrow('--report is required')
        expect(() => parseFailureAnalysisCliArgs(['--report', 'report.json'])).toThrow('--dataset is required')
        expect(() => parseFailureAnalysisCliArgs(['--dataset', 'a', '--dataset', 'b', '--report', 'report.json'])).toThrow(
            '--dataset must not be repeated'
        )
        expect(() => parseFailureAnalysisCliArgs(['--dataset', 'a', '--report', 'report.json', '--unknown', 'x'])).toThrow('--unknown')
        expect(() => parseFailureAnalysisCliArgs(['--dataset', '--report', 'report.json'])).toThrow('--dataset requires a value')
    })

    it('reads repository-relative inputs and writes complete JSON and Markdown reports atomically', async () => {
        await withFixture(async fixture => {
            const datasetRelativePath = relative(repositoryRoot, fixture.datasetPath)
            const reportRelativePath = relative(repositoryRoot, fixture.reportPath)
            const { exitCode, stderr } = await runMain([
                '--dataset',
                datasetRelativePath,
                '--report',
                reportRelativePath,
                '--output-dir',
                fixture.outputDir,
            ])

            expect(exitCode).toBe(0)
            expect(stderr).toBe('')
            const files = (await readdir(fixture.outputDir)).sort()
            expect(files).toEqual([
                'prometheus-global-guardian-v1.failure-analysis.json',
                'prometheus-global-guardian-v1.failure-analysis.md',
            ])

            const jsonPath = join(fixture.outputDir, files[0]!)
            const markdownPath = join(fixture.outputDir, files[1]!)
            const output = JSON.parse(await readFile(jsonPath, 'utf8')) as FailureAnalysisResult
            const markdown = await readFile(markdownPath, 'utf8')

            expect(output.dataset.sha256).toBe(datasetSha256)
            expect(output.dataset.path).toBe(datasetRelativePath)
            expect(output.modes).toEqual(['vector', 'fulltext', 'hybrid'])
            expect(output.byMode.vector.summary.queryCount).toBe(2)
            expect(markdown).toContain('# RAG Retrieval Failure Analysis')
            expect(markdown).toContain('## Dataset and baseline')
            expect(markdown).toContain(`Dataset SHA-256: \`${datasetSha256}\``)
            expect(markdown).toContain('## Mode summary')
            expect(markdown).toContain('| vector |')
            expect(markdown).toContain('complete')
            expect(markdown).toContain('partial')
            expect(markdown).toContain('zero')
            expect(markdown).toContain('background-only')
            expect(markdown).toContain('## Priority failure queries')
            expect(markdown).toContain('q-1')
            expect(markdown).toContain('## Query-by-query diagnostics')
            expect(markdown).toContain('Missed relevant IDs')
            expect(markdown).toContain('False-positive IDs')
            expect(markdown).toContain('Missed core IDs')
            expect(markdown).toContain('Covered ratio')
            expect(markdown).toContain('Precision@K')
            expect(markdown).toContain('## Interpretation boundary')
            expect(markdown).toContain('not an automatic root-cause proof')
            expect(files.filter(name => name.endsWith('.tmp'))).toEqual([])
        })
    })

    it('renders the fixed Markdown sections and raw per-query metrics', async () => {
        await withFixture(async fixture => {
            const markdown = renderFailureAnalysisMarkdown(fixture.result)

            expect(markdown).toMatch(
                /# RAG Retrieval Failure Analysis[\s\S]*## Dataset and baseline[\s\S]*## Mode summary[\s\S]*## Priority failure queries[\s\S]*## Query-by-query diagnostics[\s\S]*## Interpretation boundary/
            )
            expect(markdown).toContain('Recall@K: 0.5000')
            expect(markdown).toContain('MRR@K: 1.0000')
            expect(markdown).toContain('nDCG@K: 0.5000')
            expect(markdown).toContain('p50 latency (ms)')
            expect(markdown).toContain('chunk-core')
            expect(markdown).toContain('chunk-unrelated')
        })
    })

    it('returns nonzero and reports the actual path for a missing dataset', async () => {
        await withFixture(async fixture => {
            const missingPath = join(fixture.root, 'missing.jsonl')
            const outcome = await runMain(['--dataset', missingPath, '--report', fixture.reportPath, '--output-dir', fixture.outputDir])

            expect(outcome.exitCode).toBe(1)
            expect(outcome.stderr).toContain(missingPath)
        })
    })

    it('rejects invalid JSONL and invalid report JSON with concrete paths', async () => {
        await withFixture(async fixture => {
            await writeFile(fixture.datasetPath, '{"id":"broken"}\nnot-json\n', 'utf8')
            const invalidDataset = await runMain(['--dataset', fixture.datasetPath, '--report', fixture.reportPath])
            expect(invalidDataset.exitCode).toBe(1)
            expect(invalidDataset.stderr).toContain(fixture.datasetPath)
            expect(invalidDataset.stderr).toContain('Invalid evaluation dataset')

            await writeFile(fixture.datasetPath, datasetText, 'utf8')
            await writeFile(fixture.reportPath, '{not-json', 'utf8')
            const invalidReport = await runMain(['--dataset', fixture.datasetPath, '--report', fixture.reportPath])
            expect(invalidReport.exitCode).toBe(1)
            expect(invalidReport.stderr).toContain(fixture.reportPath)
            expect(invalidReport.stderr).toContain('not valid JSON')
        })
    })

    it('returns exit code 1 and the actual path for a missing report', async () => {
        await withFixture(async fixture => {
            const missingPath = join(fixture.root, 'missing.report.json')
            const outcome = await runMain(['--dataset', fixture.datasetPath, '--report', missingPath])

            expect(outcome.exitCode).toBe(1)
            expect(outcome.stderr).toContain(missingPath)
        })
    })

    it('rejects a report without the required reports array', async () => {
        await withFixture(async fixture => {
            await writeFile(fixture.reportPath, JSON.stringify({ dataset: { sha256: datasetSha256 } }), 'utf8')
            const outcome = await runMain(['--dataset', fixture.datasetPath, '--report', fixture.reportPath])

            expect(outcome.exitCode).toBe(1)
            expect(outcome.stderr).toContain(fixture.reportPath)
            expect(outcome.stderr).toContain('reports must be an array')
        })
    })

    it('rejects missing modes, SHA conflicts, query ID mismatches, and top-k mismatches', async () => {
        await withFixture(async fixture => {
            const reportEnvelope = createReportEnvelope(createReports())
            const missingModeEnvelope = createReportEnvelope(createReports().slice(0, 2))
            await writeFile(fixture.reportPath, JSON.stringify(missingModeEnvelope), 'utf8')
            const missingMode = await runMain(['--dataset', fixture.datasetPath, '--report', fixture.reportPath])
            expect(missingMode.exitCode).toBe(1)
            expect(missingMode.stderr).toContain('missing report for mode hybrid')

            await writeFile(fixture.reportPath, JSON.stringify({ ...reportEnvelope, dataset: { sha256: 'wrong-sha' } }), 'utf8')
            const shaConflict = await runMain(['--dataset', fixture.datasetPath, '--report', fixture.reportPath])
            expect(shaConflict.exitCode).toBe(1)
            expect(shaConflict.stderr).toContain('dataset.sha256')
            expect(shaConflict.stderr).toContain(fixture.datasetPath)
            expect(shaConflict.stderr).toContain(fixture.reportPath)

            const reportsWithMetadataShaConflict = createReports()
            reportsWithMetadataShaConflict[0] = createReport('vector', { datasetSha256: 'wrong-mode-sha' })
            await writeFile(fixture.reportPath, JSON.stringify(createReportEnvelope(reportsWithMetadataShaConflict)), 'utf8')
            const metadataShaConflict = await runMain(['--dataset', fixture.datasetPath, '--report', fixture.reportPath])
            expect(metadataShaConflict.exitCode).toBe(1)
            expect(metadataShaConflict.stderr).toContain('vector metadata.datasetSha256')
            expect(metadataShaConflict.stderr).toContain(fixture.datasetPath)
            expect(metadataShaConflict.stderr).toContain(fixture.reportPath)

            const reportsWithMissingQuery = createReports()
            reportsWithMissingQuery[1] = createReport('fulltext', { queries: reportsWithMissingQuery[1]!.queries.slice(0, 1) })
            await writeFile(fixture.reportPath, JSON.stringify(createReportEnvelope(reportsWithMissingQuery)), 'utf8')
            const queryMismatch = await runMain(['--dataset', fixture.datasetPath, '--report', fixture.reportPath])
            expect(queryMismatch.exitCode).toBe(1)
            expect(queryMismatch.stderr).toContain(fixture.datasetPath)
            expect(queryMismatch.stderr).toContain(fixture.reportPath)
            expect(queryMismatch.stderr).toContain('fulltext is missing report query for sample q-2')

            const reportsWithTopKMismatch = createReports()
            reportsWithTopKMismatch[2] = createReport('hybrid', { topK: 3 })
            await writeFile(fixture.reportPath, JSON.stringify(createReportEnvelope(reportsWithTopKMismatch)), 'utf8')
            const topKMismatch = await runMain(['--dataset', fixture.datasetPath, '--report', fixture.reportPath])
            expect(topKMismatch.exitCode).toBe(1)
            expect(topKMismatch.stderr).toContain(fixture.datasetPath)
            expect(topKMismatch.stderr).toContain(fixture.reportPath)
            expect(topKMismatch.stderr).toContain('hybrid topK 3 does not match topK 2')
        })
    })

    it('returns input errors with paths and query/chunk location for retrieved ID mismatches read through the CLI', async () => {
        await withFixture(async fixture => {
            const reports = createReports()
            const vectorQueries = reports[0]!.queries.map(query =>
                query.sampleId === 'q-1'
                    ? {
                          ...query,
                          retrievedResults: [{ chunkId: 'chunk-result-only', score: 1 }],
                      }
                    : query
            )
            reports[0] = createReport('vector', { queries: vectorQueries })
            await writeFile(fixture.reportPath, JSON.stringify(createReportEnvelope(reports)), 'utf8')

            const outcome = await runMain(['--dataset', fixture.datasetPath, '--report', fixture.reportPath])

            expect(outcome.exitCode).toBe(1)
            expect(outcome.stderr).toContain(fixture.datasetPath)
            expect(outcome.stderr).toContain(fixture.reportPath)
            expect(outcome.stderr).toContain('mode vector sample q-1')
            expect(outcome.stderr).toContain('chunk-result-only')
        })
    })

    it('cleans temporary files when an injected write fails before publication', async () => {
        await withFixture(async fixture => {
            const failingWriteFile = async (path: string, data: string, encoding: 'utf8'): Promise<void> => {
                if (path.includes('.failure-analysis.md.')) {
                    throw new Error('simulated Markdown write failure')
                }
                await writeFile(path, data, encoding)
            }

            await expect(writeFailureAnalysisReports(fixture.outputDir, fixture.result, { writeFile: failingWriteFile })).rejects.toThrow(
                'simulated Markdown write failure'
            )
            expect(await readdir(fixture.outputDir)).toEqual([])
        })
    })

    it('rolls back both outputs and restores old contents when the second publication rename fails', async () => {
        await withFixture(async fixture => {
            await mkdir(fixture.outputDir, { recursive: true })
            const jsonPath = join(fixture.outputDir, 'prometheus-global-guardian-v1.failure-analysis.json')
            const markdownPath = join(fixture.outputDir, 'prometheus-global-guardian-v1.failure-analysis.md')
            await writeFile(jsonPath, 'old-json\n', 'utf8')
            await writeFile(markdownPath, 'old-markdown\n', 'utf8')

            const failingRename = async (source: string, target: string): Promise<void> => {
                if (source.endsWith('.tmp') && target === markdownPath) {
                    throw new Error('simulated second publication rename failure')
                }
                await fsRename(source, target)
            }

            await expect(writeFailureAnalysisReports(fixture.outputDir, fixture.result, { rename: failingRename })).rejects.toThrow(
                'simulated second publication rename failure'
            )

            expect(await readFile(jsonPath, 'utf8')).toBe('old-json\n')
            expect(await readFile(markdownPath, 'utf8')).toBe('old-markdown\n')
            expect((await readdir(fixture.outputDir)).sort()).toEqual([
                'prometheus-global-guardian-v1.failure-analysis.json',
                'prometheus-global-guardian-v1.failure-analysis.md',
            ])
        })
    })

    it('reports the publication and restore errors while preserving a backup when JSON restore fails', async () => {
        await withFixture(async fixture => {
            await mkdir(fixture.outputDir, { recursive: true })
            const jsonPath = join(fixture.outputDir, 'prometheus-global-guardian-v1.failure-analysis.json')
            const markdownPath = join(fixture.outputDir, 'prometheus-global-guardian-v1.failure-analysis.md')
            await writeFile(jsonPath, 'old-json\n', 'utf8')
            await writeFile(markdownPath, 'old-markdown\n', 'utf8')

            const failingRename = async (source: string, target: string): Promise<void> => {
                if (source.endsWith('.tmp') && target === markdownPath) {
                    throw new Error('simulated second publication rename failure')
                }
                if (source.endsWith('.bak') && target === jsonPath) {
                    throw new Error('simulated JSON restore rename failure')
                }
                await fsRename(source, target)
            }

            const rejection = await writeFailureAnalysisReports(fixture.outputDir, fixture.result, { rename: failingRename }).catch(
                (error: unknown) => error
            )

            expect(rejection).toBeInstanceOf(Error)
            const message = rejection instanceof Error ? rejection.message : String(rejection)
            expect(message).toContain('simulated second publication rename failure')
            expect(message).toContain('simulated JSON restore rename failure')

            const files = (await readdir(fixture.outputDir)).sort()
            const jsonBackup = files.find(
                file => file.startsWith('prometheus-global-guardian-v1.failure-analysis.json.') && file.endsWith('.bak')
            )
            expect(jsonBackup).toBeDefined()
            expect(await readFile(join(fixture.outputDir, jsonBackup!), 'utf8')).toBe('old-json\n')
            expect(await readFile(markdownPath, 'utf8')).toBe('old-markdown\n')
        })
    })

    it('rejects when successful publication cleanup fails instead of returning success', async () => {
        await withFixture(async fixture => {
            await mkdir(fixture.outputDir, { recursive: true })
            const jsonPath = join(fixture.outputDir, 'prometheus-global-guardian-v1.failure-analysis.json')
            const markdownPath = join(fixture.outputDir, 'prometheus-global-guardian-v1.failure-analysis.md')
            await writeFile(jsonPath, 'old-json\n', 'utf8')
            await writeFile(markdownPath, 'old-markdown\n', 'utf8')

            const failingUnlink = async (path: string): Promise<void> => {
                if (path.includes('.failure-analysis.json.') && path.endsWith('.bak')) {
                    throw new Error('simulated JSON backup cleanup failure')
                }
                await fsUnlink(path)
            }

            await expect(writeFailureAnalysisReports(fixture.outputDir, fixture.result, { unlink: failingUnlink })).rejects.toThrow(
                'simulated JSON backup cleanup failure'
            )

            const files = (await readdir(fixture.outputDir)).sort()
            expect(files).toContain('prometheus-global-guardian-v1.failure-analysis.json')
            expect(files).toContain('prometheus-global-guardian-v1.failure-analysis.md')
            expect(
                files.some(file => file.startsWith('prometheus-global-guardian-v1.failure-analysis.json.') && file.endsWith('.bak'))
            ).toBe(true)
        })
    })

    it('uses safe Markdown code spans for dynamic paths and chunk IDs containing backticks', async () => {
        await withFixture(async fixture => {
            const unsafeResult = structuredClone(fixture.result)
            unsafeResult.dataset.path = 'docs/unsafe`dataset.jsonl'
            unsafeResult.baseline.path = 'docs/unsafe`baseline.report.json'
            unsafeResult.byMode.vector.queries[0]!.coveredRelevantChunkIds = ['chunk`unsafe']

            const markdown = renderFailureAnalysisMarkdown(unsafeResult)

            expect(markdown).toContain('- Dataset: ``docs/unsafe`dataset.jsonl``')
            expect(markdown).toContain('- Baseline report: ``docs/unsafe`baseline.report.json``')
            expect(markdown).toContain('- Covered relevant IDs: ``chunk`unsafe``')
        })
    })
})
