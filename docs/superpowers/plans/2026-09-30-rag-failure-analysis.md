# RAG Failure Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为冻结的人工标注数据集和 vector/fulltext/hybrid 基线报告增加一个可重复、离线、可验证的 RAG 检索失败分析工具，并生成首份 v1 分析产物。

**Architecture:** 将分析逻辑放在 `@ai-workflow/ai-engine` 的无外部依赖纯模块中，输入已解析的数据集和基线报告，输出稳定可序列化的诊断对象。Workflow 脚本只负责 CLI 参数、文件读取/解析、输入校验、Git 元数据和原子写入 JSON/Markdown；不修改实际检索器，也不调用数据库、Qdrant、Ollama 或 LLM。

**Tech Stack:** TypeScript 5.x、Vitest、Node.js `fs/promises`、`crypto.createHash`、现有 `@ai-workflow/ai-engine` evaluation types/metrics、Workflow `tsx` CLI。

## Global Constraints

- 工具只做离线问题定位，不修改 vector、fulltext、hybrid 或 rerank 实现。
- 不自动搜索最优阈值、向量权重或其他检索参数。
- 不使用 LLM 推断失败原因，不生成超出人工标注数据直接观察范围的根因结论。
- `relevance >= 1` 用于召回覆盖率；`relevance >= 2` 只用于识别核心内容遗漏；`relevance = 0` 表示人工审阅认为与查询无关。
- 输入报告必须包含 `vector`、`fulltext`、`hybrid` 三种模式，并校验数据集 SHA-256、查询 ID、Top-K 和 chunk ID。
- 相对路径按仓库根目录解释；配置/数据错误输出明确错误并返回非零退出码。
- JSON 和 Markdown 结果必须原子写入，失败时不得留下半成品。
- 分析结果记录数据集哈希、基线报告路径、模式、Top-K、生成时间和 Git revision。
- 本阶段不包含 Web UI、LLM 最终答案评分、第二标注人一致性计算、无答案查询。

---

## 文件结构

| 文件                                                                                 | 责任                                                                                               |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `packages/ai-engine/src/knowledge/evaluation/failure-analysis.ts`                    | 定义失败分析输入/输出类型、输入一致性校验、逐查询诊断、模式对比和汇总；不读文件、不访问外部服务。  |
| `packages/ai-engine/src/knowledge/evaluation/index.ts`                               | 导出失败分析函数和类型，供 Workflow CLI 使用。                                                     |
| `packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts`     | 覆盖纯分析的分类、集合、核心遗漏、模式推荐、汇总和输入拒绝。                                       |
| `apps/workflow/scripts/analyze-rag.ts`                                               | 解析参数、读取 JSONL/JSON、计算数据集哈希、读取 Git revision、调用纯模块、原子写入 JSON/Markdown。 |
| `packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis-cli.test.ts` | 覆盖 CLI 参数、输入解析、匹配错误、成功输出和原子写入失败清理。                                    |
| `apps/workflow/package.json`                                                         | 增加 `analyze:rag` 脚本。                                                                          |
| `docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.json`   | 首份机器可读 v1 失败分析产物。                                                                     |
| `docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.md`     | 首份人工可读 v1 失败分析产物。                                                                     |

---

### Task 1: 定义纯分析接口并先写核心失败分类测试

**Files:**

- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts`
- Create: `packages/ai-engine/src/knowledge/evaluation/failure-analysis.ts`
- Modify: `packages/ai-engine/src/knowledge/evaluation/index.ts`

**Interfaces:**

- Consumes: `EvaluationDataset`、三个 `EvaluationReport`、数据集 SHA-256 和分析上下文。
- Produces: `analyzeRagFailure(input: FailureAnalysisInput): FailureAnalysisResult`、`validateFailureAnalysisInput(input): string[]`、`FailureAnalysisInputError` 以及可序列化的结果类型。

- [ ] **Step 1: 写失败测试，锁定类型和三类覆盖分类**

在测试中使用固定的最小数据集和三种模式报告；`vector` 完全覆盖，`fulltext` 只命中一个相关 chunk，`hybrid` 一个相关 chunk 都没有命中。测试必须同时验证等级 1/2/3 的口径：等级 1 计入覆盖，等级 2/3 才进入 `missedCoreChunkIds`。

```ts
import { describe, expect, it } from 'vitest'

import { analyzeRagFailure } from '../failure-analysis'
import type { EvaluationDataset, EvaluationReport } from '../types'

