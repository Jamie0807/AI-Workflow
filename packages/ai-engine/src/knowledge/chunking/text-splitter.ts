import type { ChunkingConfig, TextChunk, TextSplitterService } from '../types'
import { DEFAULT_CHUNKING_CONFIG } from '../types'

/**
 * 通用文本切分器
 * 按字符数切分，优先在段落、句子边界处切分
 */
export class TextSplitter implements TextSplitterService {
    private config: ChunkingConfig

    constructor(config?: Partial<ChunkingConfig>) {
        this.config = { ...DEFAULT_CHUNKING_CONFIG, ...config }
    }

    /**
     * 将文本切分为多个块
     */
    split(text: string, config?: Partial<ChunkingConfig>): TextChunk[] {
        const { chunkSize, chunkOverlap } = { ...this.config, ...config }

        if (!text || text.trim().length === 0) {
            return []
        }

        // 验证配置
        if (chunkSize <= 0) {
            throw new Error('chunkSize must be greater than 0')
        }
        if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
            throw new Error('chunkOverlap must be >= 0 and < chunkSize')
        }

        const chunks: TextChunk[] = []
        const separators = ['\n\n', '\n', '。', '！', '？', '.', '!', '?', '；', ';', ' ']

        let startOffset = 0
        let index = 0

        while (startOffset < text.length) {
            // 确定块的结束位置
            let endOffset = Math.min(startOffset + chunkSize, text.length)

            // 如果不是最后一块，尝试在分隔符处切分
            if (endOffset < text.length) {
                const searchStart = Math.max(startOffset + Math.floor(chunkSize * 0.5), startOffset)
                let bestSplit = endOffset

                // 从后向前查找最佳分隔符位置
                for (const sep of separators) {
                    const lastIndex = text.lastIndexOf(sep, endOffset - 1)
                    if (lastIndex > searchStart && lastIndex < bestSplit) {
                        bestSplit = lastIndex + sep.length
                        break // 使用优先级最高的分隔符
                    }
                }

                endOffset = bestSplit
            }

            // 提取块内容
            const content = text.slice(startOffset, endOffset).trim()

            if (content.length > 0) {
                chunks.push({
                    content,
                    index,
                    startOffset,
                    endOffset,
                })
                index++
            }

            // 计算下一块的起始位置（考虑重叠）
            if (endOffset >= text.length) {
                break
            }

            startOffset = endOffset - chunkOverlap
            // 确保不会无限循环
            if (startOffset <= chunks[chunks.length - 1]?.startOffset) {
                startOffset = endOffset
            }
        }

        return chunks
    }
}

/**
 * 创建文本切分器实例
 */
export function createTextSplitter(config?: Partial<ChunkingConfig>): TextSplitterService {
    return new TextSplitter(config)
}
