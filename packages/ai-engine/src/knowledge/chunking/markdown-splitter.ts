import type { ChunkingConfig, TextChunk, TextSplitterService } from '../types'
import { DEFAULT_CHUNKING_CONFIG } from '../types'

/**
 * Markdown 文本切分器
 * 保持 Markdown 结构，优先在标题处切分
 */
export class MarkdownSplitter implements TextSplitterService {
    private config: ChunkingConfig

    constructor(config?: Partial<ChunkingConfig>) {
        this.config = { ...DEFAULT_CHUNKING_CONFIG, ...config }
    }

    /**
     * 将 Markdown 文本切分为多个块
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

        // 按 Markdown 标题分段
        const sections = this.splitByHeaders(text)

        // 对每个段落进行二次切分
        const chunks: TextChunk[] = []
        let globalIndex = 0

        for (const section of sections) {
            const sectionChunks = this.splitSection(section.content, section.startOffset, chunkSize, chunkOverlap)

            for (const chunk of sectionChunks) {
                chunks.push({
                    ...chunk,
                    index: globalIndex++,
                    metadata: {
                        ...chunk.metadata,
                        headerPath: section.headerPath,
                    },
                })
            }
        }

        return chunks
    }

    /**
     * 按 Markdown 标题切分
     */
    private splitByHeaders(text: string): Array<{
        content: string
        startOffset: number
        headerPath: string[]
    }> {
        const sections: Array<{
            content: string
            startOffset: number
            headerPath: string[]
        }> = []

        // 匹配 Markdown 标题 (# ## ### 等)
        const headerRegex = /^(#{1,6})\s+(.+)$/gm
        const headers: Array<{ level: number; title: string; index: number }> = []

        let match
        while ((match = headerRegex.exec(text)) !== null) {
            headers.push({
                level: match[1].length,
                title: match[2].trim(),
                index: match.index,
            })
        }

        if (headers.length === 0) {
            // 没有标题，整个文档作为一个段落
            return [
                {
                    content: text,
                    startOffset: 0,
                    headerPath: [],
                },
            ]
        }

        // 构建标题路径并切分
        const headerStack: string[] = []

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i]
            const nextHeader = headers[i + 1]

            // 更新标题栈
            while (headerStack.length >= header.level) {
                headerStack.pop()
            }
            headerStack.push(header.title)

            // 提取段落内容
            const startOffset = header.index
            const endOffset = nextHeader ? nextHeader.index : text.length
            const content = text.slice(startOffset, endOffset).trim()

            if (content.length > 0) {
                sections.push({
                    content,
                    startOffset,
                    headerPath: [...headerStack],
                })
            }
        }

        // 处理第一个标题之前的内容
        if (headers[0].index > 0) {
            const preContent = text.slice(0, headers[0].index).trim()
            if (preContent.length > 0) {
                sections.unshift({
                    content: preContent,
                    startOffset: 0,
                    headerPath: [],
                })
            }
        }

        return sections
    }

    /**
     * 对单个段落进行切分
     */
    private splitSection(content: string, baseOffset: number, chunkSize: number, chunkOverlap: number): TextChunk[] {
        if (content.length <= chunkSize) {
            return [
                {
                    content,
                    index: 0,
                    startOffset: baseOffset,
                    endOffset: baseOffset + content.length,
                },
            ]
        }

        const chunks: TextChunk[] = []
        const separators = ['\n\n', '\n', '。', '！', '？', '.', '!', '?', ' ']

        let startOffset = 0
        let index = 0

        while (startOffset < content.length) {
            let endOffset = Math.min(startOffset + chunkSize, content.length)

            // 尝试在分隔符处切分
            if (endOffset < content.length) {
                const searchStart = Math.max(startOffset + Math.floor(chunkSize * 0.5), startOffset)
                let bestSplit = endOffset

                for (const sep of separators) {
                    const lastIndex = content.lastIndexOf(sep, endOffset - 1)
                    if (lastIndex > searchStart && lastIndex < bestSplit) {
                        bestSplit = lastIndex + sep.length
                        break
                    }
                }

                endOffset = bestSplit
            }

            const chunkContent = content.slice(startOffset, endOffset).trim()

            if (chunkContent.length > 0) {
                chunks.push({
                    content: chunkContent,
                    index,
                    startOffset: baseOffset + startOffset,
                    endOffset: baseOffset + endOffset,
                })
                index++
            }

            if (endOffset >= content.length) {
                break
            }

            startOffset = endOffset - chunkOverlap
            if (startOffset <= chunks[chunks.length - 1]?.startOffset - baseOffset) {
                startOffset = endOffset
            }
        }

        return chunks
    }
}

/**
 * 创建 Markdown 切分器实例
 */
export function createMarkdownSplitter(config?: Partial<ChunkingConfig>): TextSplitterService {
    return new MarkdownSplitter(config)
}
