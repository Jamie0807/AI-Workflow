import type { RetrieverService } from '@ai-workflow/ai-engine'
import {
    createHybridRetriever,
    createOllamaEmbeddingService,
    createQdrantFulltextProvider,
    createQdrantVectorStore,
} from '@ai-workflow/ai-engine'
import type { Pool } from 'pg'

import type { PrismaClient } from '../app/generated/prisma/client'

export class CliConfigError extends Error {
    readonly exitCode = 2

    constructor(message: string) {
        super(message)
        this.name = 'CliConfigError'
    }
}

export interface KnowledgeBaseConfig {
    id: string
    embeddingModel: string
    embeddingProvider: string
    dimensions: number
    threshold: number
    vectorWeight: number
}

export interface EmbeddingConfigReport {
    knowledgeBaseId: string
    provider: string
    model: string
    dimensions: number
    baseUrl: string
}

export async function createEvaluationPrismaClient(): Promise<{ client: PrismaClient; pool: Pool }> {
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const { Pool: PoolConstructor } = await import('pg')
    const { PrismaClient: PrismaClientConstructor } = await import('../app/generated/prisma/client')
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:xiaoer@localhost:5433/postgres'
    const pool = new PoolConstructor({ connectionString })

    try {
        const adapter = new PrismaPg(pool)
        const client = new PrismaClientConstructor({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        })

        return { client, pool }
    } catch (error) {
        await pool.end().catch(() => undefined)
        throw error
    }
}

export async function loadKnowledgeBases(client: PrismaClient, ids: readonly string[]): Promise<KnowledgeBaseConfig[]> {
    const knowledgeBases = (await client.knowledgeBase.findMany({
        where: { id: { in: [...ids] } },
        select: {
            id: true,
            embeddingModel: true,
            embeddingProvider: true,
            dimensions: true,
            threshold: true,
            vectorWeight: true,
        },
    })) as KnowledgeBaseConfig[]

    const foundIds = new Set(knowledgeBases.map(knowledgeBase => knowledgeBase.id))
    const missingId = ids.find(id => !foundIds.has(id))
    if (missingId) {
        throw new CliConfigError(`Knowledge Base not found: ${missingId}`)
    }

    return knowledgeBases
}

export function createRetrieverMap(knowledgeBases: readonly KnowledgeBaseConfig[]): {
    retrievers: Map<string, RetrieverService>
    embeddings: EmbeddingConfigReport[]
} {
    const retrievers = new Map<string, RetrieverService>()
    const embeddings: EmbeddingConfigReport[] = []
    const baseUrl = process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434'
    const qdrantUrl = process.env.QDRANT_URL?.trim() || 'http://localhost:6333'

    for (const knowledgeBase of knowledgeBases) {
        if (knowledgeBase.embeddingProvider.toLowerCase() !== 'ollama') {
            throw new CliConfigError(
                `Unsupported embedding provider for Knowledge Base ${knowledgeBase.id}: ${knowledgeBase.embeddingProvider}`
            )
        }

        const embeddingService = createOllamaEmbeddingService({
            model: knowledgeBase.embeddingModel,
            dimensions: knowledgeBase.dimensions,
            baseUrl,
        })
        const vectorStore = createQdrantVectorStore({
            url: qdrantUrl,
            collectionName: 'knowledge_chunks',
        })
        const fulltextProvider = createQdrantFulltextProvider(vectorStore)
        retrievers.set(knowledgeBase.id, createHybridRetriever(embeddingService, vectorStore, fulltextProvider))
        embeddings.push({
            knowledgeBaseId: knowledgeBase.id,
            provider: knowledgeBase.embeddingProvider,
            model: knowledgeBase.embeddingModel,
            dimensions: knowledgeBase.dimensions,
            baseUrl,
        })
    }

    return { retrievers, embeddings }
}

export function createDatasetRetriever(retrievers: Map<string, RetrieverService>): RetrieverService {
    return {
        async retrieve(options) {
            const knowledgeBaseId = options.knowledgeBaseIds[0]
            if (!knowledgeBaseId) {
                throw new Error('Evaluation query did not specify a knowledge base ID')
            }

            const retriever = retrievers.get(knowledgeBaseId)
            if (!retriever) {
                throw new Error(`No retriever configured for Knowledge Base ${knowledgeBaseId}`)
            }

            return retriever.retrieve(options)
        },
    }
}