const dataset: EvaluationDataset = {
    samples: [
        {
            id: 'q-1',
            query: 'scope',
            knowledgeBaseId: 'kb-1',
            relevantChunks: [
                { chunkId: 'core-3', relevance: 3 },
                { chunkId: 'core-2', relevance: 2 },
                { chunkId: 'background-1', relevance: 1 },
            ],
        },
    ],
}

function report(mode: EvaluationReport['mode'], retrievedChunkIds: string[]): EvaluationReport {
    return {
        mode,
        config: { mode, topK: 3, knowledgeBaseIds: ['kb-1'], threshold: 0.2, vectorWeight: 0.7 },
        sampleCount: 1,
        metrics: { precisionAtK: 0, recallAtK: 0, mrrAtK: 0, ndcgAtK: 0 },
        latencyMs: { p50: 10, p95: 20 },
        queries: [
            {
                sampleId: 'q-1',
                query: 'scope',
                retrievedChunkIds,
                retrievedResults: retrievedChunkIds.map((chunkId, index) => ({ chunkId, score: 1 - index / 10 })),
                metrics: { precisionAtK: 0.5, recallAtK: 0.5, mrrAtK: 1, ndcgAtK: 0.5 },
                latencyMs: 12,
            },
        ],
        metadata: {
            hashStatus: 'computed',
            datasetSha256: 'dataset-sha',
            topK: 3,
            mode,
            knowledgeBaseIds: ['kb-1'],
            retrievalConfig: { threshold: 0.2, vectorWeight: 0.7 },
        },
    }
}

