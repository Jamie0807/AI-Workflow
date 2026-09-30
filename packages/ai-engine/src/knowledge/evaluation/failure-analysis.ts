// cspell:ignore ndcg

import type { RetrievalMode } from '../types'
import type { EvaluationDataset, EvaluationReport, EvaluationSample, RankingMetrics, RetrievedQueryResult } from './types'

export const FAILURE_ANALYSIS_MODES = ['vector', 'fulltext', 'hybrid'] as const satisfies readonly RetrievalMode[]
export type FailureAnalysisMode = (typeof FAILURE_ANALYSIS_MODES)[number]
export type CoverageStatus = 'complete' | 'partial' | 'zero'

export interface FailureAnalysisInput {
    dataset: EvaluationDataset
    datasetSha256: string
    datasetPath: string
    reportPath: string
    gitRevision: string
    generatedAt: string
    reports: readonly EvaluationReport[]
}

export interface QueryFailureAnalysis {
    sampleId: string
    query: string
    relevantChunkCount: number
    coveredRelevantChunkCount: number
    coverage: number
    coveredRelevantChunkIds: string[]
    missedRelevantChunkIds: string[]
    falsePositiveChunkIds: string[]
    maxRetrievedRelevance: 0 | 1 | 2 | 3
    coverageStatus: CoverageStatus
    missedCoreChunkIds: string[]
    backgroundOnly: boolean
    metrics: RankingMetrics
    latencyMs: number
}

export interface ModeFailureSummary {
    queryCount: number
    completeCoverageCount: number
    partialCoverageCount: number
    zeroCoverageCount: number
    backgroundOnlyCount: number
    falsePositiveCount: number
    averageFalsePositivePerQuery: number
    mostMissedRelevantChunks: Array<{ chunkId: string; missedCount: number }>
}

export interface ModeFailureAnalysis {
    mode: FailureAnalysisMode
    topK: number
    metrics: RankingMetrics
    latencyMs: { p50: number; p95: number }
    summary: ModeFailureSummary
    queries: QueryFailureAnalysis[]
}

export interface QueryModeComparison {
    sampleId: string
    modes: Record<
        FailureAnalysisMode,
        {
            metrics: RankingMetrics
            latencyMs: number
            coveredRelevantChunkIds: string[]
            missedRelevantChunkIds: string[]
            uniqueCoveredRelevantChunkIds: string[]
            uniqueMissedRelevantChunkIds: string[]
        }
    >
    recommendedFocusMode: FailureAnalysisMode
}

export interface FailureAnalysisResult {
    generatedAt: string
    gitRevision: string
    dataset: { path: string; sha256: string; sampleCount: number }
    baseline: { path: string }
    modes: FailureAnalysisMode[]
    topK: number
    byMode: Record<FailureAnalysisMode, ModeFailureAnalysis>
    queryComparisons: QueryModeComparison[]
    priorityFailures: Array<{
        sampleId: string
        query: string
        recommendedFocusMode: FailureAnalysisMode
        nDCG: number
        recall: number
        falsePositiveCount: number
    }>
}

const RANKING_METRICS: readonly (keyof RankingMetrics)[] = ['precisionAtK', 'recallAtK', 'mrrAtK', 'ndcgAtK']

function isFailureAnalysisMode(value: unknown): value is FailureAnalysisMode {
    return FAILURE_ANALYSIS_MODES.includes(value as FailureAnalysisMode)
}

function findDuplicates(values: readonly string[]): string[] {
    const seen = new Set<string>()
    const duplicates = new Set<string>()

    for (const value of values) {
        if (seen.has(value)) {
            duplicates.add(value)
        } else {
            seen.add(value)
        }
    }

    return [...duplicates]
}

function getMetricErrors(mode: string, label: string, metrics: Record<string, number>): string[] {
    return RANKING_METRICS.flatMap(metric => {
        const value = metrics[metric]
        return typeof value === 'number' && Number.isFinite(value) ? [] : [`mode ${mode} ${label} metric ${metric} must be a finite number`]
    })
}

function getSetDifference(left: readonly string[], right: readonly string[]): string[] {
    const rightSet = new Set(right)
    return [...new Set(left)].filter(value => !rightSet.has(value))
}

