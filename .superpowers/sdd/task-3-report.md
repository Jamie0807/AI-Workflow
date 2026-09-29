# Task 3 实施报告

## 结论

Task 3 已完成，范围限定为 Qdrant 只读分页读取、共享 RAG 评测 runtime 抽取及对应测试。未实现候选生成器、finalize CLI，也未生成或修改真实评测数据。

## 实现内容

### QdrantVectorStore.listChunks

- 在 `packages/ai-engine/src/knowledge/store/qdrant-store.ts` 增加 `listChunks(knowledgeBaseIds: string[]): Promise<VectorSearchResult[]>`。
- 空 Knowledge Base ID 列表立即拒绝，并沿用现有错误文案 `Knowledge base IDs cannot be empty`。
- 使用 `knowledgeBaseId` 的 `match.any` 过滤器，开启 `with_payload`、关闭 `with_vector`，每页最多读取 1000 条。
- 持续跟随 Qdrant 的 `next_page_offset`，直到 offset 为 `null` 或 `undefined`。
- 将每个 payload 映射为 `VectorSearchResult`，列表读取结果的 score 固定为 `0`。
- 只创建新的结果对象，不修改 Qdrant 返回的 point；Qdrant 异常统一包装为 `Failed to list chunks: ...`。

### 评测 runtime 抽取

- 新增 `apps/workflow/scripts/rag-evaluation-runtime.ts`，导出：
    - `createEvaluationPrismaClient`
    - `loadKnowledgeBases`
    - `createRetrieverMap`
    - `createDatasetRetriever`
- 同步迁移 `KnowledgeBaseConfig`、`EmbeddingConfigReport` 以及保持 exit code=2 行为所需的 `CliConfigError`。
- `loadKnowledgeBases` 保留原有字段选择、Knowledge Base 缺失错误消息和配置错误码。
- `evaluate-rag.ts` 改为调用共享 helper，保留 CLI 参数、报告输出、baseline 比较、清理 Prisma/Pool 和错误处理行为。
- 从 `evaluate-rag.ts` 重新导出 `CliConfigError`，保持已有 import 兼容性。

## TDD 证据

1. 基线 Qdrant focused test：14 tests passed。
2. 先加入跨 scroll page 测试后运行：15 tests 中 1 个失败，失败原因为 `TypeError: store.listChunks is not a function`。
3. 实现 `listChunks` 后运行：15/15 passed。
4. 先加入 shared dataset adapter 测试后运行：测试 suite 因 `rag-evaluation-runtime` 尚不存在而失败。
5. 完成 runtime 抽取后运行：5/5 passed。

## 验证结果

- `pnpm --filter @ai-workflow/ai-engine test -- qdrant-store.test.ts`：1 file，15 tests passed。
- `pnpm --filter @ai-workflow/ai-engine test`：12 files，144 tests passed。
- `pnpm --filter @ai-workflow/ai-engine build`：通过，CJS/ESM/DTS 均构建成功。
- `pnpm --filter @ai-workflow/workflow typecheck`：通过。
- 针对 5 个变更 TypeScript 文件运行 targeted ESLint：通过。
- `git diff --check`：通过。

## Concerns

- Qdrant 集成测试输出既有的 client/server 兼容性警告：client `1.16.2`、server `1.18.1`；测试仍全部通过，本任务未变更依赖版本。
- 本任务未连接或写入真实评测数据；仅使用现有测试和 mock scroll page 验证行为。
