# Task 3 实施报告

## 状态

DONE_WITH_CONCERNS

## 工作区与提交

- Worktree：`/Users/jamie/.codex/worktrees/automated-rag-evaluation/ai-workflow`
- 分支：`codex/automated-rag-evaluation`
- 前置实现：`bc86900`
- 实现 commit：`feat: evaluate retriever quality on labeled data`（最终 hash 见交付信息）

## 改动

- `packages/ai-engine/src/knowledge/evaluation/evaluator.ts`
    - 新增 `evaluateRetrievalDataset`，按 dataset 顺序逐条调用注入的 `RetrieverService`。
    - 每次检索的 `knowledgeBaseIds` 严格传为 `[sample.knowledgeBaseId]`；报告配置中的 `knowledgeBaseIds` 从 dataset 样例按首次出现顺序去重生成。
    - 透传 `mode`、`topK`、`threshold` 和 `vectorWeight`，默认使用 `performance.now`，支持测试注入时钟。
    - 保留每条查询的 chunk ID、score、单查询指标和毫秒延迟；使用已有 `calculateRankingMetrics` 与 `aggregateRankingMetrics` 计算宏平均。
    - 延迟按升序使用最近秩计算 p50/p95：`Math.ceil(percentile * n) - 1`，并限制到合法索引。
    - 任一 retriever 查询失败立即抛出带 sample ID 的错误，不生成或返回部分成功报告。
- `packages/ai-engine/src/knowledge/evaluation/__tests__/evaluator.test.ts`
    - 覆盖检索参数与顺序、每条知识库 ID 隔离、查询结果保留、宏平均、p50/p95 和失败传播。
- `packages/ai-engine/src/knowledge/evaluation/types.ts`
    - 增加不含报告知识库列表的评测输入类型，以及查询结果的 chunk/score 类型。
- `packages/ai-engine/src/knowledge/evaluation/index.ts`
    - 导出评测器和依赖类型。

## TDD 与验证

1. Red：

    `pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/evaluator.test.ts`

    退出码 1；因 `../evaluator` 尚不存在而失败，未执行测试体，符合预期。

2. Green：

    同一针对性命令退出码 0；1 个测试文件、2 个测试通过。

3. ai-engine 全量测试：

    `pnpm --filter @ai-workflow/ai-engine test`

    退出码 0；9 个测试文件、97 个测试通过。

4. ai-engine 类型检查：

    `pnpm --filter @ai-workflow/ai-engine typecheck`

    退出码 0；`tsc --noEmit` 通过。

5. 工作区 diff 校验：

    `git diff --check`

    退出码 0，无空白错误。

## Concerns

- ai-engine 全量测试仍输出既有 Qdrant 客户端 `1.16.2` 与服务端 `1.18.1` 的版本兼容性 warning；本任务未修改相关依赖或配置，测试仍以退出码 0 完成。