function validateRetrievedResultIds(mode: string, querySampleId: string, query: EvaluationReport['queries'][number]): string[] {
    const errors: string[] = []
    const retrievedIds = query.retrievedChunkIds
    const retrievedResultIds = query.retrievedResults.map((result: RetrievedQueryResult) => result.chunkId)

    for (const chunkId of findDuplicates(retrievedIds)) {
        errors.push(`mode ${mode} sample ${querySampleId} has duplicate retrieved chunk ID ${chunkId}`)
    }

    for (const chunkId of findDuplicates(retrievedResultIds)) {
        errors.push(`mode ${mode} sample ${querySampleId} has duplicate retrieved result chunk ID ${chunkId}`)
    }

    const differentIds = [
        ...new Set([...getSetDifference(retrievedIds, retrievedResultIds), ...getSetDifference(retrievedResultIds, retrievedIds)]),
    ]
    for (const chunkId of differentIds) {
        errors.push(`mode ${mode} sample ${querySampleId} retrieved chunk IDs do not match retrieved result chunk ID ${chunkId}`)
    }

    return errors
}

export function validateModeFailureInput(dataset: EvaluationDataset, report: EvaluationReport): string[] {
    const mode = String(report.mode)
    const errors: string[] = []

    if (!isFailureAnalysisMode(report.mode)) {
        errors.push(`mode ${mode} is not supported`)
    }

    if (report.config.mode !== report.mode) {
        errors.push(`mode ${mode} does not match report config mode ${String(report.config.mode)}`)
    }

    if (report.metadata !== undefined && report.metadata.mode !== report.mode) {
        errors.push(`mode ${mode} does not match metadata mode ${String(report.metadata.mode)}`)
    }

    if (!Number.isInteger(report.config.topK) || report.config.topK <= 0) {
        errors.push(`mode ${mode} topK must be a positive integer`)
    }

    errors.push(...getMetricErrors(mode, 'report', report.metrics))

    const samplesById = new Map<string, EvaluationSample>()
    for (const sample of dataset.samples) {
        if (samplesById.has(sample.id)) {
            errors.push(`mode ${mode} has duplicate dataset sample ID ${sample.id}`)
        } else {
            samplesById.set(sample.id, sample)
        }

        if (sample.relevantChunks.length === 0) {
            errors.push(`mode ${mode} sample ${sample.id} must have at least one relevant chunk`)
        }

        const relevantChunkIds = sample.relevantChunks.map(chunk => chunk.chunkId)
        for (const chunkId of findDuplicates(relevantChunkIds)) {
            errors.push(`mode ${mode} sample ${sample.id} has duplicate relevant chunk ID ${chunkId}`)
        }
    }

    const queriesBySampleId = new Map<string, EvaluationReport['queries'][number]>()
    for (const query of report.queries) {
        if (queriesBySampleId.has(query.sampleId)) {
            errors.push(`mode ${mode} has duplicate report query sample ID ${query.sampleId}`)
        } else {
            queriesBySampleId.set(query.sampleId, query)
        }

        if (!samplesById.has(query.sampleId)) {
            errors.push(`mode ${mode} report query sample ID ${query.sampleId} does not match the dataset`)
        }

        errors.push(...getMetricErrors(mode, `sample ${query.sampleId}`, query.metrics))
        errors.push(...validateRetrievedResultIds(mode, query.sampleId, query))
    }

    for (const sample of dataset.samples) {
        if (!queriesBySampleId.has(sample.id)) {
            errors.push(`mode ${mode} is missing report query for sample ${sample.id}`)
        }
    }

    return errors
}

function toRankingMetrics(metrics: Record<string, number>): RankingMetrics {
    return {
        precisionAtK: metrics.precisionAtK,
        recallAtK: metrics.recallAtK,
        mrrAtK: metrics.mrrAtK,
        ndcgAtK: metrics.ndcgAtK,
    }
}

function compareChunkIds(left: { chunkId: string; missedCount: number }, right: { chunkId: string; missedCount: number }): number {
    return right.missedCount - left.missedCount || (left.chunkId < right.chunkId ? -1 : left.chunkId > right.chunkId ? 1 : 0)
}

