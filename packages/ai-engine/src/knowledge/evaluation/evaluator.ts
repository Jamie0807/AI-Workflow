import type { RetrievalResult, RetrieverService } from '../types'
import { aggregateRankingMetrics, calculateRankingMetrics } from './metrics'
import type {
    EvaluationDataset,
    EvaluationReport,
    QueryEvaluation,
    RankingMetrics,
    RetrievalEvaluationConfig,
    RetrievalEvaluationInput,
} from './types'

export interface EvaluationDependencies {
    now?: () => number
}

const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const asMetricRecord = (metrics: RankingMetrics): Record<string, number> => ({ ...metrics })

function calculatePercentile(values: readonly number[], percentile: number): number {
    if (values.length === 0) {
        throw new Error('latencies must not be empty')
    }

    const sortedValues = [...values].sort((left, right) => left - right)
    const rank = Math.min(sortedValues.length, Math.max(1, Math.ceil(percentile * sortedValues.length)))
    return sortedValues[rank - 1] ?? 0
}

function createReportConfig(
    dataset: EvaluationDataset,
    config: RetrievalEvaluationInput | RetrievalEvaluationConfig
): RetrievalEvaluationConfig {
    const knowledgeBaseIds = [...new Set(dataset.samples.map(sample => sample.knowledgeBaseId))]
    const reportConfig: RetrievalEvaluationConfig = {
        mode: config.mode,
        topK: config.topK,
        knowledgeBaseIds,
    }

    if (config.threshold !== undefined) {
        reportConfig.threshold = config.threshold
    }
    if (config.vectorWeight !== undefined) {
        reportConfig.vectorWeight = config.vectorWeight
    }

    return reportConfig
}

function createRetrievedResults(results: readonly RetrievalResult[]) {
    return results.map(result => ({ chunkId: result.chunkId, score: result.score }))
}

export async function evaluateRetrievalDataset(
    retriever: RetrieverService,
    dataset: EvaluationDataset,
    config: RetrievalEvaluationInput | RetrievalEvaluationConfig,
    dependencies: EvaluationDependencies = {}
): Promise<EvaluationReport> {
    if (dataset.samples.length === 0) {
        throw new Error('evaluation dataset must not be empty')
    }

    const now = dependencies.now ?? (() => performance.now())
    const queries: Array<QueryEvaluation> = []
    const rankingMetrics: Array<RankingMetrics> = []
    const latencies: Array<number> = []

    for (const sample of dataset.samples) {
        const startedAt = now()
        let results: RetrievalResult[]
        try {
            results = await retriever.retrieve({
                query: sample.query,
                knowledgeBaseIds: [sample.knowledgeBaseId],
                mode: config.mode,
                topK: config.topK,
                threshold: config.threshold,
                vectorWeight: config.vectorWeight,
            })
        } catch (error: unknown) {
            throw new Error(`Evaluation failed for sample ${sample.id}: ${getErrorMessage(error)}`)
        }
        const latencyMs = now() - startedAt
        const retrievedChunkIds = results.map(result => result.chunkId)
        const metrics = calculateRankingMetrics(retrievedChunkIds, sample.relevantChunks, config.topK)

        rankingMetrics.push(metrics)
        latencies.push(latencyMs)
        queries.push({
            sampleId: sample.id,
            query: sample.query,
            retrievedChunkIds,
            retrievedResults: createRetrievedResults(results),
            metrics: asMetricRecord(metrics),
            latencyMs,
        })
    }

    const reportConfig = createReportConfig(dataset, config)
    return {
        mode: config.mode,
        config: reportConfig,
        sampleCount: dataset.samples.length,
        metrics: asMetricRecord(aggregateRankingMetrics(rankingMetrics)),
        latencyMs: {
            p50: calculatePercentile(latencies, 0.5),
            p95: calculatePercentile(latencies, 0.95),
        },
        queries,
        metadata: dataset.metadata,
    }
}
