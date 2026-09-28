# 自动化 RAG 检索质量评测实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有 AI Workflow 增加基于人工标注 JSONL 的 RAG 检索质量评测核心、真实检索 CLI、可读报告和质量回归门禁。

**Architecture:** 在 `packages/ai-engine` 增加不依赖外部服务的 evaluation 模块，负责 JSONL 数据校验、Precision/Recall/MRR/nDCG 指标、宏平均和通过依赖注入的检索评测；在 `apps/workflow/scripts/evaluate-rag.ts` 负责读取 Prisma/Qdrant/Ollama 配置、调用共享 Retriever、输出 JSON/Markdown 报告和比较基线。将 API 中现有的 Qdrant 全文适配逻辑抽成 AI Engine 可复用适配器，避免产品检索和评测链路分叉。

**Tech Stack:** TypeScript 5.9、Vitest、Node `fs/promises`、Node `crypto`、Prisma、Qdrant、Ollama、`tsx`。

## Global Constraints

- 评测数据使用 UTF-8 JSONL；每条样例必须包含 `id`、`query`、`knowledgeBaseId` 和至少一个 `relevantChunks`。
- `relevance` 只允许 1、2、3；重复样例 ID、重复 chunk ID、非法 JSON、空查询和空相关集合必须明确报错并指出行号。
- 评测只调用现有 Retriever，不写 Qdrant、不更新 PostgreSQL、不修改知识库。
- 必须分别报告 `Precision@K`、`Recall@K`、`MRR@K`、`nDCG@K`、p50 和 p95；不比较不同检索模式的原始 score。
- 没有已审阅基线时只生成报告；基线的数据集哈希、K、模式或配置不一致时拒绝比较。
- 外部依赖不可用或任意查询失败时 CLI 以非零状态退出，不静默跳过。
- 遵循测试驱动开发：每个生产行为先写一个会失败的测试，再写最小实现。
- 使用 TypeScript 的 `unknown`、判别式联合和 `satisfies`，不得用 `any` 绕过类型检查。

---

## 文件与职责地图

- Create: `packages/ai-engine/src/knowledge/evaluation/types.ts` — 评测集、指标、报告和运行配置的类型。
- Create: `packages/ai-engine/src/knowledge/evaluation/dataset.ts` — JSONL 解析和数据校验。
- Create: `packages/ai-engine/src/knowledge/evaluation/metrics.ts` — 单查询排序指标和宏平均。
- Create: `packages/ai-engine/src/knowledge/evaluation/evaluator.ts` — 注入 Retriever 的逐查询评测和延迟统计。
- Create: `packages/ai-engine/src/knowledge/evaluation/baseline.ts` — 报告元数据校验与质量回归比较。
- Create: `packages/ai-engine/src/knowledge/evaluation/index.ts` — evaluation 公共导出。
- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/dataset.test.ts` — JSONL 解析与错误定位测试。
- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/metrics.test.ts` — Precision/Recall/MRR/nDCG 测试。
- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/evaluator.test.ts` — 确定性 Retriever、参数传递、失败传播和延迟报告测试。
- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/baseline.test.ts` — 基线元数据和回归测试。
- Create: `apps/workflow/scripts/evaluate-rag.ts` — 外部服务评测 CLI。
- Create: `docs/rag/evaluation/example.jsonl` — 仅用于解析和工具端到端测试的演示样例，不是质量基线。
- Create: `docs/rag/evaluation/README.md` — 标注规范、命令、环境变量和报告说明。
- Modify: `packages/ai-engine/src/knowledge/retriever/hybrid-retriever.ts` — 导出全文 provider 的通用类型/适配接口。
- Modify: `packages/ai-engine/src/knowledge/retriever/index.ts`、`packages/ai-engine/src/knowledge/index.ts` — 导出评测与全文适配器。
- Modify: `packages/ai-engine/src/knowledge/store/qdrant-store.ts` — 让 Qdrant 工厂暴露可复用的具体类型，不改变运行行为。
- Modify: `apps/workflow/app/api/knowledge/[id]/search/route.ts` — 使用共享全文 provider，删除 `any` 适配代码。
- Modify: `apps/workflow/package.json` — 增加 `evaluate:rag` 脚本。
- Modify: `package.json` — 如需根级快捷命令，仅增加转发脚本，不增加新依赖。
- Modify: `pnpm-lock.yaml` — 仅当依赖实际变化时修改；预期不新增依赖。

