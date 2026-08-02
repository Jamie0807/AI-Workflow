import { describe, expect, it } from 'vitest'

import { createTextSplitter, TextSplitter } from '../chunking/text-splitter'

describe('TextSplitter', () => {
    describe('基础功能', () => {
        it('应该能创建实例', () => {
            const splitter = new TextSplitter()
            expect(splitter).toBeInstanceOf(TextSplitter)
        })

        it('应该使用默认配置', () => {
            const splitter = createTextSplitter()
            const text = 'a'.repeat(600)
            const chunks = splitter.split(text)

            // 默认 chunkSize 是 500
            expect(chunks.length).toBeGreaterThan(1)
        })

        it('应该使用自定义配置', () => {
            const splitter = createTextSplitter({ chunkSize: 100, chunkOverlap: 10 })
            const text = 'a'.repeat(300)
            const chunks = splitter.split(text)

            expect(chunks.length).toBeGreaterThan(2)
        })
    })

    describe('空文本处理', () => {
        it('空字符串应返回空数组', () => {
            const splitter = new TextSplitter()
            expect(splitter.split('')).toEqual([])
        })

        it('只有空格的文本应返回空数组', () => {
            const splitter = new TextSplitter()
            expect(splitter.split('   ')).toEqual([])
        })
    })

    describe('短文本处理', () => {
        it('短于 chunkSize 的文本应返回单个块', () => {
            const splitter = new TextSplitter({ chunkSize: 500, chunkOverlap: 50 })
            const text = '这是一段短文本。'
            const chunks = splitter.split(text)

            expect(chunks).toHaveLength(1)
            expect(chunks[0].content).toBe(text)
            expect(chunks[0].index).toBe(0)
            expect(chunks[0].startOffset).toBe(0)
        })
    })

    describe('长文本切分', () => {
        it('应该按 chunkSize 切分长文本', () => {
            const splitter = new TextSplitter({ chunkSize: 100, chunkOverlap: 0 })
            const text = 'a'.repeat(250)
            const chunks = splitter.split(text)

            expect(chunks.length).toBe(3)
            expect(chunks[0].content.length).toBe(100)
        })

        it('应该保持块索引连续', () => {
            const splitter = new TextSplitter({ chunkSize: 100, chunkOverlap: 10 })
            const text = 'a'.repeat(500)
            const chunks = splitter.split(text)

            chunks.forEach((chunk, i) => {
                expect(chunk.index).toBe(i)
            })
        })
    })

    describe('重叠处理', () => {
        it('相邻块应有重叠', () => {
            const splitter = new TextSplitter({ chunkSize: 100, chunkOverlap: 20 })
            const text = 'ABCDEFGHIJ'.repeat(30) // 300 字符
            const chunks = splitter.split(text)

            expect(chunks.length).toBeGreaterThan(1)

            // 检查重叠
            for (let i = 1; i < chunks.length; i++) {
                const prevEnd = chunks[i - 1].endOffset
                const currStart = chunks[i].startOffset
                // 重叠部分
                expect(prevEnd).toBeGreaterThanOrEqual(currStart)
            }
        })
    })

    describe('分隔符优化', () => {
        it('应该优先在句号处切分', () => {
            const splitter = new TextSplitter({ chunkSize: 50, chunkOverlap: 5 })
            const text = '这是第一句话。这是第二句话。这是第三句话。这是第四句话。'
            const chunks = splitter.split(text)

            // 检查切分点是否在句号后
            chunks.forEach(chunk => {
                if (chunk.content.length < 50) {
                    // 短块应该是完整的句子
                    expect(chunk.content.endsWith('。') || chunk.content.endsWith('话')).toBe(true)
                }
            })
        })

        it('应该优先在段落边界处切分', () => {
            const splitter = new TextSplitter({ chunkSize: 100, chunkOverlap: 10 })
            const text = '第一段落内容。\n\n第二段落内容。\n\n第三段落内容。'
            const chunks = splitter.split(text)

            expect(chunks.length).toBeGreaterThanOrEqual(1)
        })
    })

    describe('参数验证', () => {
        it('chunkSize <= 0 应抛出错误', () => {
            const splitter = new TextSplitter()
            expect(() => splitter.split('test', { chunkSize: 0 })).toThrow()
            expect(() => splitter.split('test', { chunkSize: -1 })).toThrow()
        })

        it('chunkOverlap >= chunkSize 应抛出错误', () => {
            const splitter = new TextSplitter()
            expect(() => splitter.split('test', { chunkSize: 100, chunkOverlap: 100 })).toThrow()
            expect(() => splitter.split('test', { chunkSize: 100, chunkOverlap: 150 })).toThrow()
        })

        it('chunkOverlap < 0 应抛出错误', () => {
            const splitter = new TextSplitter()
            expect(() => splitter.split('test', { chunkSize: 100, chunkOverlap: -1 })).toThrow()
        })
    })

    describe('偏移量正确性', () => {
        it('startOffset 和 endOffset 应该正确', () => {
            const splitter = new TextSplitter({ chunkSize: 100, chunkOverlap: 0 })
            const text = '0123456789'.repeat(30) // 300 字符
            const chunks = splitter.split(text)

            chunks.forEach(chunk => {
                const extracted = text.slice(chunk.startOffset, chunk.endOffset).trim()
                expect(extracted).toBe(chunk.content)
            })
        })
    })
})
