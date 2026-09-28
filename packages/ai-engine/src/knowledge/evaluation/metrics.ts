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

export function aggregateRankingMetrics(metrics: readonly RankingMetrics[]): RankingMetrics {
    if (metrics.length === 0) {
        throw new Error('metrics must not be empty')
    }

    let precisionAtK = 0
    let recallAtK = 0
    let mrrAtK = 0
    let ndcgAtK = 0

    for (const metric of metrics) {
        precisionAtK += metric.precisionAtK
        recallAtK += metric.recallAtK
        mrrAtK += metric.mrrAtK
        ndcgAtK += metric.ndcgAtK
    }

    return {
        precisionAtK: precisionAtK / metrics.length,
        recallAtK: recallAtK / metrics.length,
        mrrAtK: mrrAtK / metrics.length,
        ndcgAtK: ndcgAtK / metrics.length,
    }
}
