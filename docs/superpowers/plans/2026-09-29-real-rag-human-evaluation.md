# 真实人工标注 RAG 评测集与首个质量基线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Prometheus Global Guardian 真实知识库建立 24 条人工标注查询、可审计的候选审阅流程和 vector/fulltext/hybrid 三模式的首个质量基线。

**Architecture:** 在 AI Engine 中增加与外部服务无关的人工标注数据契约和最终数据集转换逻辑；在 workflow 脚本中复用现有 PostgreSQL、Ollama、Qdrant 检索配置，生成完整语料候选池和三模式 top-10 候选。人工审阅完成后，finalize 脚本将 0/1/2/3 决策转换为现有评测 CLI 可读的 JSONL，并由现有 CLI 生成固定 `top-k=5` 的三模式报告。

**Tech Stack:** TypeScript 5.9、Node.js `tsx`、Vitest、Prisma PostgreSQL adapter、Qdrant REST client、Ollama embeddings、UTF-8 JSONL、现有 `evaluate:rag` CLI。

## Global Constraints

- 首个对象固定为 Knowledge Base `cmtjxa48x000dyygofy7skckk`（Prometheus Global Guardian 灾害分析 RAG 知识库）。
- 评测集包含 24 条中文查询，按 8 类意图各 3 条；每条最终样例至少有一个人工确认的 relevance 1–3 chunk。
- 候选检索只提供审阅材料；不得把 vector/fulltext/hybrid 的排序结果自动写成人工标签。
- 审阅等级为 0、1、2、3；最终评测 JSONL 只保存非零的 1、2、3，兼容现有解析器。
- 候选生成和基线运行只读访问 PostgreSQL、Qdrant、Ollama，不写入知识库、文档或向量集合。
- 首个基线固定 `top-k=5`，运行 `vector`、`fulltext`、`hybrid` 三种模式；延迟只报告，不作为质量门禁。
- 文档、切分、embedding、检索参数或人工标签变化后必须创建新的数据集哈希或基线版本，不能静默覆盖旧基线。
- 不提交密钥、`.env` 内容、临时输出目录或未人工确认的报告。

---

## 文件与职责地图

### 新增

- `packages/ai-engine/src/knowledge/evaluation/annotation.ts`：人工标注数据类型、解析和 finalization 纯函数。
- `packages/ai-engine/src/knowledge/evaluation/__tests__/annotation.test.ts`：标注数据校验、缺失决策、非零标签转换和失败定位测试。
- `docs/rag/evaluation/prometheus-global-guardian-v1.queries.jsonl`：24 条真实语料驱动的候选查询。
- `docs/rag/evaluation/prometheus-global-guardian-v1.annotation-guide.md`：标注等级、边界案例和复核流程。
- `apps/workflow/scripts/rag-evaluation-runtime.ts`：候选生成与评测 CLI 共用的 Prisma、Knowledge Base、Retriever 和 embedding 配置加载。
- `apps/workflow/scripts/prepare-rag-annotation.ts`：生成候选审阅 JSONL 与 manifest。
- `apps/workflow/scripts/finalize-rag-annotation.ts`：验证人工决策并生成正式评测 JSONL。

### 修改

- `packages/ai-engine/src/knowledge/store/qdrant-store.ts`：增加只读 `listChunks` 能力，支持按 Knowledge Base 分页读取 payload。
- `packages/ai-engine/src/knowledge/__tests__/qdrant-store.test.ts`：补充完整 chunk 列举的分页和 payload 映射测试。
- `apps/workflow/scripts/evaluate-rag.ts`：改用共享运行时，保持现有 CLI 参数与报告格式不变。
- `apps/workflow/package.json`：增加 `prepare:rag-annotation` 和 `finalize:rag-annotation` 脚本。
- `docs/rag/evaluation/README.md`、`docs/project-optimization-checklist.md`、`docs/project-plan.md`：记录真实集、基线和后续工作。

### 人工审阅后生成并纳入版本控制