---

### Task 1: 建立评测数据类型和 JSONL 校验

**Files:**

- Create: `packages/ai-engine/src/knowledge/evaluation/types.ts`
- Create: `packages/ai-engine/src/knowledge/evaluation/dataset.ts`
- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/dataset.test.ts`
- Create: `packages/ai-engine/src/knowledge/evaluation/index.ts`
- Modify: `packages/ai-engine/src/knowledge/index.ts`

**Interfaces:**

- Produces `RelevantChunk`, `EvaluationSample`、`EvaluationDataset`、`RetrievalEvaluationConfig`、`QueryEvaluation`、`EvaluationReport` 类型。
- Produces `parseEvaluationDataset(text: string): EvaluationDataset`。
- `EvaluationDataset` 至少包含 `samples`；数据集 SHA-256 由 CLI 读取原始文件后计算，并写入 `EvaluationMetadata`，纯解析函数不得读文件。
- `EvaluationSample.relevantChunks` 使用 `Array<{ chunkId: string; relevance: 1 | 2 | 3 }>`，并通过运行时校验保证等级安全。

- [ ] **Step 1: 写失败测试**

在 `dataset.test.ts` 先写以下行为测试：

```ts
import { describe, expect, it } from 'vitest'
import { parseEvaluationDataset } from '../dataset'

describe('parseEvaluationDataset', () => {
    it('parses valid JSONL and preserves line metadata', () => {
        const dataset = parseEvaluationDataset(
            [
                JSON.stringify({
                    id: 'q-1',
                    query: '如何登录？',
                    knowledgeBaseId: 'kb-1',
                    relevantChunks: [{ chunkId: 'doc-1_0', relevance: 3 }],
                }),
            ].join('\\n')
        )

        expect(dataset.samples[0]).toMatchObject({
            id: 'q-1',
            query: '如何登录？',
            knowledgeBaseId: 'kb-1',
        })
        expect(dataset.samples[0]?.relevantChunks).toEqual([{ chunkId: 'doc-1_0', relevance: 3 }])
    })

    it('reports the JSONL line for invalid input', () => {
        expect(() => parseEvaluationDataset('invalid-json')).toThrow('line 1')
    })

    it.each([
        ['empty query', { id: 'q-1', query: '', knowledgeBaseId: 'kb-1', relevantChunks: [{ chunkId: 'c-1', relevance: 1 }] }],
        ['empty relevant chunks', { id: 'q-1', query: '登录', knowledgeBaseId: 'kb-1', relevantChunks: [] }],
        ['invalid relevance', { id: 'q-1', query: '登录', knowledgeBaseId: 'kb-1', relevantChunks: [{ chunkId: 'c-1', relevance: 4 }] }],
    ])('rejects %s', (_, sample) => {
        expect(() => parseEvaluationDataset(JSON.stringify(sample))).toThrow()
    })

    it('rejects duplicate sample IDs and duplicate relevant chunk IDs', () => {
        const sample = JSON.stringify({
            id: 'q-1',
            query: '登录',
            knowledgeBaseId: 'kb-1',
            relevantChunks: [
                { chunkId: 'c-1', relevance: 1 },
                { chunkId: 'c-1', relevance: 3 },
            ],
        })
        expect(() => parseEvaluationDataset([sample, sample].join('\\n'))).toThrow(/duplicate/i)
    })
})
```

- [ ] **Step 2: 运行测试确认失败**

运行：`pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/dataset.test.ts`

预期：FAIL，原因是 `../dataset` 和评测类型尚不存在。

- [ ] **Step 3: 实现最小类型和解析器**

使用 `unknown` 解析 JSON，并在 `dataset.ts` 内按行验证对象字段。错误消息格式固定为 `Invalid evaluation sample at line <n>: <reason>`。忽略文件末尾空行，但中间空行必须报错。导出唯一公共函数：

```ts
export function parseEvaluationDataset(text: string): EvaluationDataset
```

用 `isRecord(value: unknown): value is Record<string, unknown>`、`isPositiveInteger` 和 `isRelevance` 做类型收窄，不使用 `as any`。完成后从 knowledge index 导出 evaluation index。

- [ ] **Step 4: 运行测试确认通过**

运行：`pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/dataset.test.ts`

预期：所有数据解析、校验和错误定位测试 PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/ai-engine/src/knowledge/evaluation packages/ai-engine/src/knowledge/index.ts
git commit -m "feat: add RAG evaluation dataset validation"
```