function createSummary(queries: readonly QueryFailureAnalysis[]): ModeFailureSummary {
    const missedCounts = new Map<string, number>()
    let completeCoverageCount = 0
    let partialCoverageCount = 0
    let zeroCoverageCount = 0
    let backgroundOnlyCount = 0
    let falsePositiveCount = 0

    for (const query of queries) {
        switch (query.coverageStatus) {
            case 'complete':
                completeCoverageCount += 1
                break
            case 'partial':
                partialCoverageCount += 1
                break
            case 'zero':
                zeroCoverageCount += 1
                break
        }

        if (query.backgroundOnly) {
            backgroundOnlyCount += 1
        }

        falsePositiveCount += query.falsePositiveChunkIds.length
        for (const chunkId of query.missedRelevantChunkIds) {
            missedCounts.set(chunkId, (missedCounts.get(chunkId) ?? 0) + 1)
        }
    }

    return {
        queryCount: queries.length,
        completeCoverageCount,
        partialCoverageCount,
        zeroCoverageCount,
        backgroundOnlyCount,
        falsePositiveCount,
        averageFalsePositivePerQuery: queries.length === 0 ? 0 : falsePositiveCount / queries.length,
        mostMissedRelevantChunks: [...missedCounts.entries()]
            .map(([chunkId, missedCount]) => ({ chunkId, missedCount }))
            .sort(compareChunkIds),
    }
}

function createQueryFailureAnalysis(
    sample: EvaluationSample,
    query: EvaluationReport['queries'][number],
    topK: number
): QueryFailureAnalysis {
    const relevantIds = sample.relevantChunks.map(item => item.chunkId)
    const relevanceByChunkId = new Map(sample.relevantChunks.map(item => [item.chunkId, item.relevance]))
    const retrievedIds = query.retrievedChunkIds.slice(0, topK)
    const coveredRelevantChunkIds = retrievedIds.filter(chunkId => relevanceByChunkId.has(chunkId))
    const missedRelevantChunkIds = relevantIds.filter(chunkId => !coveredRelevantChunkIds.includes(chunkId))
    const falsePositiveChunkIds = retrievedIds.filter(chunkId => !relevanceByChunkId.has(chunkId))
    const retrievedRelevances = retrievedIds.map(chunkId => relevanceByChunkId.get(chunkId) ?? 0)
    const maxRetrievedRelevance = Math.max(0, ...retrievedRelevances) as 0 | 1 | 2 | 3
    const coverage = coveredRelevantChunkIds.length / relevantIds.length
    const coverageStatus: CoverageStatus = coverage === 1 ? 'complete' : coverage === 0 ? 'zero' : 'partial'
    const missedCoreChunkIds = sample.relevantChunks
        .filter(item => item.relevance >= 2 && !coveredRelevantChunkIds.includes(item.chunkId))
        .map(item => item.chunkId)
    const backgroundOnly =
        coveredRelevantChunkIds.length > 0 &&
        coveredRelevantChunkIds.every(chunkId => {
            return (relevanceByChunkId.get(chunkId) ?? 0) === 1
        })

    return {
        sampleId: query.sampleId,
        query: query.query,
        relevantChunkCount: relevantIds.length,
        coveredRelevantChunkCount: coveredRelevantChunkIds.length,
        coverage,
        coveredRelevantChunkIds,
        missedRelevantChunkIds,
        falsePositiveChunkIds,
        maxRetrievedRelevance,
        coverageStatus,
        missedCoreChunkIds,
        backgroundOnly,
        metrics: toRankingMetrics(query.metrics),
        latencyMs: query.latencyMs,
    }
}

export function analyzeModeFailure(dataset: EvaluationDataset, report: EvaluationReport): ModeFailureAnalysis {
    const errors = validateModeFailureInput(dataset, report)
    if (errors.length > 0) {
        throw new Error(`Invalid mode failure analysis input:\n${errors.join('\n')}`)
    }

    const samplesById = new Map(dataset.samples.map(sample => [sample.id, sample]))
    const queries = report.queries.map(query => {
        const sample = samplesById.get(query.sampleId)
        if (sample === undefined) {
            throw new Error(`Invalid mode failure analysis input: missing dataset sample ${query.sampleId}`)
        }

        return createQueryFailureAnalysis(sample, query, report.config.topK)
    })

    return {
        mode: report.mode,
        topK: report.config.topK,
        metrics: toRankingMetrics(report.metrics),
        latencyMs: { ...report.latencyMs },
        summary: createSummary(queries),
        queries,
    }
}