- `docs/rag/evaluation/prometheus-global-guardian-v1.review.jsonl`：每条 query 的完整 30 chunk 审阅材料。
- `docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json`：知识库/文档快照、标注者、规则版本和数据集 SHA-256。
- `docs/rag/evaluation/prometheus-global-guardian-v1.jsonl`：finalize 后的正式评测集。
- `docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.json`、`.report.md`：真实三模式首个基线。

---

### Task 1: 增加人工标注数据契约和纯 finalization 核心

**Files:**
- Create: `packages/ai-engine/src/knowledge/evaluation/annotation.ts`
- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/annotation.test.ts`
- Modify: `packages/ai-engine/src/knowledge/evaluation/index.ts`

**Interfaces:**
- Consumes: `EvaluationDataset`、`EvaluationSample`、`RelevantChunk` from `evaluation/types.ts`。
- Produces: `AnnotationQuery`、`AnnotationReview`、`AnnotationCandidate`、`AnnotationManifest`、`parseAnnotationQueries`、`parseAnnotationReviews`、`finalizeAnnotationDataset`。

- [ ] **Step 1: Write failing tests**

测试必须覆盖重复 query ID、未完成的人工作决策、0 标签过滤和分级相关性保留：

```ts
it('rejects duplicate query IDs with the line number', () => {
    const text = [
        JSON.stringify({ id: 'q-1', query: '洪水风险？', intent: 'risk', knowledgeBaseId: 'kb-1' }),
        JSON.stringify({ id: 'q-1', query: '地震记录？', intent: 'hazard', knowledgeBaseId: 'kb-1' }),
    ].join('\n')
    expect(() => parseAnnotationQueries(text)).toThrow('duplicate query ID q-1 on line 2')
})

it('rejects an unreviewed candidate during finalization', () => {
    const review = parseAnnotationReviews(JSON.stringify({
        id: 'q-1', query: '洪水风险？', intent: 'risk', knowledgeBaseId: 'kb-1',
        candidates: [{ chunkId: 'chunk-1', humanRelevance: null, rationale: '' }],
    }))
    expect(() => finalizeAnnotationDataset(review)).toThrow('q-1 has unreviewed candidate chunk-1')
})

