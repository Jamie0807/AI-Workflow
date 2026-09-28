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

export type JsonValue = string | number | boolean | null | JsonValue[] | { readonly [key: string]: JsonValue }

export interface EvaluationRetrievalConfig {
    threshold: number | null
    vectorWeight: number | null
    [key: string]: JsonValue
}

export type RetrievalConfig = EvaluationRetrievalConfig

export interface EvaluationMetadataContext {
    topK: number
    mode: RetrievalMode
    knowledgeBaseIds: Array<string>
    retrievalConfig: EvaluationRetrievalConfig
}

type EvaluationMetadataWithContext = EvaluationMetadataBase & EvaluationMetadataContext

export type EvaluationMetadata =
    | (EvaluationMetadataWithContext & { hashStatus: 'computed' })
    | (EvaluationMetadataWithContext & { hashStatus: 'unverified' })

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

export type RetrievalEvaluationInput = Omit<RetrievalEvaluationConfig, 'knowledgeBaseIds'>

export interface RetrievedQueryResult {
    chunkId: string
    score: number
}

export interface QueryEvaluation {
    sampleId: string
    query: string
    retrievedChunkIds: Array<string>
    retrievedResults: Array<RetrievedQueryResult>
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