---

### Task 2: 实现排序指标和宏平均

**Files:**

- Create: `packages/ai-engine/src/knowledge/evaluation/metrics.ts`
- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/metrics.test.ts`
- Modify: `packages/ai-engine/src/knowledge/evaluation/types.ts`

**Interfaces:**

- Produces `calculateRankingMetrics(retrievedChunkIds: readonly string[], relevantChunks: readonly RelevantChunk[], k: number): RankingMetrics`。
- Produces `aggregateRankingMetrics(metrics: readonly RankingMetrics[]): RankingMetrics`。
- `RankingMetrics` 字段为 `precisionAtK`、`recallAtK`、`mrrAtK`、`ndcgAtK`，均为有限的 `number`。
- K 必须是正整数；相关 chunk 集合非空由数据层保证，函数仍对空集合抛出明确错误。

- [ ] **Step 1: 写失败测试**

覆盖以下确定性案例：

```ts
import { describe, expect, it } from 'vitest'
import { aggregateRankingMetrics, calculateRankingMetrics } from '../metrics'

describe('calculateRankingMetrics', () => {
    it('scores a perfect ranking', () => {
        expect(
            calculateRankingMetrics(
                ['c-1', 'c-2', 'c-3'],
                [
                    { chunkId: 'c-1', relevance: 3 },
                    { chunkId: 'c-2', relevance: 1 },
                ],
                3
            )
        ).toEqual({
            precisionAtK: 2 / 3,
            recallAtK: 1,
            mrrAtK: 1,
            ndcgAtK: 1,
        })
    })

    it('penalizes a relevant result that is ranked below an irrelevant result', () => {
        expect(
            calculateRankingMetrics(
                ['c-3', 'c-1', 'c-2'],
                [
                    { chunkId: 'c-1', relevance: 3 },
                    { chunkId: 'c-2', relevance: 1 },
                ],
                3
            ).mrrAtK
        ).toBe(1 / 2)
    })

    it('uses graded relevance for nDCG and returns zero for no hit', () => {
        const metrics = calculateRankingMetrics(['irrelevant'], [{ chunkId: 'relevant', relevance: 3 }], 1)
        expect(metrics).toEqual({ precisionAtK: 0, recallAtK: 0, mrrAtK: 0, ndcgAtK: 0 })
    })

    it('rejects invalid K and aggregates macro averages', () => {
        expect(() => calculateRankingMetrics([], [{ chunkId: 'c-1', relevance: 1 }], 0)).toThrow()
        expect(aggregateRankingMetrics([{ precisionAtK: 1, recallAtK: 1, mrrAtK: 1, ndcgAtK: 1 }])).toEqual({
            precisionAtK: 1,
            recallAtK: 1,
            mrrAtK: 1,
            ndcgAtK: 1,
        })
    })
})
```

- [ ] **Step 2: 运行测试确认失败**

运行：`pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/metrics.test.ts`

预期：FAIL，原因是 `metrics.ts` 尚不存在。

- [ ] **Step 3: 实现公式**

```ts
const gain = (relevance: number) => 2 ** relevance - 1
const discount = (rank: number) => 1 / Math.log2(rank + 1)

export function calculateRankingMetrics(
    retrievedChunkIds: readonly string[],
    relevantChunks: readonly RelevantChunk[],
    k: number
): RankingMetrics {
    // 按前 k 个结果计算二值指标；首次命中计算 MRR；
    // DCG 使用结果顺序的 graded relevance，IDCG 使用 relevance 降序排序。
}
```

实现时对 retrieved IDs 去重：只有第一次出现参与排序，防止重复结果人为提高 Recall 或 nDCG。Precision 分母固定为 K；Recall 分母为相关 chunk 数；nDCG 在 IDCG 大于 0 时归一化。宏平均对每个查询等权，不按结果数量加权。

- [ ] **Step 4: 运行测试确认通过**

运行：`pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/metrics.test.ts`

预期：所有指标和宏平均测试 PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/ai-engine/src/knowledge/evaluation
git commit -m "feat: add RAG ranking metrics"
```