it('keeps only non-zero labels and preserves graded relevance', () => {
    const review = parseAnnotationReviews(JSON.stringify({
        id: 'q-1', query: '洪水风险？', intent: 'risk', knowledgeBaseId: 'kb-1',
        candidates: [
            { chunkId: 'chunk-1', humanRelevance: 3, rationale: '直接解释风险判断。' },
            { chunkId: 'chunk-2', humanRelevance: 1, rationale: '提供相关背景。' },
            { chunkId: 'chunk-3', humanRelevance: 0, rationale: '只讨论地震。' },
        ],
    }))
    expect(finalizeAnnotationDataset(review).samples[0]?.relevantChunks).toEqual([
        { chunkId: 'chunk-1', relevance: 3 },
        { chunkId: 'chunk-2', relevance: 1 },
    ])
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @ai-workflow/ai-engine test -- annotation.test.ts`

Expected: FAIL because `../annotation` does not exist.

- [ ] **Step 3: Implement the exact annotation contracts**

`annotation.ts` must define:

```ts
export type HumanRelevance = 0 | 1 | 2 | 3
export interface AnnotationQuery { id: string; query: string; intent: string; knowledgeBaseId: string }
export interface CandidateSource { rank: number; score: number }
export interface AnnotationCandidate {
    chunkId: string; content: string; chunkIndex: number; documentId: string; knowledgeBaseId: string
    candidateSources: Partial<Record<RetrievalMode, CandidateSource>>
    humanRelevance: HumanRelevance | null; rationale: string
}
export interface AnnotationReview {
    id: string; query: string; intent: string; knowledgeBaseId: string; candidates: AnnotationCandidate[]
}
export interface AnnotationManifest {
    datasetVersion: string; knowledgeBaseId: string; knowledgeBaseName: string
    documentId: string; documentName: string; documentSha256: string; chunkCount: number
    chunkSize: number; chunkOverlap: number; embeddingProvider: string; embeddingModel: string
    embeddingDimensions: number; queryCount: number; annotationGuideVersion: string
    annotationStatus: 'candidate' | 'human-reviewed'; annotator: string | null
    reviewedAt: string | null; datasetSha256: string | null
}
export function parseAnnotationQueries(text: string): AnnotationQuery[]
export function parseAnnotationReviews(text: string): AnnotationReview[]
export function finalizeAnnotationDataset(reviews: readonly AnnotationReview[]): EvaluationDataset
```

Validation must reject empty/malformed input, blank fields, duplicate IDs, duplicate candidates, missing candidates, invalid relevance values, null decisions, non-zero decisions without rationale, and samples without a non-zero label. Finalization returns the existing `EvaluationDataset` shape, excludes relevance 0, and sorts relevant chunks by relevance descending then original candidate order.

- [ ] **Step 4: Export the APIs and run tests**

Export the three functions and six public types from `packages/ai-engine/src/knowledge/evaluation/index.ts`, then run `pnpm --filter @ai-workflow/ai-engine test -- annotation.test.ts`.

Expected: all annotation tests PASS.

- [ ] **Step 5: Commit**

Run: `git add packages/ai-engine/src/knowledge/evaluation && git commit -m "feat: add human RAG annotation contracts"`

### Task 2: 固化 24 条真实查询和人工标注指南

**Files:**
- Create: `docs/rag/evaluation/prometheus-global-guardian-v1.queries.jsonl`
- Create: `docs/rag/evaluation/prometheus-global-guardian-v1.annotation-guide.md`
- Modify: `packages/ai-engine/src/knowledge/evaluation/__tests__/annotation.test.ts`

**Interfaces:**
- Consumes: `parseAnnotationQueries` from Task 1。
- Produces: 24 个唯一 query ID，固定 Knowledge Base ID，8 个意图类别各 3 条。

- [ ] **Step 1: Add the 24 query records**

每行字段顺序固定为 `id`、`query`、`intent`、`knowledgeBaseId`。8 个 intent 值为 `scope-boundary`、`workflow-fields`、`hazard-types`、`severity-sources`、`hazard-guidance`、`risk-levels`、`json-contract`、`typical-questions`，每个恰好 3 条。查询直接来自真实知识库章节或典型问题，不能包含文档中没有的实时事件数量、地点、时间、伤亡或预警结论；每类包含直接问法、同义问法和关键词式问法。

- [ ] **Step 2: Add the label guide**

指南必须明确：3=直接回答/主要规则，2=重要但不完整支撑，1=明确主题联系但只能作背景，0=不相关；审阅者必须阅读完整 chunk、不按检索分数判定、为所有候选填写决策、为非零标签填写中文 rationale、保证每条 query 至少一个非零标签。指南还要给出实时事件数量 vs 字段说明、地震震级 vs 损失/官方等级、通用建议 vs 具体撤离指令三个边界例子。

- [ ] **Step 3: Add a deterministic catalog test**

读取 `docs/rag/evaluation/prometheus-global-guardian-v1.queries.jsonl`，断言样例数 24、Knowledge Base ID 全部等于 `cmtjxa48x000dyygofy7skckk`、8 个 intent 各为 3 条、ID 唯一。

- [ ] **Step 4: Run data validation and commit**

Run: `pnpm --filter @ai-workflow/ai-engine test -- annotation.test.ts`

Expected: query catalog test PASS and `24` records validated.

Commit: `git add docs/rag/evaluation/prometheus-global-guardian-v1.queries.jsonl docs/rag/evaluation/prometheus-global-guardian-v1.annotation-guide.md packages/ai-engine/src/knowledge/evaluation/__tests__/annotation.test.ts && git commit -m "docs: add first RAG annotation query catalog"`

### Task 3: 让 Qdrant 和评测运行时支持真实候选池

**Files:**
- Modify: `packages/ai-engine/src/knowledge/store/qdrant-store.ts`
- Modify: `packages/ai-engine/src/knowledge/__tests__/qdrant-store.test.ts`
- Create: `apps/workflow/scripts/rag-evaluation-runtime.ts`
- Modify: `apps/workflow/scripts/evaluate-rag.ts`

**Interfaces:**
- Consumes: existing `QdrantVectorStore.search`/`textSearch`, `RetrieverService`, and `evaluate-rag.ts` runtime setup。
- Produces: `QdrantVectorStore.listChunks(knowledgeBaseIds)` and shared Prisma/Knowledge Base/retriever helpers。

- [ ] **Step 1: Write the failing Qdrant pagination test**

```ts
it('lists all chunks for a knowledge base across scroll pages', async () => {
    client.scroll
        .mockResolvedValueOnce({ points: [payloadPoint('chunk-1')], next_page_offset: 'page-2' })
        .mockResolvedValueOnce({ points: [payloadPoint('chunk-2')], next_page_offset: null })
    await expect(store.listChunks(['kb-1'])).resolves.toEqual([
        expect.objectContaining({ chunkId: 'chunk-1', knowledgeBaseId: 'kb-1' }),
        expect.objectContaining({ chunkId: 'chunk-2', knowledgeBaseId: 'kb-1' }),
    ])
    expect(client.scroll).toHaveBeenNthCalledWith(2, 'knowledge_chunks', expect.objectContaining({ offset: 'page-2' }))
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @ai-workflow/ai-engine test -- qdrant-store.test.ts`

Expected: FAIL because `listChunks` is not defined.

- [ ] **Step 3: Implement read-only Qdrant listing**

Add `listChunks(knowledgeBaseIds: string[]): Promise<VectorSearchResult[]>` to `QdrantVectorStore`. Reject an empty ID list, call `scroll` with the Knowledge Base filter, `with_payload: true`, `with_vector: false`, follow every `next_page_offset`, map payloads with score `0`, wrap failures with `Failed to list chunks`, and never mutate points.

- [ ] **Step 4: Extract shared runtime helpers**

Move the existing private PostgreSQL client creation, Knowledge Base loading, retriever map creation, and dataset retriever adapter from `evaluate-rag.ts` into `rag-evaluation-runtime.ts` with these signatures:

```ts
export async function createEvaluationPrismaClient(): Promise<{ client: PrismaClient; pool: Pool }>
export async function loadKnowledgeBases(client: PrismaClient, ids: readonly string[]): Promise<KnowledgeBaseConfig[]>
export function createRetrieverMap(knowledgeBases: readonly KnowledgeBaseConfig[]): {
    retrievers: Map<string, RetrieverService>; embeddings: EmbeddingConfigReport[]
}
export function createDatasetRetriever(retrievers: Map<string, RetrieverService>): RetrieverService
```

`evaluate-rag.ts` must import these helpers and retain current parameters, output, error codes, and baseline behavior.

- [ ] **Step 5: Run tests, typecheck, and commit**

Run: `pnpm --filter @ai-workflow/ai-engine test -- qdrant-store.test.ts && pnpm --filter @ai-workflow/ai-engine build && pnpm --filter @ai-workflow/workflow typecheck`

Expected: all tests and typecheck PASS.

Commit: `git add packages/ai-engine/src/knowledge apps/workflow/scripts/rag-evaluation-runtime.ts apps/workflow/scripts/evaluate-rag.ts && git commit -m "refactor: share RAG evaluation runtime"`

### Task 4: 实现候选生成和人工审阅文件

**Files:**
- Create: `apps/workflow/scripts/prepare-rag-annotation.ts`
- Modify: `apps/workflow/package.json`
- Create: `packages/ai-engine/src/knowledge/evaluation/__tests__/annotation-cli.test.ts`

**Interfaces:**
- Consumes: query catalog from Task 2, shared runtime and `QdrantVectorStore.listChunks` from Task 3。
- Produces: candidate review JSONL with every corpus chunk and three-mode candidate source information; candidate manifest with document snapshot。

- [ ] **Step 1: Write CLI parsing and output-shape tests**

Test this exact default:

```ts
expect(parseAnnotationCliArgs([
    '--queries', 'docs/rag/evaluation/prometheus-global-guardian-v1.queries.jsonl',
    '--output', 'docs/rag/evaluation/prometheus-global-guardian-v1.review.jsonl',
    '--manifest', 'docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json',
])).toEqual({
    queriesPath: 'docs/rag/evaluation/prometheus-global-guardian-v1.queries.jsonl',
    outputPath: 'docs/rag/evaluation/prometheus-global-guardian-v1.review.jsonl',
    manifestPath: 'docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json',
    topK: 10,
})
```

Also test missing required options, non-positive `--top-k`, duplicate query IDs, and exit-code-2 configuration errors.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @ai-workflow/workflow exec vitest run scripts/annotation-cli.test.ts`

Expected: FAIL because the parser and script do not exist.

- [ ] **Step 3: Implement candidate generation**

The script must load the fixed Knowledge Base and completed document, call vector/fulltext/hybrid with top-10, list the full Qdrant corpus, require the recorded 30 chunks, and emit one review JSON object per query with all 30 chunks exactly once. Each candidate starts with `humanRelevance: null` and `rationale: ''`; `candidateSources` records rank/score only when a mode returns that chunk. The script writes a candidate manifest with document SHA-256, chunking/embedding settings, `annotationStatus: 'candidate'`, `annotator: null`, and `datasetSha256: null`.

Use temporary files followed by rename, disconnect Prisma and close its pool in `finally`, return 2 for invalid input and 1 for service failure, and never print environment values.

- [ ] **Step 4: Add package command and commit**

Add these exact scripts to `apps/workflow/package.json`:

```json
"prepare:rag-annotation": "../../packages/ai-engine/node_modules/.bin/tsx scripts/prepare-rag-annotation.ts",
"finalize:rag-annotation": "../../packages/ai-engine/node_modules/.bin/tsx scripts/finalize-rag-annotation.ts"
```

The help text must show the full first-run command with the three paths and `--top-k 10`. Run the parser tests, then execute:

```bash
git add apps/workflow/scripts/prepare-rag-annotation.ts apps/workflow/package.json packages/ai-engine/src/knowledge/evaluation/__tests__/annotation-cli.test.ts
git commit -m "feat: add RAG annotation candidate generator"
```

Expected: parser and output-shape tests PASS.

### Task 5: 实现人工标注 finalize 和 manifest 固化

**Files:**
- Create: `apps/workflow/scripts/finalize-rag-annotation.ts`
- Modify: `packages/ai-engine/src/knowledge/evaluation/__tests__/annotation-cli.test.ts`

**Interfaces:**
- Consumes: candidate review JSONL and manifest from Task 4。
- Produces: formal evaluation JSONL and human-reviewed manifest with computed dataset SHA-256。

- [ ] **Step 1: Write failing finalize tests**

Cover these exact cases:

```ts
it('fails with exit code 2 when any human decision is null', async () => {
    const code = await main(['--review', 'review.jsonl', '--manifest', 'manifest.json', '--dataset', 'dataset.jsonl', '--annotator', 'project-owner'])
    expect(code).toBe(2)
})

it('writes only non-zero relevance labels', async () => {
    const code = await main(['--review', 'review.jsonl', '--manifest', 'manifest.json', '--dataset', 'dataset.jsonl', '--annotator', 'project-owner'])
    expect(code).toBe(0)
    expect(await readFile('dataset.jsonl', 'utf8')).toContain('"relevance":3')
    expect(await readFile('dataset.jsonl', 'utf8')).not.toContain('"relevance":0')
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @ai-workflow/workflow exec vitest run scripts/annotation-cli.test.ts`

Expected: FAIL because `finalize-rag-annotation.ts` does not exist.

- [ ] **Step 3: Implement finalize CLI**

Require `--review`、`--manifest`、`--dataset`、`--annotator`; let `--reviewed-at` default to the current ISO timestamp. Read the review and manifest, call `finalizeAnnotationDataset`, reject missing decisions, missing rationale, duplicate candidates, no relevant chunk, or Knowledge Base mismatch with exit code 2, then write deterministic JSONL and compute its SHA-256. Update the manifest to `annotationStatus: 'human-reviewed'`, the supplied annotator, reviewed timestamp, and dataset hash. Use atomic writes and never alter the review file.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm --filter @ai-workflow/workflow exec vitest run scripts/annotation-cli.test.ts`

Expected: all finalize tests PASS.

Commit: `git add apps/workflow/scripts/finalize-rag-annotation.ts packages/ai-engine/src/knowledge/evaluation/__tests__/annotation-cli.test.ts && git commit -m "feat: finalize human RAG labels"`

### Task 6: 生成真实候选集并停止等待人工审阅

**Files:**
- Generate: `docs/rag/evaluation/prometheus-global-guardian-v1.review.jsonl`
- Generate: `docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json`

**Interfaces:**
- Consumes: live PostgreSQL, Qdrant, Ollama, and the 24-query catalog。
- Produces: 24 review records × 30 complete corpus chunks, each with blank human decision。

- [ ] **Step 1: Verify external services without exposing credentials**

Run `curl --fail --silent http://localhost:6333/healthz >/dev/null` and `curl --fail --silent http://localhost:11434/api/tags >/dev/null`.

Expected: both commands exit 0; database connectivity is verified by the Knowledge Base query inside the generator.

- [ ] **Step 2: Run the candidate generator**

Run:

```bash
pnpm --filter @ai-workflow/workflow prepare:rag-annotation -- \
  --queries docs/rag/evaluation/prometheus-global-guardian-v1.queries.jsonl \
  --output docs/rag/evaluation/prometheus-global-guardian-v1.review.jsonl \
  --manifest docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json \
  --top-k 10
```

Expected: the command reports 24 queries, 30 chunks, and three retrieval modes; manifest status is `candidate`; no final dataset or baseline is created.

- [ ] **Step 3: Validate candidate completeness**

Run a read-only validator that asserts 24 lines, 30 unique candidates per line, one Knowledge Base ID, and `humanRelevance: null` for every candidate.

Expected: PASS; any non-null label is an error because labels must come from the human review step.

- [ ] **Step 4: Hand off the manual checkpoint**

Open the review file and ask the annotator to fill every `humanRelevance` and every non-zero `rationale` according to `docs/rag/evaluation/prometheus-global-guardian-v1.annotation-guide.md`. Stop here until the file has all 720 candidate decisions.

### Task 7: 固化首个真实数据集并运行三模式质量基线

**Files:**
- Generate: `docs/rag/evaluation/prometheus-global-guardian-v1.jsonl`
- Generate: `docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json`
- Generate: `docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.json`
- Generate: `docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.md`

**Interfaces:**
- Consumes: human-completed review file from Task 6 and existing `evaluate:rag` CLI。
- Produces: frozen evaluation dataset and report usable as a future baseline。

- [ ] **Step 1: Finalize the reviewed data**

Run:

```bash
pnpm --filter @ai-workflow/workflow finalize:rag-annotation -- \
  --review docs/rag/evaluation/prometheus-global-guardian-v1.review.jsonl \
  --manifest docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json \
  --dataset docs/rag/evaluation/prometheus-global-guardian-v1.jsonl \
  --annotator project-owner
```

Expected: exit 0, 24 finalized samples, and a SHA-256. Missing decisions exit 2 without writing a partial dataset.

- [ ] **Step 2: Run the real three-mode evaluation**

Run:

```bash
pnpm --filter @ai-workflow/workflow evaluate:rag -- \
  --dataset docs/rag/evaluation/prometheus-global-guardian-v1.jsonl \
  --mode vector --mode fulltext --mode hybrid --top-k 5 \
  --output-dir .tmp/prometheus-global-guardian-v1-baseline
```

Expected: exit 0; `report.json` contains three reports with the same dataset SHA-256, Knowledge Base ID, embedding configuration, and `topK: 5`; `report.md` contains Precision@5, Recall@5, MRR@5, nDCG@5, p50, and p95 for each mode.

- [ ] **Step 3: Freeze and self-compare the baseline**

Copy `report.json` and `report.md` to the versioned baseline paths, mark the manifest/report as `single-annotator initial baseline`, then run the same evaluation with `--baseline docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.json`. Expected: exit 0 and all three `baselineComparison.passed` values are true.

- [ ] **Step 4: Commit the real data and baseline**

Verify no `.env`, `.tmp`, generated Next.js files, or unrelated user edits are staged, then run:

```bash
git add docs/rag/evaluation/prometheus-global-guardian-v1.jsonl docs/rag/evaluation/prometheus-global-guardian-v1.review.jsonl docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.json docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.md
git commit -m "data: add first human-labeled RAG baseline"
```

### Task 8: 更新文档并完成全量验证

**Files:**
- Modify: `docs/rag/evaluation/README.md`
- Modify: `docs/project-optimization-checklist.md`
- Modify: `docs/project-plan.md`

**Interfaces:**
- Consumes: finalized dataset, manifest, and baseline from Task 7。
- Produces: documented repeatable workflow and verified branch ready for review。

- [ ] **Step 1: Document the real workflow**

README must show exact candidate-generation, manual-review, finalization, first-baseline, and future-comparison commands. It must state the dataset version, 24 samples, Knowledge Base ID, top-k 5, three modes, single-annotator status, invalidation conditions, and that `example.jsonl` is not a quality baseline.

- [ ] **Step 2: Update project status and follow-ups**

Change the RAG evaluation item from “mechanism implemented; real set/baseline pending” to “v1 human-labeled set and initial baseline completed,” and list second-annotator agreement, no-answer queries, answer-generation evaluation, and production-log expansion as follow-ups.

- [ ] **Step 3: Run focused and repository checks**

Run:

```bash
pnpm --filter @ai-workflow/ai-engine test -- annotation.test.ts qdrant-store.test.ts
pnpm --filter @ai-workflow/ai-engine build
pnpm --filter @ai-workflow/workflow exec vitest run scripts/annotation-cli.test.ts
pnpm typecheck
pnpm lint
pnpm spellcheck
git diff --check
```

Expected: all commands exit 0. The known Qdrant client/server version warning is acceptable only when the command still exits 0.

- [ ] **Step 4: Review final diff and commit documentation**

Run `git status --short --branch`, `git diff --stat main...HEAD`, and `git diff --name-only main...HEAD`. Expected: only annotation contracts, query/guide/review/dataset/manifest/baseline artifacts, shared runtime, Qdrant listing, CLI scripts, tests, and status docs are present; existing user edits to `apps/webapp/next-env.d.ts` and `apps/workflow/next-env.d.ts` remain outside feature commits. Then run:

```bash
git add docs/rag/evaluation/README.md docs/project-optimization-checklist.md docs/project-plan.md
git commit -m "docs: record human RAG baseline workflow"
```

---

## Manual checkpoint that must stop execution

After Task 6, execution must stop and request the human annotator to fill the generated review file. No agent, model, script, or subagent may infer the 0/1/2/3 labels from retrieval scores or generated answers. Tasks 7 and 8 may continue only after the review file is saved and all candidate decisions are present.

## Self-review checklist

- [ ] The plan covers 24 queries, 8 intents, the complete 30-chunk candidate review, human-only labels, sidecar audit data, manifest, dataset SHA-256, three modes, top-k 5, and baseline invalidation.
- [ ] Every code boundary has focused tests before implementation.
- [ ] No task creates a final dataset or baseline before the manual checkpoint.
- [ ] Existing evaluator schema remains backward-compatible; relevance 0 stays out of final JSONL.
- [ ] No task exposes credentials or mutates PostgreSQL/Qdrant/Ollama state.
- [ ] Verification includes focused tests, typecheck, lint, spellcheck, diff check, and baseline self-comparison.
