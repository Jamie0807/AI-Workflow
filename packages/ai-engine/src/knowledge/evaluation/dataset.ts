import type { EvaluationDataset, EvaluationSample, Relevance, RelevantChunk } from './types'

const ALLOWED_RELEVANCES = [1, 2, 3] as const satisfies readonly Relevance[]

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isRelevance(value: unknown): value is Relevance {
    return isPositiveInteger(value) && ALLOWED_RELEVANCES.some(relevance => relevance === value)
}

function invalidSample(lineNumber: number, reason: string): never {
    throw new Error(`Invalid evaluation sample at line ${lineNumber}: ${reason}`)
}

function requiredString(value: unknown, fieldName: string, lineNumber: number): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        invalidSample(lineNumber, `${fieldName} must be a non-empty string`)
    }

    return value
}

function parseRelevantChunks(value: unknown, lineNumber: number): Array<RelevantChunk> {
    if (!Array.isArray(value) || value.length === 0) {
        invalidSample(lineNumber, 'relevantChunks must be a non-empty array')
    }

    const chunkIds = new Set<string>()
    const relevantChunks: Array<RelevantChunk> = []

    for (const [chunkIndex, chunkValue] of value.entries()) {
        if (!isRecord(chunkValue)) {
            invalidSample(lineNumber, `relevantChunks[${chunkIndex}] must be an object`)
        }

        const chunkId = requiredString(chunkValue.chunkId, `relevantChunks[${chunkIndex}].chunkId`, lineNumber)
        if (!isRelevance(chunkValue.relevance)) {
            invalidSample(lineNumber, `relevantChunks[${chunkIndex}].relevance must be 1, 2, or 3`)
        }
        if (chunkIds.has(chunkId)) {
            invalidSample(lineNumber, `duplicate relevant chunk ID: ${chunkId}`)
        }

        chunkIds.add(chunkId)
        relevantChunks.push({ chunkId, relevance: chunkValue.relevance })
    }

    return relevantChunks
}

function parseSample(line: string, lineNumber: number): EvaluationSample {
    let value: unknown
    try {
        value = JSON.parse(line)
    } catch {
        invalidSample(lineNumber, 'invalid JSON')
    }

    if (!isRecord(value)) {
        invalidSample(lineNumber, 'sample must be a JSON object')
    }

    return {
        id: requiredString(value.id, 'id', lineNumber),
        query: requiredString(value.query, 'query', lineNumber),
        knowledgeBaseId: requiredString(value.knowledgeBaseId, 'knowledgeBaseId', lineNumber),
        relevantChunks: parseRelevantChunks(value.relevantChunks, lineNumber),
    }
}

export function parseEvaluationDataset(text: string): EvaluationDataset {
    const lines = text.split('\n')
    let lastLineIndex = lines.length - 1
    while (lastLineIndex >= 0 && lines[lastLineIndex]?.trim() === '') {
        lastLineIndex -= 1
    }

    const samples: Array<EvaluationSample> = []
    const sampleIds = new Set<string>()

    for (let lineIndex = 0; lineIndex <= lastLineIndex; lineIndex += 1) {
        const line = lines[lineIndex] ?? ''
        const lineNumber = lineIndex + 1
        if (line.trim() === '') {
            invalidSample(lineNumber, 'empty line')
        }

        const sample = parseSample(line, lineNumber)
        if (sampleIds.has(sample.id)) {
            invalidSample(lineNumber, `duplicate sample ID: ${sample.id}`)
        }

        sampleIds.add(sample.id)
        samples.push(sample)
    }

    if (samples.length === 0) {
        throw new Error('Invalid evaluation dataset: at least one sample is required')
    }

    return { samples }
}