---

### Task 3: 实现 Retriever 评测编排和延迟统计

**Files:**

- Create: `packages/ai-engine/src/knowledge/evaluation/evaluator.ts`
- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/evaluator.test.ts`
- Modify: `packages/ai-engine/src/knowledge/evaluation/types.ts`
- Modify: `packages/ai-engine/src/knowledge/evaluation/index.ts`

**Interfaces:**

- Produces `evaluateRetrievalDataset(retriever, dataset, config, dependencies?): Promise<EvaluationReport>`。
- `config` 包含 `mode`、`topK`、`threshold` 和可选 `vectorWeight`。
- 每条样例调用：
  `retriever.retrieve({ query: sample.query, knowledgeBaseIds: [sample.knowledgeBaseId], mode: config.mode, topK: config.topK, threshold: config.threshold, vectorWeight: config.vectorWeight })`。
- `dependencies.now` 默认使用 `performance.now`，测试传入递增函数；延迟使用毫秒浮点数。
- Produces `EvaluationReport`，包含 `mode`、`config`、`sampleCount`、`metrics`、`latencyMs: { p50, p95 }` 和每个样例的 `queries`。

- [ ] **Step 1: 写失败测试**

使用一个实现 `RetrieverService` 的确定性 fake，根据 query 返回固定结果，并断言：

1. 评测器传递正确的 mode、topK、threshold、vectorWeight 和知识库 ID；
2. 每条结果生成 chunk ID 列表并计算指标；
3. 传入 `now: () => [0, 10, 30, 70, 100]` 时 p50/p95 可计算；
4. Retriever 抛错时，`evaluateRetrievalDataset` reject 原错误且不返回部分成功报告。

测试 fake 必须满足以下接口，不用 `any`：

```ts
const retriever: RetrieverService = {
    async retrieve(options) {
        return options.query === 'q-1'
            ? [{ chunkId: 'c-1', content: '', chunkIndex: 0, documentId: 'd-1', knowledgeBaseId: 'kb-1', score: 1 }]
            : []
    },
}
```

- [ ] **Step 2: 运行测试确认失败**

运行：`pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/evaluator.test.ts`

预期：FAIL，原因是 `evaluator.ts` 尚不存在。

- [ ] **Step 3: 实现最小编排**

顺序处理 dataset.samples，调用 `calculateRankingMetrics`，保留 chunk ID 和 score 供报告审阅；延迟数组按升序计算最近秩 p50/p95（索引使用 `Math.ceil(percentile * n) - 1` 并限制到合法范围）。任一查询异常立即抛出带样例 ID 的错误：

```ts
throw new Error(`Evaluation failed for sample ${sample.id}: ${message}`)
```

- [ ] **Step 4: 运行测试确认通过**

运行：`pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/evaluator.test.ts`

预期：评测编排、参数、延迟和失败传播测试 PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/ai-engine/src/knowledge/evaluation
git commit -m "feat: evaluate retriever quality on labeled data"
```

---

### Task 4: 抽取 Qdrant 全文适配器并让 API、CLI 共用

**Files:**

- Create: `packages/ai-engine/src/knowledge/retriever/qdrant-fulltext-provider.ts`
- Modify: `packages/ai-engine/src/knowledge/retriever/hybrid-retriever.ts`
- Modify: `packages/ai-engine/src/knowledge/retriever/index.ts`
- Modify: `packages/ai-engine/src/knowledge/store/qdrant-store.ts`
- Modify: `packages/ai-engine/src/knowledge/index.ts`
- Modify: `apps/workflow/app/api/knowledge/[id]/search/route.ts`
- Test: `packages/ai-engine/src/knowledge/__tests__/retriever.test.ts` (add adapter test)

**Interfaces:**

- Produces `TextSearchService`:
  `textSearch(options: { query: string; knowledgeBaseIds: string[]; topK: number }): Promise<VectorSearchResult[]>`.
- Produces `createQdrantFulltextProvider(service: TextSearchService): FulltextSearchProvider`。
- `createQdrantVectorStore(config?)` returns `QdrantVectorStore` rather than only `VectorStoreService`; the concrete class already implements public `textSearch`, so no runtime behavior changes.
- Adapter maps each `VectorSearchResult` to `RetrievalResult` without `any` and preserves chunk ID, content, document ID, knowledge base ID, score and metadata.

