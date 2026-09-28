// cspell:ignore ndcg idcg

import type { RankingMetrics, RelevantChunk } from './types'

const gain = (relevance: number): number => 2 ** relevance - 1
const discount = (rank: number): number => 1 / Math.log2(rank + 1)

function validateK(k: number): void {
    if (!Number.isInteger(k) || k <= 0) {
        throw new Error('k must be a positive integer')
    }
}

function createRelevanceByChunkId(relevantChunks: readonly RelevantChunk[]): Map<string, number> {
    if (relevantChunks.length === 0) {
        throw new Error('relevantChunks must not be empty')
    }

    const relevanceByChunkId = new Map<string, number>()
    for (const relevantChunk of relevantChunks) {
        relevanceByChunkId.set(relevantChunk.chunkId, relevantChunk.relevance)
    }

    return relevanceByChunkId
}

export function calculateRankingMetrics(
    retrievedChunkIds: readonly string[],
    relevantChunks: readonly RelevantChunk[],
    k: number
): RankingMetrics {
    validateK(k)
    const relevanceByChunkId = createRelevanceByChunkId(relevantChunks)
    const uniqueRetrievedChunkIds = [...new Set(retrievedChunkIds)]
    const topKChunkIds = uniqueRetrievedChunkIds.slice(0, k)

    let relevantRetrievedCount = 0
    let firstRelevantRank = 0
    let dcgAtK = 0

    for (const [index, chunkId] of topKChunkIds.entries()) {
        const relevance = relevanceByChunkId.get(chunkId)
        if (relevance === undefined) {
            continue
        }

        relevantRetrievedCount += 1
        if (firstRelevantRank === 0) {
            firstRelevantRank = index + 1
        }
        dcgAtK += gain(relevance) * discount(index + 1)
    }

    const idealRelevances = [...relevanceByChunkId.values()].sort((left, right) => right - left).slice(0, k)
    let idcgAtK = 0
    for (const [index, relevance] of idealRelevances.entries()) {
        idcgAtK += gain(relevance) * discount(index + 1)
    }

    return {
        precisionAtK: relevantRetrievedCount / k,
        recallAtK: relevantRetrievedCount / relevanceByChunkId.size,
        mrrAtK: firstRelevantRank === 0 ? 0 : 1 / firstRelevantRank,
        ndcgAtK: idcgAtK > 0 ? dcgAtK / idcgAtK : 0,
    }
}

function calculateStableAverage(metrics: readonly RankingMetrics[], field: keyof RankingMetrics): number {
    let scale = 0
    let scaledSum = 0

    for (const metric of metrics) {
        const value = metric[field]
        if (!Number.isFinite(value)) {
            throw new Error(`metric ${field} must be finite`)
        }

        const magnitude = Math.abs(value)
        if (magnitude > scale) {
            scaledSum = scale === 0 ? value / magnitude : scaledSum * (scale / magnitude) + value / magnitude
            scale = magnitude
        } else if (scale > 0) {
            scaledSum += value / scale
        }
    }

    const average = scale === 0 ? 0 : (scale / metrics.length) * scaledSum
    if (!Number.isFinite(average)) {
        throw new Error(`aggregated ${field} must be finite`)
    }

    return average
}

export function aggregateRankingMetrics(metrics: readonly RankingMetrics[]): RankingMetrics {
    if (metrics.length === 0) {
        throw new Error('metrics must not be empty')
    }

    return {
        precisionAtK: calculateStableAverage(metrics, 'precisionAtK'),
        recallAtK: calculateStableAverage(metrics, 'recallAtK'),
        mrrAtK: calculateStableAverage(metrics, 'mrrAtK'),
        ndcgAtK: calculateStableAverage(metrics, 'ndcgAtK'),
    }
}
