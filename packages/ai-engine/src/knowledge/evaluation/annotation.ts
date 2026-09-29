// cspell:ignore unreviewed

import type { RetrievalMode } from '../types'
import type { EvaluationDataset, EvaluationSample, RelevantChunk } from './types'

export type HumanRelevance = 0 | 1 | 2 | 3

export interface AnnotationQuery {
    id: string
    query: string
    intent: string
    knowledgeBaseId: string
}

export interface CandidateSource {
    rank: number
    score: number
}

export interface AnnotationCandidate {
    chunkId: string
    content: string
    chunkIndex: number
    documentId: string
    knowledgeBaseId: string
    candidateSources: Partial<Record<RetrievalMode, CandidateSource>>
    humanRelevance: HumanRelevance | null
    rationale: string
}

export interface AnnotationReview {
    id: string
    query: string
    intent: string
    knowledgeBaseId: string
    candidates: AnnotationCandidate[]
}

export interface AnnotationManifest {
    datasetVersion: string
    knowledgeBaseId: string
    knowledgeBaseName: string
    documentId: string
    documentName: string
    documentSha256: string
    chunkCount: number
    chunkSize: number
    chunkOverlap: number
    embeddingProvider: string
    embeddingModel: string
    embeddingDimensions: number
    queryCount: number
    annotationGuideVersion: string
    annotationStatus: 'candidate' | 'human-reviewed'
    annotator: string | null
    reviewedAt: string | null
    datasetSha256: string | null
}

const RETRIEVAL_MODES = ['vector', 'fulltext', 'hybrid'] as const satisfies readonly RetrievalMode[]
const HUMAN_RELEVANCES = [0, 1, 2, 3] as const satisfies readonly HumanRelevance[]

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(kind: 'query' | 'review', lineNumber: number, reason: string): never {
    throw new Error(`Invalid annotation ${kind} at line ${lineNumber}: ${reason}`)
}

function requiredString(value: unknown, fieldName: string, kind: 'query' | 'review', lineNumber: number): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        invalid(kind, lineNumber, `${fieldName} must be a non-empty string`)
    }

    return value
}

function parseJsonLine(text: string, kind: 'query' | 'review', lineNumber: number): Record<string, unknown> {
    let value: unknown
    try {
        value = JSON.parse(text)
    } catch {
        invalid(kind, lineNumber, 'invalid JSON')
    }

    if (!isRecord(value)) {
        invalid(kind, lineNumber, 'must be a JSON object')
    }

    return value
}

function parseJsonLines<T>(
    text: string,
    kind: 'query' | 'review',
    parseLine: (value: Record<string, unknown>, lineNumber: number) => T,
    emptyMessage: string
): T[] {
    if (typeof text !== 'string' || text.trim().length === 0) {
        throw new Error(emptyMessage)
    }

    const lines = text.split(/\r?\n/)
    let lastLineIndex = lines.length - 1
    while (lastLineIndex >= 0 && lines[lastLineIndex]?.trim() === '') {
        lastLineIndex -= 1
    }

    if (lastLineIndex < 0) {
        throw new Error(emptyMessage)
    }

    const values: T[] = []
    for (let lineIndex = 0; lineIndex <= lastLineIndex; lineIndex += 1) {
        const line = lines[lineIndex] ?? ''
        const lineNumber = lineIndex + 1
        if (line.trim() === '') {
            invalid(kind, lineNumber, 'empty line')
        }

        values.push(parseLine(parseJsonLine(line, kind, lineNumber), lineNumber))
    }

    return values
}

function isHumanRelevance(value: unknown): value is HumanRelevance {
    return HUMAN_RELEVANCES.some(relevance => relevance === value)
}

function isRetrievalMode(value: string): value is RetrievalMode {
    return RETRIEVAL_MODES.some(mode => mode === value)
}

function isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function parseCandidateSources(
    value: unknown,
    lineNumber: number,
    candidateIndex: number
): Partial<Record<RetrievalMode, CandidateSource>> {
    if (!isRecord(value)) {
        invalid('review', lineNumber, `candidates[${candidateIndex}].candidateSources must be an object`)
    }

    const sources: Partial<Record<RetrievalMode, CandidateSource>> = {}
    for (const [mode, sourceValue] of Object.entries(value)) {
        if (!isRetrievalMode(mode)) {
            invalid('review', lineNumber, `candidates[${candidateIndex}].candidateSources has invalid mode ${mode}`)
        }
        if (!isRecord(sourceValue)) {
            invalid('review', lineNumber, `candidates[${candidateIndex}].candidateSources.${mode} must be an object`)
        }
        if (!isPositiveInteger(sourceValue.rank)) {
            invalid('review', lineNumber, `candidates[${candidateIndex}].candidateSources.${mode}.rank must be a positive integer`)
        }
        if (typeof sourceValue.score !== 'number' || !Number.isFinite(sourceValue.score)) {
            invalid('review', lineNumber, `candidates[${candidateIndex}].candidateSources.${mode}.score must be a finite number`)
        }

        sources[mode] = { rank: sourceValue.rank, score: sourceValue.score }
    }

    return sources
}

function parseAnnotationCandidate(value: unknown, lineNumber: number, candidateIndex: number, chunkIds: Set<string>): AnnotationCandidate {
    if (!isRecord(value)) {
        invalid('review', lineNumber, `candidates[${candidateIndex}] must be an object`)
    }

    const field = (name: string): string => requiredString(value[name], `candidates[${candidateIndex}].${name}`, 'review', lineNumber)
    const chunkId = field('chunkId')
    if (chunkIds.has(chunkId)) {
        invalid('review', lineNumber, `duplicate candidate chunk ID: ${chunkId}`)
    }

    const content = field('content')
    const documentId = field('documentId')
    const knowledgeBaseId = field('knowledgeBaseId')
    if (!isNonNegativeInteger(value.chunkIndex)) {
        invalid('review', lineNumber, `candidates[${candidateIndex}].chunkIndex must be a non-negative integer`)
    }

    const humanRelevance = value.humanRelevance
    if (humanRelevance !== null && !isHumanRelevance(humanRelevance)) {
        invalid('review', lineNumber, `humanRelevance must be 0, 1, 2, or 3, or null`)
    }
    if (typeof value.rationale !== 'string') {
        invalid('review', lineNumber, `candidates[${candidateIndex}].rationale must be a string`)
    }
    if (humanRelevance !== null && humanRelevance > 0 && value.rationale.trim().length === 0) {
        invalid('review', lineNumber, 'rationale must be a non-empty string when humanRelevance is non-zero')
    }

    chunkIds.add(chunkId)
    return {
        chunkId,
        content,
        chunkIndex: value.chunkIndex,
        documentId,
        knowledgeBaseId,
        candidateSources: parseCandidateSources(value.candidateSources, lineNumber, candidateIndex),
        humanRelevance,
        rationale: value.rationale,
    }
}

function parseAnnotationReview(value: Record<string, unknown>, lineNumber: number): AnnotationReview {
    const id = requiredString(value.id, 'id', 'review', lineNumber)
    const query = requiredString(value.query, 'query', 'review', lineNumber)
    const intent = requiredString(value.intent, 'intent', 'review', lineNumber)
    const knowledgeBaseId = requiredString(value.knowledgeBaseId, 'knowledgeBaseId', 'review', lineNumber)

    if (!Array.isArray(value.candidates) || value.candidates.length === 0) {
        invalid('review', lineNumber, 'candidates must be a non-empty array')
    }

    const chunkIds = new Set<string>()
    const candidates = value.candidates.map((candidate, candidateIndex) =>
        parseAnnotationCandidate(candidate, lineNumber, candidateIndex, chunkIds)
    )

    return { id, query, intent, knowledgeBaseId, candidates }
}

export function parseAnnotationQueries(text: string): AnnotationQuery[] {
    const queryIds = new Set<string>()
    return parseJsonLines(
        text,
        'query',
        (value, lineNumber): AnnotationQuery => {
            const id = requiredString(value.id, 'id', 'query', lineNumber)
            if (queryIds.has(id)) {
                throw new Error(`duplicate query ID ${id} on line ${lineNumber}`)
            }
            queryIds.add(id)

            return {
                id,
                query: requiredString(value.query, 'query', 'query', lineNumber),
                intent: requiredString(value.intent, 'intent', 'query', lineNumber),
                knowledgeBaseId: requiredString(value.knowledgeBaseId, 'knowledgeBaseId', 'query', lineNumber),
            }
        },
        'Invalid annotation queries: at least one annotation query is required'
    )
}