- [ ] **Step 1: 写失败测试**

在现有 retriever 测试中增加：

```ts
it('adapts Qdrant text search results to a fulltext provider', async () => {
    const provider = createQdrantFulltextProvider({
        async textSearch() {
            return [
                {
                    chunkId: 'c-1',
                    content: '登录说明',
                    chunkIndex: 0,
                    documentId: 'd-1',
                    knowledgeBaseId: 'kb-1',
                    score: 0.9,
                },
            ]
        },
    })

    await expect(provider.search({ query: '登录', knowledgeBaseIds: ['kb-1'], topK: 5 })).resolves.toEqual([
        {
            chunkId: 'c-1',
            content: '登录说明',
            chunkIndex: 0,
            documentId: 'd-1',
            knowledgeBaseId: 'kb-1',
            score: 0.9,
        },
    ])
})
```

- [ ] **Step 2: 运行测试确认失败**

运行：`pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/__tests__/retriever.test.ts`

预期：FAIL，原因是适配器尚未导出。

- [ ] **Step 3: 实现适配器并替换 API 内联逻辑**

在 AI Engine 导出 `TextSearchService` 和 `createQdrantFulltextProvider`。将 API route 的 `FulltextSearchProvider`、`RetrievalResult` 和两个 `any` cast 删除，改为：

```ts
const vectorStore = createQdrantVectorStore({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    collectionName: 'knowledge_chunks',
})
const fulltextProvider = createQdrantFulltextProvider(vectorStore)
const retriever = createHybridRetriever(embeddingService, vectorStore, fulltextProvider)
```

修改工厂返回类型时确认现有 `VectorStoreService` 消费者仍能赋值；不要修改 Qdrant 查询、过滤或评分逻辑。

- [ ] **Step 4: 运行测试和类型检查**

运行：

```bash
pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/__tests__/retriever.test.ts
pnpm --filter @ai-workflow/ai-engine typecheck
pnpm --filter @ai-workflow/workflow typecheck
```

预期：Retriever 测试和两个 package 类型检查均通过。

- [ ] **Step 5: 提交**

```bash
git add packages/ai-engine/src/knowledge apps/workflow/app/api/knowledge/[id]/search/route.ts
git commit -m "refactor: share Qdrant fulltext retrieval adapter"
```

---

### Task 5: 增加基线比较和报告模型

**Files:**

- Create: `packages/ai-engine/src/knowledge/evaluation/baseline.ts`
- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/baseline.test.ts`
- Modify: `packages/ai-engine/src/knowledge/evaluation/types.ts`
- Modify: `packages/ai-engine/src/knowledge/evaluation/index.ts`

**Interfaces:**

- Produces `EvaluationMetadata`，至少包含 `datasetSha256`、`topK`、`mode`、`knowledgeBaseIds` 和 `retrievalConfig`。
- Produces `compareWithBaseline(current: EvaluationReport, baseline: EvaluationReport, tolerances?: Partial<MetricTolerances>): BaselineComparison`。
- `MetricTolerances` 默认每个质量指标允许下降 0；只比较 Precision、Recall、MRR、nDCG，不比较延迟。
- `BaselineComparison` 包含 `compatible`、`passed` 和每项 `deltas`；元数据不兼容时 `compatible=false`、`passed=false`，并列出原因。

- [ ] **Step 1: 写失败测试**

构造同一元数据的 current/baseline：

- current 指标等于 baseline 时通过；
- Recall 下降 0.01 且容忍度为 0 时失败；
- Recall 下降 0.01 且容忍度为 0.02 时通过；
- datasetSha256、K 或 mode 不同时拒绝比较；
- latency 变化不影响质量门禁。

- [ ] **Step 2: 运行测试确认失败**

运行：`pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/baseline.test.ts`

预期：FAIL，原因是基线比较函数尚不存在。

- [ ] **Step 3: 实现元数据校验和比较**

比较前要求 current 与 baseline 的 `datasetSha256`、`topK`、`mode`、`knowledgeBaseIds` 和 `retrievalConfig` 深度一致。对四个质量指标计算 `current - baseline`，当 delta 小于负容忍度时标记失败。报告用稳定的字段顺序序列化，便于 diff。

- [ ] **Step 4: 运行测试确认通过**

运行：`pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/baseline.test.ts`

预期：所有兼容性、容忍度和延迟忽略测试 PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/ai-engine/src/knowledge/evaluation
git commit -m "feat: add RAG evaluation baseline regression checks"
```

