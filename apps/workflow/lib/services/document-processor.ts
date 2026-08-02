import {
    type ChunkWithVector,
    createMarkdownSplitter,
    createOllamaEmbeddingService,
    createQdrantVectorStore,
    createTextSplitter,
} from '@ai-workflow/ai-engine'

import { prisma } from '@/lib/prisma'

interface ProcessDocumentParams {
    documentId: string
    knowledgeBaseId: string
    content: string
    fileName: string
    chunkSize: number
    chunkOverlap: number
    embeddingModel: string
    dimensions: number
}

/**
 * 处理文档：切分、嵌入、存储到 Qdrant
 */
export async function processDocument(params: ProcessDocumentParams): Promise<void> {
    const { documentId, knowledgeBaseId, content, fileName, chunkSize, chunkOverlap, embeddingModel, dimensions } = params

    try {
        // 更新状态为处理中
        await prisma.document.update({
            where: { id: documentId },
            data: { status: 'PROCESSING' },
        })

        // 1. 切分文档
        const isMarkdown = fileName.endsWith('.md') || fileName.endsWith('.markdown')
        const splitter = isMarkdown ? createMarkdownSplitter({ chunkSize, chunkOverlap }) : createTextSplitter({ chunkSize, chunkOverlap })

        const chunks = splitter.split(content)

        if (chunks.length === 0) {
            throw new Error('文档内容为空或无法切分')
        }

        // 2. 生成嵌入向量
        const embeddingService = createOllamaEmbeddingService({
            model: embeddingModel,
            dimensions,
        })

        const chunkTexts = chunks.map(c => c.content)
        const embeddings = await embeddingService.embedTexts(chunkTexts)

        // 3. 存储到 Qdrant
        const vectorStore = createQdrantVectorStore({
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            collectionName: 'knowledge_chunks',
        })

        // 确保 collection 存在
        await vectorStore.ensureCollection(dimensions)

        // 准备向量数据 - 使用正确的 ChunkWithVector 格式
        const vectorChunks: ChunkWithVector[] = chunks.map((chunk, idx) => ({
            id: `${documentId}_${idx}`,
            content: chunk.content,
            index: chunk.index,
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
            documentId,
            knowledgeBaseId,
            vector: embeddings[idx],
        }))

        // 存储向量
        await vectorStore.upsertVectors(vectorChunks)

        // 4. 更新文档状态
        await prisma.document.update({
            where: { id: documentId },
            data: {
                status: 'COMPLETED',
                chunkCount: chunks.length,
                processedAt: new Date(),
            },
        })

        // 5. 更新知识库切片计数
        await prisma.knowledgeBase.update({
            where: { id: knowledgeBaseId },
            data: {
                chunkCount: { increment: chunks.length },
            },
        })
    } catch (error) {
        // 更新状态为失败
        await prisma.document.update({
            where: { id: documentId },
            data: {
                status: 'ERROR',
                errorMessage: error instanceof Error ? error.message : '处理失败',
            },
        })
        throw error
    }
}

/**
 * 删除文档的向量数据
 */
export async function deleteDocumentVectors(documentId: string): Promise<void> {
    const vectorStore = createQdrantVectorStore({
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        collectionName: 'knowledge_chunks',
    })

    await vectorStore.deleteByDocumentId(documentId)
}