export function parseAnnotationReviews(text: string): AnnotationReview[] {
    const reviewIds = new Set<string>()
    return parseJsonLines(
        text,
        'review',
        (value, lineNumber): AnnotationReview => {
            const review = parseAnnotationReview(value, lineNumber)
            if (reviewIds.has(review.id)) {
                throw new Error(`duplicate review ID ${review.id} on line ${lineNumber}`)
            }
            reviewIds.add(review.id)
            return review
        },
        'Invalid annotation reviews: at least one annotation review is required'
    )
}

function validateFinalizationReview(review: AnnotationReview, reviewIndex: number): void {
    if (!isRecord(review)) {
        throw new Error(`Invalid annotation review at index ${reviewIndex}`)
    }
    if (!Array.isArray(review.candidates) || review.candidates.length === 0) {
        throw new Error(`${review.id} must have at least one candidate`)
    }

    const chunkIds = new Set<string>()
    for (const candidate of review.candidates) {
        if (!isRecord(candidate) || typeof candidate.chunkId !== 'string' || candidate.chunkId.trim().length === 0) {
            throw new Error(`${review.id} has a malformed candidate`)
        }
        if (chunkIds.has(candidate.chunkId)) {
            throw new Error(`${review.id} has duplicate candidate chunk ID ${candidate.chunkId}`)
        }
        chunkIds.add(candidate.chunkId)

        if (candidate.humanRelevance === null) {
            throw new Error(`${review.id} has unreviewed candidate ${candidate.chunkId}`)
        }
        if (!isHumanRelevance(candidate.humanRelevance)) {
            throw new Error(`${review.id} has invalid human relevance for candidate ${candidate.chunkId}`)
        }
        if (candidate.humanRelevance > 0 && (typeof candidate.rationale !== 'string' || candidate.rationale.trim().length === 0)) {
            throw new Error(`${review.id} has non-zero candidate ${candidate.chunkId} without rationale`)
        }
    }
}

export function finalizeAnnotationDataset(reviews: readonly AnnotationReview[]): EvaluationDataset {
    if (!Array.isArray(reviews) || reviews.length === 0) {
        throw new Error('Annotation reviews must contain at least one review')
    }

    const reviewIds = new Set<string>()
    const samples: Array<EvaluationSample> = []

    for (const [reviewIndex, review] of reviews.entries()) {
        validateFinalizationReview(review, reviewIndex)
        if (reviewIds.has(review.id)) {
            throw new Error(`duplicate review ID ${review.id}`)
        }
        reviewIds.add(review.id)

        const labeledCandidates: Array<{ candidate: AnnotationCandidate; candidateIndex: number }> = review.candidates
            .map((candidate: AnnotationCandidate, candidateIndex: number) => ({ candidate, candidateIndex }))
            .filter(({ candidate }: { candidate: AnnotationCandidate }) => candidate.humanRelevance !== 0)

        if (labeledCandidates.length === 0) {
            throw new Error(`${review.id} has no non-zero human relevance label`)
        }

        labeledCandidates.sort(
            (
                left: { candidate: AnnotationCandidate; candidateIndex: number },
                right: { candidate: AnnotationCandidate; candidateIndex: number }
            ) => {
                const relevanceDifference = (right.candidate.humanRelevance ?? 0) - (left.candidate.humanRelevance ?? 0)
                return relevanceDifference !== 0 ? relevanceDifference : left.candidateIndex - right.candidateIndex
            }
        )

        const relevantChunks: Array<RelevantChunk> = labeledCandidates.map(({ candidate }: { candidate: AnnotationCandidate }) => ({
            chunkId: candidate.chunkId,
            relevance: candidate.humanRelevance as 1 | 2 | 3,
        }))

        samples.push({
            id: review.id,
            query: review.query,
            knowledgeBaseId: review.knowledgeBaseId,
            relevantChunks,
        })
    }

    return { samples }
}