it('classifies coverage and preserves the relevance-level distinctions', () => {
    const result = analyzeRagFailure({
        dataset,
        datasetSha256: 'dataset-sha',
        datasetPath: 'dataset.jsonl',
        reportPath: 'baseline.json',
        gitRevision: 'abc123',
        generatedAt: '2026-09-30T00:00:00.000Z',
        reports: [
            report('vector', ['core-3', 'core-2', 'background-1']),
            report('fulltext', ['background-1', 'noise']),
            report('hybrid', ['noise']),
        ],
    })

    expect(result.byMode.vector.queries[0]).toMatchObject({
        coverageStatus: 'complete',
        coveredRelevantChunkIds: ['core-3', 'core-2', 'background-1'],
        missedRelevantChunkIds: [],
        falsePositiveChunkIds: [],
        missedCoreChunkIds: [],
        backgroundOnly: false,
        maxRetrievedRelevance: 3,
    })
    expect(result.byMode.fulltext.queries[0]).toMatchObject({
        coverageStatus: 'partial',
        coveredRelevantChunkIds: ['background-1'],
        missedRelevantChunkIds: ['core-3', 'core-2'],
        falsePositiveChunkIds: ['noise'],
        missedCoreChunkIds: ['core-3', 'core-2'],
        backgroundOnly: true,
        maxRetrievedRelevance: 1,
    })
    expect(result.byMode.hybrid.queries[0]).toMatchObject({
        coverageStatus: 'zero',
        coveredRelevantChunkIds: [],
        missedRelevantChunkIds: ['core-3', 'core-2', 'background-1'],
        falsePositiveChunkIds: ['noise'],
        missedCoreChunkIds: ['core-3', 'core-2'],
        backgroundOnly: false,
        maxRetrievedRelevance: 0,
    })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm --filter @ai-workflow/ai-engine test -- failure-analysis.test.ts
```

Expected: FAIL because `failure-analysis.ts` and the exported `analyzeRagFailure` do not exist yet.

- [ ] **Step 3: 定义纯模块的稳定类型和输入校验**

在 `failure-analysis.ts` 中定义以下类型和常量；模式顺序必须固定，便于 JSON、Markdown 和测试稳定比较：

```ts
import type { EvaluationDataset, EvaluationReport, RankingMetrics, RetrievedQueryResult } from './types'
import type { RetrievalMode } from '../types'

export const FAILURE_ANALYSIS_MODES = ['vector', 'fulltext', 'hybrid'] as const satisfies readonly RetrievalMode[]
export type FailureAnalysisMode = (typeof FAILURE_ANALYSIS_MODES)[number]
export type CoverageStatus = 'complete' | 'partial' | 'zero'

export interface FailureAnalysisInput {
    dataset: EvaluationDataset
    datasetSha256: string
    datasetPath: string
    reportPath: string
    gitRevision: string
    generatedAt: string
    reports: readonly EvaluationReport[]
}

export interface QueryFailureAnalysis {
    sampleId: string
    query: string
    relevantChunkCount: number
    coveredRelevantChunkCount: number
    coverage: number
    coveredRelevantChunkIds: string[]
    missedRelevantChunkIds: string[]
    falsePositiveChunkIds: string[]
    maxRetrievedRelevance: 0 | 1 | 2 | 3
    coverageStatus: CoverageStatus
    missedCoreChunkIds: string[]
    backgroundOnly: boolean
    metrics: RankingMetrics
    latencyMs: number
}

export interface ModeFailureSummary {
    queryCount: number
    completeCoverageCount: number
    partialCoverageCount: number
    zeroCoverageCount: number
    backgroundOnlyCount: number
    falsePositiveCount: number
    averageFalsePositivePerQuery: number
    mostMissedRelevantChunks: Array<{ chunkId: string; missedCount: number }>
}

export interface ModeFailureAnalysis {
    mode: FailureAnalysisMode
    topK: number
    metrics: RankingMetrics
    latencyMs: { p50: number; p95: number }
    summary: ModeFailureSummary
    queries: QueryFailureAnalysis[]
}

export interface QueryModeComparison {
    sampleId: string
    modes: Record<
        FailureAnalysisMode,
        {
            metrics: RankingMetrics
            latencyMs: number
            coveredRelevantChunkIds: string[]
            missedRelevantChunkIds: string[]
            uniqueCoveredRelevantChunkIds: string[]
            uniqueMissedRelevantChunkIds: string[]
        }
    >
    recommendedFocusMode: FailureAnalysisMode
}

export interface FailureAnalysisResult {
    generatedAt: string
    gitRevision: string
    dataset: { path: string; sha256: string; sampleCount: number }
    baseline: { path: string }
    modes: FailureAnalysisMode[]
    topK: number
    byMode: Record<FailureAnalysisMode, ModeFailureAnalysis>
    queryComparisons: QueryModeComparison[]
    priorityFailures: Array<{
        sampleId: string
        query: string
        recommendedFocusMode: FailureAnalysisMode
        nDCG: number
        recall: number
        falsePositiveCount: number
    }>
}

export function validateFailureAnalysisInput(input: FailureAnalysisInput): string[]
export function analyzeRagFailure(input: FailureAnalysisInput): FailureAnalysisResult
```

`validateFailureAnalysisInput` 必须拒绝：缺少三种模式、重复模式、模式字段不匹配、数据集 SHA 不一致、查询集合不一致、`topK` 不一致、报告查询缺失/重复、报告查询与数据集 `sampleId` 不匹配、重复 retrieved chunk ID，以及数据集 sample 的相关 chunk ID 重复。错误字符串要包含模式、sample ID 或 chunk ID，方便 CLI 定位数据问题。

- [ ] **Step 4: 实现最小逐查询诊断并导出模块**

用 `Map` 建立 `sampleId -> EvaluationSample` 和 `chunkId -> relevance`，对每个模式按报告原始顺序输出集合，避免排序改变检索顺序。核心计算规则固定如下：

```ts
const relevantIds = sample.relevantChunks.map(item => item.chunkId)
const relevanceByChunkId = new Map(sample.relevantChunks.map(item => [item.chunkId, item.relevance]))
const retrievedIds = query.retrievedChunkIds.slice(0, report.config.topK)
const coveredRelevantChunkIds = retrievedIds.filter(chunkId => relevanceByChunkId.has(chunkId))
const missedRelevantChunkIds = relevantIds.filter(chunkId => !coveredRelevantChunkIds.includes(chunkId))
const falsePositiveChunkIds = retrievedIds.filter(chunkId => !relevanceByChunkId.has(chunkId))
const retrievedRelevances = retrievedIds.map(chunkId => relevanceByChunkId.get(chunkId) ?? 0)
const maxRetrievedRelevance = Math.max(0, ...retrievedRelevances) as 0 | 1 | 2 | 3
const coverage = coveredRelevantChunkIds.length / relevantIds.length
const coverageStatus = coverage === 1 ? 'complete' : coverage === 0 ? 'zero' : 'partial'
const missedCoreChunkIds = sample.relevantChunks
    .filter(item => item.relevance >= 2 && !coveredRelevantChunkIds.includes(item.chunkId))
    .map(item => item.chunkId)
const backgroundOnly =
    coveredRelevantChunkIds.length > 0 &&
    coveredRelevantChunkIds.every(chunkId => {
        return (relevanceByChunkId.get(chunkId) ?? 0) === 1
    })
```

保留报告逐查询 `precisionAtK`、`recallAtK`、`mrrAtK`、`ndcgAtK` 和 `latencyMs`；不重新计算或覆盖正式指标。`retrievedResults` 只用于校验其 chunk ID 集合与 `retrievedChunkIds` 一致，不使用 score 推断失败原因。

- [ ] **Step 5: 运行核心测试并提交**

Run:

```bash
pnpm --filter @ai-workflow/ai-engine test -- failure-analysis.test.ts
pnpm --filter @ai-workflow/ai-engine typecheck
```

Expected: 核心分类测试 PASS，TypeScript 无错误。

```bash
git add packages/ai-engine/src/knowledge/evaluation/failure-analysis.ts \
  packages/ai-engine/src/knowledge/evaluation/index.ts \
  packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts
git commit -m "feat: add RAG failure analysis core"
```

### Task 2: 完成三模式对比、汇总和排序的纯函数测试

**Files:**

- Modify: `packages/ai-engine/src/knowledge/evaluation/failure-analysis.ts`
- Modify: `packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts`

**Interfaces:**

- Consumes: Task 1 的 `QueryFailureAnalysis` 和三个 `ModeFailureAnalysis`。
- Produces: `queryComparisons`、模式汇总、常被遗漏 chunk 和重点失败查询，全部包含在 `FailureAnalysisResult` 中。

- [ ] **Step 1: 写失败测试，覆盖模式对比和汇总排序**

追加以下测试数据和断言：

```ts
it('compares modes with deterministic focus ranking and summarizes misses', () => {
    const result = analyzeRagFailure(createInputWithThreeQueries())

    expect(result.queryComparisons[0]).toMatchObject({
        sampleId: 'q-1',
        recommendedFocusMode: 'vector',
    })
    expect(result.queryComparisons[0]?.modes.vector.uniqueCoveredRelevantChunkIds).toEqual(['core-3'])
    expect(result.queryComparisons[0]?.modes.hybrid.uniqueMissedRelevantChunkIds).toEqual(['core-3', 'core-2'])

    expect(result.byMode.fulltext.summary).toMatchObject({
        queryCount: 3,
        completeCoverageCount: 0,
        partialCoverageCount: 1,
        zeroCoverageCount: 2,
        backgroundOnlyCount: 1,
        falsePositiveCount: 3,
        averageFalsePositivePerQuery: 1,
    })
    expect(result.byMode.fulltext.summary.mostMissedRelevantChunks[0]).toEqual({
        chunkId: 'core-3',
        missedCount: 2,
    })

    expect(result.priorityFailures.map(item => item.sampleId)).toEqual(['q-2', 'q-3', 'q-1'])
})

it('uses vector, fulltext, hybrid as the final tie-break order', () => {
    const result = analyzeRagFailure(createInputWithEqualMetrics())
    expect(result.queryComparisons[0]?.recommendedFocusMode).toBe('vector')
})
```

重点失败查询必须使用确定性排序：`nDCG` 升序、`recall` 升序、误召回数降序、`sampleId` 升序；模式关注推荐必须按 nDCG、MRR、Precision、Recall 降序，完全相同按 `vector`、`fulltext`、`hybrid`。若项目最终选择不同的“重点失败”方向，必须在测试和 Markdown 字段名中明确保持一致，不能依赖对象遍历顺序。

- [ ] **Step 2: 运行测试确认新断言失败**

Run:

```bash
pnpm --filter @ai-workflow/ai-engine test -- failure-analysis.test.ts
```

Expected: FAIL because mode comparison, unique hit/miss sets, summary counts and priority ordering are not implemented.

- [ ] **Step 3: 实现模式对比和汇总**

实现下列确定性规则：

1. 每个模式的 `summary` 统计查询数、三种覆盖状态、background-only 数、所有查询的误召回总数和平均值；平均值使用 `falsePositiveCount / queryCount`，保留完整浮点值，展示层统一四舍五入。
2. 用 `Map<string, number>` 聚合 `missedRelevantChunkIds`，按 `missedCount` 降序、`chunkId` 升序输出 `mostMissedRelevantChunks`。
3. 对每个 sample 生成三个模式的诊断快照。`uniqueCoveredRelevantChunkIds` 是该模式命中但其他两个模式都未命中的相关 ID；`uniqueMissedRelevantChunkIds` 是该模式遗漏且至少一个其他模式命中的相关 ID；两个数组均按数据集 `relevantChunks` 原始顺序输出。
4. 推荐关注模式只比较正式逐查询指标，不把 latency 或失败分类偷偷混入评分：

```ts
const FOCUS_ORDER: readonly FailureAnalysisMode[] = ['vector', 'fulltext', 'hybrid']

function compareFocus(left: QueryFailureAnalysis, right: QueryFailureAnalysis): number {
    return (
        right.metrics.ndcgAtK - left.metrics.ndcgAtK ||
        right.metrics.mrrAtK - left.metrics.mrrAtK ||
        right.metrics.precisionAtK - left.metrics.precisionAtK ||
        right.metrics.recallAtK - left.metrics.recallAtK
    )
}
```

5. `priorityFailures` 按 nDCG 升序、Recall 升序、误召回数降序、sample ID 升序，输出每条查询最需要人工关注的推荐模式和对应指标。

- [ ] **Step 4: 完善输入拒绝测试**

增加参数化测试，逐项修改固定输入并断言 `validateFailureAnalysisInput` 返回包含明确定位信息的原因：

```ts
it.each([
    [
        'dataset SHA',
        input => ({
            ...input,
            reports: input.reports.map(report => ({
                ...report,
                metadata: { ...report.metadata, datasetSha256: 'other-sha' },
            })),
        }),
    ],
    [
        'missing query',
        input => ({
            ...input,
            reports: input.reports.map(report => ({
                ...report,
                queries: report.queries.filter(query => query.sampleId !== 'q-2'),
            })),
        }),
    ],
    [
        'topK mismatch',
        input => ({
            ...input,
            reports: input.reports.map((report, index) => (index === 1 ? { ...report, config: { ...report.config, topK: 10 } } : report)),
        }),
    ],
    [
        'duplicate retrieved chunk',
        input => ({
            ...input,
            reports: input.reports.map(report => ({
                ...report,
                queries: report.queries.map(query =>
                    query.sampleId === 'q-1' ? { ...query, retrievedChunkIds: ['core-3', 'core-3'] } : query
                ),
            })),
        }),
    ],
] as const)('rejects %s', (_label, mutate) => {
    expect(validateFailureAnalysisInput(mutate(createInputWithThreeQueries()))).not.toEqual([])
})
```

同时覆盖缺少模式、重复模式、查询 ID 与数据集不一致和 `retrievedResults`/`retrievedChunkIds` 不一致。纯模块不得静默修复这些输入。

- [ ] **Step 5: 运行测试、构建并提交**

Run:

```bash
pnpm --filter @ai-workflow/ai-engine test -- failure-analysis.test.ts
pnpm --filter @ai-workflow/ai-engine build
```

Expected: 所有失败分析测试 PASS，ai-engine build PASS。

```bash
git add packages/ai-engine/src/knowledge/evaluation/failure-analysis.ts \
  packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts
git commit -m "feat: compare RAG retrieval failure modes"
```

### Task 3: 实现 `analyze:rag` CLI 和原子报告写入

**Files:**

- Create: `apps/workflow/scripts/analyze-rag.ts`
- Modify: `apps/workflow/package.json`
- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis-cli.test.ts`

**Interfaces:**

- Consumes: Task 1/2 的 `analyzeRagFailure`、`validateFailureAnalysisInput`、`parseEvaluationDataset`、`validateEvaluationReport`。
- Produces: `parseFailureAnalysisCliArgs(argv)`、`renderFailureAnalysisMarkdown(result)`、`writeFailureAnalysisReports(outputDir, result)`、`main(argv)`；命令名为 `pnpm --filter @ai-workflow/workflow analyze:rag -- ...`。

- [ ] **Step 1: 写 CLI 参数和成功写入测试**

CLI 测试使用 `mkdtemp` 创建临时目录，写入最小 JSONL 和三模式报告，再调用导出的 `main` 或写入函数；不得连接数据库或 Qdrant。参数解析断言如下：

```ts
expect(
    parseFailureAnalysisCliArgs([
        '--dataset',
        'docs/evaluation.jsonl',
        '--report',
        'docs/baseline.report.json',
        '--output-dir',
        'docs/analysis',
    ])
).toEqual({
    datasetPath: 'docs/evaluation.jsonl',
    reportPath: 'docs/baseline.report.json',
    outputDir: 'docs/analysis',
})
expect(() => parseFailureAnalysisCliArgs(['--dataset', 'dataset.jsonl'])).toThrow('--report is required')
expect(() => parseFailureAnalysisCliArgs(['--report', 'report.json'])).toThrow('--dataset is required')
```

成功用例必须断言：输出目录自动创建、JSON 可解析、Markdown 包含数据集 SHA/三种模式/覆盖汇总/重点失败查询，且没有 `.tmp` 文件残留。

- [ ] **Step 2: 运行 CLI 测试确认失败**

Run:

```bash
pnpm --filter @ai-workflow/ai-engine test -- failure-analysis-cli.test.ts
```

Expected: FAIL because `analyze-rag.ts` and its exported helpers do not exist.

- [ ] **Step 3: 实现 CLI 参数、路径和输入读取**

在 `analyze-rag.ts` 中复用现有 `evaluate-rag.ts` 的简单长选项风格，只接受：

```ts
export interface FailureAnalysisCliOptions {
    datasetPath: string
    reportPath: string
    outputDir: string
}

export function parseFailureAnalysisCliArgs(argv: readonly string[]): FailureAnalysisCliOptions
```

默认 `outputDir` 为 `docs/rag/evaluation/analyses`。`--dataset`、`--report`、`--output-dir` 都支持 `--name value` 和 `--name=value`，支持包管理器传入的 `--`；未知参数、缺值和重复参数都抛出带选项名的 `CliConfigError`。

读取流程固定为：

1. 通过 `git rev-parse --show-toplevel` 得到仓库根目录，失败时使用 `process.cwd()`；同时读取 `git rev-parse HEAD`，失败时记录 `unknown`。
2. 相对路径优先按仓库根目录解析；读取 dataset 原文并用 `createHash('sha256')` 计算 SHA-256，再调用 `parseEvaluationDataset`。
3. 读取 report JSON，要求顶层 `reports` 是数组；逐个报告调用 `validateEvaluationReport`，随后转为 Task 1 的 `EvaluationReport` 输入。缺失/解析失败/结构失败必须包装成 `CliConfigError` 并包含实际路径。
4. 从报告顶层 `dataset.sha256`（若存在）和每个模式 metadata 的 `datasetSha256` 一并校验；最终以文件原文计算值为准，任何冲突都拒绝运行。

- [ ] **Step 4: 实现原子 JSON/Markdown 写入和 Markdown 渲染**

使用现有 annotation CLI 的模式：`mkdir(..., { recursive: true })`，为 JSON 和 Markdown 分别生成 `randomUUID()` 临时文件，先完整 `writeFile`，再分别 `rename` 到最终文件，`finally` 中 `unlink(...).catch(() => undefined)` 清理临时文件。输出文件名固定为：

```ts
const jsonPath = resolve(outputDir, `${stem}.failure-analysis.json`)
const markdownPath = resolve(outputDir, `${stem}.failure-analysis.md`)
```

其中 `stem` 来自报告路径 basename 去除 `.report.json`；因此 v1 产生 `prometheus-global-guardian-v1.failure-analysis.json` 和 `.md`。

Markdown 必须包含以下固定段落：

```md
# RAG Retrieval Failure Analysis

## Dataset and baseline

## Mode summary

## Priority failure queries

## Query-by-query diagnostics

## Interpretation boundary
```

模式 summary 表包含 query count、complete/partial/zero、background-only、false positives、平均误召回、Precision、Recall、MRR、nDCG、p50/p95 latency；逐查询段落包含漏召回 ID、误召回 ID、核心遗漏、covered ratio 和原始指标。最后明确说明推荐关注模式只是确定性审阅排序，不是自动根因证明。

- [ ] **Step 5: 接入 package script 和 CLI 主流程**

在 `apps/workflow/package.json` 增加：

```json
"analyze:rag": "../../packages/ai-engine/node_modules/.bin/tsx scripts/analyze-rag.ts"
```

`main(argv)` 的成功路径构造：

```ts
const result = analyzeRagFailure({
    dataset,
    datasetSha256,
    datasetPath: relative(gitContext.workspaceRoot, datasetPath),
    reportPath: relative(gitContext.workspaceRoot, reportPath),
    gitRevision: gitContext.revision,
    generatedAt: new Date().toISOString(),
    reports,
})
await writeFailureAnalysisReports(outputDir, result)
process.stdout.write(`[analyze:rag] wrote ${jsonPath}\n`)
process.stdout.write(`[analyze:rag] wrote ${markdownPath}\n`)
return 0
```

输入错误返回 2，文件/分析/写入错误返回 1；不在 CLI 中吞掉错误，也不创建数据库连接。

- [ ] **Step 6: 增加失败清理测试并运行 CLI 测试**

通过给输出目录设置不可写目标或注入一个会失败的 `writeFile` 依赖，断言 `writeFailureAnalysisReports` reject，并检查目标目录没有最终半成品和随机后缀 `.tmp` 文件。另测：不存在的 dataset/report、非法 JSON、非法 JSONL、报告缺少一个必需模式、SHA/查询/Top-K 不匹配，均返回非零码并输出具体原因。

Run:

```bash
pnpm --filter @ai-workflow/ai-engine test -- failure-analysis-cli.test.ts
pnpm --filter @ai-workflow/workflow typecheck
```

Expected: CLI tests PASS，Workflow typecheck PASS。

- [ ] **Step 7: 提交 CLI**

```bash
git add apps/workflow/scripts/analyze-rag.ts \
  apps/workflow/package.json \
  packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis-cli.test.ts
git commit -m "feat: add offline RAG failure analysis CLI"
```

### Task 4: 运行真实 v1 基线分析并加入版本化产物

**Files:**

- Create: `docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.json`
- Create: `docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.md`

**Interfaces:**

- Consumes: 已提交的冻结数据集 `docs/rag/evaluation/prometheus-global-guardian-v1.jsonl` 和基线 `docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.json`。
- Produces: 可由同一 CLI 重新生成的 JSON/Markdown v1 失败分析；不修改数据集、基线报告或检索实现。

- [ ] **Step 1: 运行真实 CLI**

Run from repository root:

```bash
pnpm --filter @ai-workflow/workflow analyze:rag -- \
  --dataset docs/rag/evaluation/prometheus-global-guardian-v1.jsonl \
  --report docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.json \
  --output-dir docs/rag/evaluation/analyses
```

Expected: exit code 0，并写出两个固定文件；输入报告的 dataset SHA 应为 `9c3b6b988ed65c59001cb3913a7590f2db73dcd5d0270c16fa45a2ac927df817`，三种模式和 Top-K=5 都出现在 JSON/Markdown 中。

- [ ] **Step 2: 校验真实产物的可重复性和内容**

Run:

```bash
node -e "const fs=require('node:fs'); const x=JSON.parse(fs.readFileSync('docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.json','utf8')); if (x.dataset.sampleCount !== 24 || x.topK !== 5 || JSON.stringify(x.modes) !== JSON.stringify(['vector','fulltext','hybrid'])) process.exit(1)"
rg -n "Dataset and baseline|Mode summary|Priority failure queries|vector|fulltext|hybrid|background-only" \
  docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.md
```

再次运行 CLI 到同一目录时，除 `generatedAt` 和 Git revision 等明确元数据外，诊断集合、计数、排序和指标必须稳定；测试中用固定 `generatedAt` 验证纯函数序列化稳定，不把当前时间写进纯模块内部。

- [ ] **Step 3: 运行完整验证**

Run:

```bash
pnpm --filter @ai-workflow/ai-engine test -- failure-analysis.test.ts failure-analysis-cli.test.ts
pnpm --filter @ai-workflow/ai-engine build
pnpm typecheck
pnpm lint
pnpm spellcheck
git diff --check
```

Expected: 失败分析测试、ai-engine build、全仓 typecheck、lint、spellcheck 和 diff check 均通过；若 lint 仍报告既有 warning，记录 warning 数量但不得新增 error。

- [ ] **Step 4: 检查版本化产物并提交**

```bash
git status --short
git diff --stat
git add docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.json \
  docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.md
git commit -m "test: add RAG failure analysis baseline"
```

检查提交只包含失败分析模块、CLI、测试、package script 和两个分析产物；不得包含 `apps/webapp/next-env.d.ts`、`apps/workflow/next-env.d.ts` 等其他工作区已有修改。

## 完成后的下一步

完成并验证本计划后，使用分析报告选一个最明确的检索问题做小范围优化，重新运行三模式评测与 v1 基线比较；随后再做第二标注人一致性、无答案查询和 LLM 最终答案质量评测。本计划本身不执行这些后续优化。
