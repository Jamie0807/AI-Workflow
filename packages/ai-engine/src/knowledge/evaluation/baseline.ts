// cspell:ignore ndcg

import type { EvaluationMetadataContext, EvaluationReport, JsonValue, RankingMetrics } from './types'

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

type ComparableMetadata = EvaluationMetadataContext & { datasetSha256: string }

interface ValidationResult<T> {
    value: T | undefined
    reasons: Array<string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPlainObject(value: object): boolean {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function isPositiveInteger(value: unknown): value is number {
    return isFiniteNumber(value) && Number.isInteger(value) && value > 0
}

function isRetrievalMode(value: unknown): value is EvaluationMetadataContext['mode'] {
    return value === 'vector' || value === 'fulltext' || value === 'hybrid'
}

function isHashStatus(value: unknown): value is 'computed' | 'unverified' {
    return value === 'computed' || value === 'unverified'
}

function isNonEmptyStringArray(value: unknown): value is Array<string> {
    return Array.isArray(value) && value.length > 0 && value.every(item => isNonEmptyString(item))
}

function isJsonValue(value: unknown, ancestors: WeakSet<object> = new WeakSet<object>()): value is JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return true
    }
    if (typeof value === 'number') {
        return Number.isFinite(value)
    }
    if (typeof value !== 'object' || ancestors.has(value)) {
        return false
    }

    ancestors.add(value)
    const valid = Array.isArray(value)
        ? value.every(item => isJsonValue(item, ancestors))
        : isPlainObject(value) && Object.values(value).every(item => isJsonValue(item, ancestors))
    ancestors.delete(value)

    return valid
}

function isJsonObject(value: unknown): value is { readonly [key: string]: JsonValue } {
    return isRecord(value) && isPlainObject(value) && isJsonValue(value)
}