---

### Task 6: 实现真实服务 CLI、报告和演示数据

**Files:**

- Create: `apps/workflow/scripts/evaluate-rag.ts`
- Create: `docs/rag/evaluation/example.jsonl`
- Create: `docs/rag/evaluation/README.md`
- Modify: `apps/workflow/package.json`
- Modify: `package.json` (only if a root forwarding script is useful)
- Test: `packages/ai-engine/src/knowledge/evaluation/__tests__/evaluator.test.ts` (keep service-free tests here)

**Interfaces:**

- CLI command: `pnpm --filter @ai-workflow/workflow evaluate:rag -- --dataset docs/rag/evaluation/example.jsonl --mode vector --top-k 5 --output-dir .tmp/rag-evaluation`.
- Required options: `--dataset` and one or more `--mode vector|fulltext|hybrid`; defaults: `--top-k 5`、threshold read from Knowledge Base、vector weight read from Knowledge Base、`--output-dir .tmp/rag-evaluation`.
- Optional options: `--baseline <path>` (one baseline report per selected mode), `--threshold <0..1>`、`--vector-weight <0..1>`、`--top-k <positive integer>`.
- Exit code 2 for CLI/data/config errors; exit code 1 for retrieval failure or failed baseline gate; exit code 0 for report-only success or passing comparison.
- Produces `<output-dir>/report.json` and `<output-dir>/report.md`; multiple modes are represented as a `reports` array in JSON and separate Markdown sections.
- The demo JSONL must use visibly fake IDs and be documented as a parser/tool sample; the CLI should fail against it unless those IDs exist in a real database/Qdrant collection.

- [ ] **Step 1: 写失败测试/先做离线命令契约**

在 `README.md` 先写 command contract and expected error behavior。Add an offline parser test or a small exported `parseCliArgs` function test in a new `apps/workflow/scripts/__tests__/evaluate-rag.test.ts` only if the existing test setup can discover it; otherwise keep argument parsing as a pure function in the script and test it through a temporary direct import with no service connection. The first test must verify missing `--dataset` and invalid `--mode` reject before Prisma/Qdrant are initialized.

- [ ] **Step 2: 运行测试确认失败**

运行：`pnpm --filter @ai-workflow/workflow typecheck`

预期：FAIL，原因是 CLI 文件和 argument parser 尚不存在。

- [ ] **Step 3: 实现 CLI**

实现以下顺序，避免依赖错误被吞掉：

1. 解析参数并校验路径、模式、K、阈值和权重；
2. 用 `fs.readFile` 读取 JSONL，计算 SHA-256，再调用 `parseEvaluationDataset`；
3. 按样例的 `knowledgeBaseId` 查询 Prisma `knowledgeBase`，若不存在或不同用户无关则报错；CLI 使用明确传入的知识库 ID，不调用当前用户权限逻辑；
4. 为每个知识库创建 `createOllamaEmbeddingService({ model, dimensions, baseUrl: process.env.OLLAMA_BASE_URL })`、`createQdrantVectorStore({ url: process.env.QDRANT_URL || 'http://localhost:6333', collectionName: 'knowledge_chunks' })` 和共享全文 provider；
5. 用 `createHybridRetriever` 运行选定模式，传入数据库中的 `topK`、`threshold`、`vectorWeight`，再应用命令行覆盖；
6. 将每个模式的 `EvaluationReport` 扩展为带 Git revision、数据集哈希、Embedding 配置、collection 和 Knowledge Base IDs 的 JSON；
7. 用固定 Markdown 模板输出摘要、每个模式的四项质量指标、p50/p95、运行配置、逐查询命中情况和失败详情；
8. 若传入基线，按模式加载对应报告，先调用 `compareWithBaseline`；不兼容或质量回归退出 1；否则退出 0。

读取 Prisma 和外部服务失败必须进入顶层 `catch`，写 stderr 并设置非零退出码；不要用 `process.exit(0)` 掩盖异常。脚本被 import 时不得自动执行，使用 `if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()` 或等价的可测试入口。

