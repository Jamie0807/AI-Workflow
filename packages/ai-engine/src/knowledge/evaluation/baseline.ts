// cspell:ignore ndcg

import type { EvaluationMetadata, EvaluationMetadataContext, EvaluationReport, JsonValue, RankingMetrics } from './types'

export type MetricTolerances = {
    [Metric in keyof RankingMetrics]: number
}

export interface BaselineComparison {
    compatible: boolean
    passed: boolean
    deltas: RankingMetrics
    reasons: Array<string>
}

const QUALITY_METRICS: Array<keyof RankingMetrics> = ['precisionAtK', 'recallAtK', 'mrrAtK', 'ndcgAtK']

const DEFAULT_TOLERANCES: MetricTolerances = {
    precisionAtK: 0,
    recallAtK: 0,
    mrrAtK: 0,
    ndcgAtK: 0,
}

function stableSerialize(value: JsonValue): string {
    if (Array.isArray(value)) {
        return `[${value.map(item => stableSerialize(item)).join(',')}]`
    }

    if (typeof value === 'object' && value !== null) {
        return `{${Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
            .join(',')}}`
    }

    return JSON.stringify(value)
}

function isRetrievalConfig(value: unknown): value is EvaluationMetadataContext['retrievalConfig'] {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false
    }

    const config = value as Record<string, unknown>
    return (
        (config.threshold === null || typeof config.threshold === 'number') &&
        (config.vectorWeight === null || typeof config.vectorWeight === 'number') &&
        Object.values(config).every(item => isJsonValue(item))
    )
}

function isJsonValue(value: unknown): value is JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return true
    }
    if (typeof value === 'number') {
        return Number.isFinite(value)
    }
    if (Array.isArray(value)) {
        return value.every(item => isJsonValue(item))
    }
    if (typeof value === 'object') {
        return Object.values(value).every(item => isJsonValue(item))
    }
    return false
}

function getComparableMetadata(
    metadata: EvaluationMetadata | undefined
): (EvaluationMetadataContext & { datasetSha256: string }) | undefined {
    if (
        metadata === undefined ||
        !('topK' in metadata) ||
        !('mode' in metadata) ||
        !('knowledgeBaseIds' in metadata) ||
        !('retrievalConfig' in metadata) ||
        typeof metadata.topK !== 'number' ||
        !['vector', 'fulltext', 'hybrid'].includes(metadata.mode) ||
        !Array.isArray(metadata.knowledgeBaseIds) ||
        !metadata.knowledgeBaseIds.every(item => typeof item === 'string') ||
        !isRetrievalConfig(metadata.retrievalConfig)
    ) {
        return undefined
    }

    return {
        datasetSha256: metadata.datasetSha256,
        topK: metadata.topK,
        mode: metadata.mode,
        knowledgeBaseIds: metadata.knowledgeBaseIds,
        retrievalConfig: metadata.retrievalConfig,
    }
}

function compareMetadata(current: EvaluationReport, baseline: EvaluationReport): Array<string> {
    const currentMetadata = getComparableMetadata(current.metadata)
    const baselineMetadata = getComparableMetadata(baseline.metadata)
    const reasons: Array<string> = []

    if (currentMetadata === undefined) {
        reasons.push('current metadata is missing comparison context')
    }
    if (baselineMetadata === undefined) {
        reasons.push('baseline metadata is missing comparison context')
    }
    if (currentMetadata === undefined || baselineMetadata === undefined) {
        return reasons
    }

    const comparableFields: Array<keyof typeof currentMetadata> = ['datasetSha256', 'topK', 'mode', 'knowledgeBaseIds', 'retrievalConfig']

    for (const field of comparableFields) {
        const currentValue = currentMetadata[field] as JsonValue
        const baselineValue = baselineMetadata[field] as JsonValue
        if (stableSerialize(currentValue) !== stableSerialize(baselineValue)) {
            reasons.push(`metadata.${field} differs`)
        }
    }

    return reasons
}

function calculateDelta(current: number, baseline: number): number {
    return Number((current - baseline).toFixed(12))
}

export function compareWithBaseline(
    current: EvaluationReport,
    baseline: EvaluationReport,
    tolerances: Partial<MetricTolerances> = {}
): BaselineComparison {
    const deltas = QUALITY_METRICS.reduce<RankingMetrics>(
        (result, metric) => {
            result[metric] = calculateDelta(current.metrics[metric], baseline.metrics[metric])
            return result
        },
        {
            precisionAtK: 0,
            recallAtK: 0,
            mrrAtK: 0,
            ndcgAtK: 0,
        }
    )
    const metadataReasons = compareMetadata(current, baseline)
    const effectiveTolerances = { ...DEFAULT_TOLERANCES, ...tolerances }
    const regressionReasons: Array<string> = []

    for (const metric of QUALITY_METRICS) {
        if (deltas[metric] < -effectiveTolerances[metric]) {
            regressionReasons.push(`${metric} decreased beyond tolerance`)
        }
    }

    const compatible = metadataReasons.length === 0
    return {
        compatible,
        passed: compatible && regressionReasons.length === 0,
        deltas,
        reasons: [...metadataReasons, ...regressionReasons],
    }
}