function isRetrievalConfig(value: unknown): value is EvaluationMetadataContext['retrievalConfig'] {
    if (!isJsonObject(value)) {
        return false
    }

    return (
        (value.threshold === null || isFiniteNumber(value.threshold)) && (value.vectorWeight === null || isFiniteNumber(value.vectorWeight))
    )
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

function getComparableMetadata(metadata: unknown, label: string): ValidationResult<ComparableMetadata> {
    if (metadata === undefined) {
        return {
            value: undefined,
            reasons: [`${label} metadata is missing comparison context`],
        }
    }

    if (!isRecord(metadata) || Object.keys(metadata).length === 0) {
        return {
            value: undefined,
            reasons: [`${label} metadata is malformed: expected a non-empty object`],
        }
    }

    const datasetSha256 = metadata.datasetSha256
    if (!isNonEmptyString(datasetSha256)) {
        return {
            value: undefined,
            reasons: [`${label} metadata is malformed: datasetSha256 must be a non-empty string`],
        }
    }

    if (!isHashStatus(metadata.hashStatus)) {
        return {
            value: undefined,
            reasons: [`${label} metadata is malformed: hashStatus must be computed or unverified`],
        }
    }

    const topK = metadata.topK
    if (!isPositiveInteger(topK)) {
        return {
            value: undefined,
            reasons: [`${label} metadata is malformed: topK must be a positive integer`],
        }
    }

    const mode = metadata.mode
    if (!isRetrievalMode(mode)) {
        return {
            value: undefined,
            reasons: [`${label} metadata is malformed: mode must be vector, fulltext, or hybrid`],
        }
    }

    const knowledgeBaseIds = metadata.knowledgeBaseIds
    if (!isNonEmptyStringArray(knowledgeBaseIds)) {
        return {
            value: undefined,
            reasons: [`${label} metadata is malformed: knowledgeBaseIds must be a non-empty string array`],
        }
    }

    const retrievalConfig = metadata.retrievalConfig
    if (!isRetrievalConfig(retrievalConfig)) {
        return {
            value: undefined,
            reasons: [`${label} metadata is malformed: retrievalConfig must be a JSON-safe object`],
        }
    }

    return {
        value: {
            datasetSha256,
            topK,
            mode,
            knowledgeBaseIds,
            retrievalConfig,
        },
        reasons: [],
    }
}

function isRankingMetrics(value: unknown): value is RankingMetrics {
    return isRecord(value) && QUALITY_METRICS.every(metric => isFiniteNumber(value[metric]))
}

function getValidatedMetrics(report: unknown, label: string): ValidationResult<RankingMetrics> {
    if (!isRecord(report)) {
        return {
            value: undefined,
            reasons: [`${label} report is malformed: expected an object`],
        }
    }

    const metrics = report.metrics
    if (!isRecord(metrics)) {
        return {
            value: undefined,
            reasons: [`${label} metrics are malformed: expected an object`],
        }
    }

    const reasons: Array<string> = []
    for (const metric of QUALITY_METRICS) {
        if (!(metric in metrics)) {
            reasons.push(`${label} metrics missing metric: ${metric}`)
        } else if (!isFiniteNumber(metrics[metric])) {
            reasons.push(`${label} metrics malformed metric: ${metric} must be a finite number`)
        }
    }

    if (reasons.length > 0 || !isRankingMetrics(metrics)) {
        return {
            value: undefined,
            reasons: reasons.length > 0 ? reasons : [`${label} metrics are malformed`],
        }
    }

    return {
        value: metrics,
        reasons: [],
    }
}

function getReportField(report: unknown, field: 'metadata' | 'metrics'): unknown {
    return isRecord(report) ? report[field] : undefined
}

function createEmptyDeltas(): RankingMetrics {
    return {
        precisionAtK: 0,
        recallAtK: 0,
        mrrAtK: 0,
        ndcgAtK: 0,
    }
}

function calculateDelta(current: number, baseline: number): number {
    return current - baseline
}

export function compareWithBaseline(
    current: EvaluationReport,
    baseline: EvaluationReport,
    tolerances: Partial<MetricTolerances> = {}
): BaselineComparison {
    try {
        const currentMetadata = getComparableMetadata(getReportField(current, 'metadata'), 'current')
        const baselineMetadata = getComparableMetadata(getReportField(baseline, 'metadata'), 'baseline')
        const currentMetrics = getValidatedMetrics(current, 'current')
        const baselineMetrics = getValidatedMetrics(baseline, 'baseline')
        const metadataReasons = [...currentMetadata.reasons, ...baselineMetadata.reasons]
        const metricReasons = [...currentMetrics.reasons, ...baselineMetrics.reasons]
        const regressionReasons: Array<string> = []
        const deltas = createEmptyDeltas()
        const effectiveTolerances = { ...DEFAULT_TOLERANCES, ...tolerances }

        if (currentMetadata.value !== undefined && baselineMetadata.value !== undefined) {
            const comparableFields: Array<keyof ComparableMetadata> = [
                'datasetSha256',
                'topK',
                'mode',
                'knowledgeBaseIds',
                'retrievalConfig',
            ]

            for (const field of comparableFields) {
                const currentValue = currentMetadata.value[field]
                const baselineValue = baselineMetadata.value[field]
                if (stableSerialize(currentValue) !== stableSerialize(baselineValue)) {
                    metadataReasons.push(`metadata.${field} differs`)
                }
            }
        }

        if (currentMetrics.value !== undefined && baselineMetrics.value !== undefined) {
            for (const metric of QUALITY_METRICS) {
                deltas[metric] = calculateDelta(currentMetrics.value[metric], baselineMetrics.value[metric])
                if (deltas[metric] < -effectiveTolerances[metric]) {
                    regressionReasons.push(`${metric} decreased beyond tolerance`)
                }
            }
        }

        const compatible = metadataReasons.length === 0 && metricReasons.length === 0
        return {
            compatible,
            passed: compatible && regressionReasons.length === 0,
            deltas,
            reasons: [...metadataReasons, ...metricReasons, ...regressionReasons],
        }
    } catch {
        return {
            compatible: false,
            passed: false,
            deltas: createEmptyDeltas(),
            reasons: ['comparison input is malformed: unable to validate report'],
        }
    }
}
