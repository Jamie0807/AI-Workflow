import { describe, expect, it } from 'vitest'

import { createMarkdownSplitter, MarkdownSplitter } from '../chunking/markdown-splitter'

describe('MarkdownSplitter', () => {
    describe('基础功能', () => {
        it('应该能创建实例', () => {
            const splitter = new MarkdownSplitter()
            expect(splitter).toBeInstanceOf(MarkdownSplitter)
        })

        it('应该使用工厂函数创建', () => {
            const splitter = createMarkdownSplitter()
            expect(splitter).toBeDefined()
        })
    })

    describe('空文本处理', () => {
        it('空字符串应返回空数组', () => {
            const splitter = new MarkdownSplitter()
            expect(splitter.split('')).toEqual([])
        })

        it('只有空格的文本应返回空数组', () => {
            const splitter = new MarkdownSplitter()
            expect(splitter.split('   ')).toEqual([])
        })
    })

    describe('无标题文本', () => {
        it('没有标题的文本应作为一个整体处理', () => {
            const splitter = new MarkdownSplitter({ chunkSize: 1000, chunkOverlap: 50 })
            const text = '这是一段没有标题的普通文本。\n\n这是第二段。'
            const chunks = splitter.split(text)

            expect(chunks.length).toBeGreaterThanOrEqual(1)
            expect(chunks[0].metadata?.headerPath).toEqual([])
        })
    })

    describe('标题切分', () => {
        it('应该按一级标题切分', () => {
            const splitter = new MarkdownSplitter({ chunkSize: 1000, chunkOverlap: 50 })
            const text = `# 标题一

这是标题一的内容。

# 标题二

这是标题二的内容。`

            const chunks = splitter.split(text)

            expect(chunks.length).toBe(2)
            expect(chunks[0].metadata?.headerPath).toEqual(['标题一'])
            expect(chunks[1].metadata?.headerPath).toEqual(['标题二'])
        })

        it('应该按多级标题切分', () => {
            const splitter = new MarkdownSplitter({ chunkSize: 1000, chunkOverlap: 50 })
            const text = `# 一级标题

## 二级标题

内容

### 三级标题

更多内容`

            const chunks = splitter.split(text)

            expect(chunks.length).toBeGreaterThanOrEqual(1)
            // 检查标题路径
            const lastChunk = chunks[chunks.length - 1]
            expect(lastChunk.metadata?.headerPath).toContain('一级标题')
        })

        it('应该保留标题层级结构', () => {
            const splitter = new MarkdownSplitter({ chunkSize: 1000, chunkOverlap: 50 })
            const text = `# 章节一

## 小节 1.1

内容 1.1

## 小节 1.2

内容 1.2

# 章节二

## 小节 2.1

内容 2.1`

            const chunks = splitter.split(text)

            // 找到小节 2.1 的块
            const section21 = chunks.find(c => c.content.includes('内容 2.1'))
            expect(section21?.metadata?.headerPath).toEqual(['章节二', '小节 2.1'])
        })
    })

    describe('长段落切分', () => {
        it('应该切分超长段落', () => {
            const splitter = new MarkdownSplitter({ chunkSize: 100, chunkOverlap: 10 })
            const text = `# 标题

${'这是一段很长的文本。'.repeat(20)}`

            const chunks = splitter.split(text)

            expect(chunks.length).toBeGreaterThan(1)
            // 所有块应该有相同的标题路径
            chunks.forEach(chunk => {
                expect(chunk.metadata?.headerPath).toEqual(['标题'])
            })
        })
    })

    describe('标题前内容', () => {
        it('应该处理第一个标题前的内容', () => {
            const splitter = new MarkdownSplitter({ chunkSize: 1000, chunkOverlap: 50 })
            const text = `这是前言内容。

# 正文标题

正文内容。`

            const chunks = splitter.split(text)

            expect(chunks.length).toBe(2)
            expect(chunks[0].content).toContain('前言')
            expect(chunks[0].metadata?.headerPath).toEqual([])
        })
    })

    describe('索引正确性', () => {
        it('块索引应该连续', () => {
            const splitter = new MarkdownSplitter({ chunkSize: 100, chunkOverlap: 10 })
            const text = `# 标题一

${'内容一。'.repeat(30)}

# 标题二

${'内容二。'.repeat(30)}`

            const chunks = splitter.split(text)

            chunks.forEach((chunk, i) => {
                expect(chunk.index).toBe(i)
            })
        })
    })

    describe('偏移量正确性', () => {
        it('startOffset 和 endOffset 应该正确', () => {
            const splitter = new MarkdownSplitter({ chunkSize: 1000, chunkOverlap: 50 })
            const text = `# 标题

这是内容。`

            const chunks = splitter.split(text)

            expect(chunks.length).toBeGreaterThanOrEqual(1)
            expect(chunks[0].startOffset).toBeDefined()
            expect(chunks[0].endOffset).toBeDefined()
            expect(chunks[0].endOffset).toBeGreaterThan(chunks[0].startOffset)
        })
    })

    describe('特殊 Markdown 格式', () => {
        it('应该处理代码块', () => {
            const splitter = new MarkdownSplitter({ chunkSize: 1000, chunkOverlap: 50 })
            const text = `# 代码示例

\`\`\`javascript
function hello() {
  console.log('Hello');
}
\`\`\`

这是代码说明。`

            const chunks = splitter.split(text)

            expect(chunks.length).toBeGreaterThanOrEqual(1)
            expect(chunks[0].content).toContain('```')
        })

        it('应该处理列表', () => {
            const splitter = new MarkdownSplitter({ chunkSize: 1000, chunkOverlap: 50 })
            const text = `# 列表

- 项目一
- 项目二
- 项目三`

            const chunks = splitter.split(text)

            expect(chunks.length).toBeGreaterThanOrEqual(1)
            expect(chunks[0].content).toContain('- 项目一')
        })
    })
})
