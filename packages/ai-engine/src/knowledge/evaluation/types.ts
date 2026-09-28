// cspell:ignore ndcg

import type { RetrievalMode } from '../types'

export type Relevance = 1 | 2 | 3

export interface RelevantChunk {
    chunkId: string
    relevance: Relevance
}

export interface RankingMetrics {
    precisionAtK: number
    recallAtK: number
    mrrAtK: number
    ndcgAtK: number
}

export interface EvaluationSample {
    id: string
    query: string
    knowledgeBaseId: string
    relevantChunks: Array<RelevantChunk>
}

interface EvaluationMetadataBase {
    datasetSha256: string
}

export type EvaluationMetadata =
    | (EvaluationMetadataBase & { hashStatus: 'computed' })
    | (EvaluationMetadataBase & { hashStatus: 'unverified' })

export interface EvaluationDataset {
    samples: Array<EvaluationSample>
    metadata?: EvaluationMetadata
}

export interface RetrievalEvaluationConfig {
    mode: RetrievalMode
    topK: number
    knowledgeBaseIds: Array<string>
    threshold?: number
    vectorWeight?: number
}

export interface QueryEvaluation {
    sampleId: string
    query: string
    retrievedChunkIds: Array<string>
    metrics: Record<string, number>
    latencyMs: number
}

export interface EvaluationReport {
    mode: RetrievalMode
    config: RetrievalEvaluationConfig
    sampleCount: number
    metrics: Record<string, number>
    latencyMs: {
        p50: number
        p95: number
    }
    queries: Array<QueryEvaluation>
    metadata?: EvaluationMetadata
}