- [ ] **Step 4: 运行离线检查和演示数据校验**

运行：

```bash
pnpm --filter @ai-workflow/workflow typecheck
pnpm --filter @ai-workflow/ai-engine test
pnpm exec prettier --check apps/workflow/scripts/evaluate-rag.ts docs/rag/evaluation
```

预期：类型检查通过；AI Engine 评测和现有单测通过；文档、样例和脚本格式通过。使用不存在的演示 ID 运行 CLI 时，预期明确报告 Knowledge Base 不存在并返回非零状态。

- [ ] **Step 5: 提交**

```bash
git add apps/workflow/package.json apps/workflow/scripts docs/rag/evaluation package.json
git commit -m "feat: add RAG retrieval evaluation CLI"
```

---

### Task 7: 文档、整体验证和清单回写

**Files:**

- Modify: `docs/project-optimization-checklist.md`
- Modify: `docs/rag/evaluation/README.md`
- Modify: `docs/project-plan.md` (state that the evaluation mechanism is implemented; do not claim a real quality baseline until labels exist)

**Interfaces:**

- Documentation states the exact commands, data format, metric meaning, failure behavior, baseline policy, and distinction between demo sample and real labeled data.
- The optimization item `OPT-000` is only marked complete for the mechanism after automated tests and CLI implementation pass; the document separately records that the real labeled quality baseline remains pending.

- [ ] **Step 1: 先运行完整验证**

运行：

```bash
pnpm --filter @ai-workflow/ai-engine test
pnpm typecheck
pnpm exec prettier --check packages/ai-engine/src/knowledge/evaluation apps/workflow/scripts docs/rag/evaluation docs/project-optimization-checklist.md docs/project-plan.md
pnpm exec cspell lint --dot --gitignore --color --show-suggestions '(packages|apps)/**/*.@(html|js|cjs|mjs|ts|tsx|css|scss|md)'
git diff --check
```

预期：评测单测全部通过；全仓类型检查通过；格式、拼写和 diff 空白检查通过。若真实 Qdrant/Ollama 未启动，只报告真实服务集成评测未执行，不把单测结果当作集成通过。

- [ ] **Step 2: 更新文档状态**

在 `OPT-000` 增加“评测机制已实现；真实标注集/质量基线待补充”的状态，保留真实数据人工标注未完成的事实；在 `docs/project-plan.md` 的 RAG 能力段落增加 CLI 路径、指标和运行命令。

- [ ] **Step 3: 复查变更范围**

运行：

```bash
git status --short
git diff --stat HEAD~7..HEAD
git diff --check
```

确认没有提交生成报告、真实环境密钥、临时输出目录、Qdrant 数据或未经请求的业务行为改动。

- [ ] **Step 4: 提交**

```bash
git add packages/ai-engine/src/knowledge/evaluation packages/ai-engine/src/knowledge/retriever packages/ai-engine/src/knowledge/store/qdrant-store.ts apps/workflow/app/api/knowledge/[id]/search/route.ts apps/workflow/package.json apps/workflow/scripts docs/rag/evaluation docs/project-optimization-checklist.md docs/project-plan.md package.json
git commit -m "feat: automate RAG retrieval quality evaluation"
```

---

## Self-Review Checklist

- [ ] 设计中的数据格式、人工标注约束和 chunk 变更风险均有 Task 1/6/7 对应。
- [ ] Precision、Recall、MRR、nDCG 和宏平均均有 Task 2 的测试与实现。
- [ ] Retriever 参数、失败传播和延迟 p50/p95 均有 Task 3 覆盖。
- [ ] API 与 CLI 共用 Qdrant 全文适配器，Task 4 防止检索逻辑漂移。
- [ ] 基线数据集哈希、K、模式和质量容忍度均有 Task 5 覆盖。
- [ ] JSON/Markdown 报告、退出码、依赖缺失行为和 demo 语料均有 Task 6 覆盖。
- [ ] CI 默认单测与真实依赖集成评测的边界、文档和清单状态均有 Task 7 覆盖。
- [ ] 计划中没有 `TBD`、`TODO`、`implement later` 或未定义接口。
- [ ] 预期不新增依赖；如实现需要依赖，必须先更新计划中的 lockfile 范围并验证。
