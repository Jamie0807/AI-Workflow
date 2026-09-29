# Task 1 完成报告

## 改动文件

- `packages/ai-engine/src/knowledge/evaluation/annotation.ts`
    - 增加人工标注数据契约：`HumanRelevance`、`AnnotationQuery`、`CandidateSource`、`AnnotationCandidate`、`AnnotationReview`、`AnnotationManifest`。
    - 增加 JSONL query/review 解析与校验。
    - 增加纯函数 `finalizeAnnotationDataset`，过滤 0 标签，并按相关性降序、原候选顺序稳定排序。
- `packages/ai-engine/src/knowledge/evaluation/__tests__/annotation.test.ts`
    - 增加 16 个测试，覆盖重复 ID、空/错误输入、空字段、重复候选、缺失候选、非法相关性、未审核决策、缺少 rationale、0 标签过滤、分级排序和全 0 样本拒绝。
    - 测试从 `evaluation/index.ts` 公共入口导入 API，覆盖导出契约。
- `packages/ai-engine/src/knowledge/evaluation/index.ts`
    - 导出 3 个函数和 6 个公开类型。

## 测试命令和结果

严格按 TDD 执行：

1. 先写测试并运行：
    - `pnpm --filter @ai-workflow/ai-engine test -- annotation.test.ts`
    - 首次环境缺少 `node_modules`，出现 `vitest: command not found`。
    - 离线恢复 workspace 依赖后再次运行，因 `../annotation` 不存在而按预期失败。
2. 实现后运行：
    - `pnpm --filter @ai-workflow/ai-engine test -- annotation.test.ts`：通过，1 个测试文件、16/16 tests。
    - `pnpm --filter @ai-workflow/ai-engine typecheck`：通过。
    - `pnpm --filter @ai-workflow/ai-engine test`：通过，12 个测试文件、141/141 tests。
    - `git diff --check`：通过。
3. 构建验证：
    - `pnpm --filter @ai-workflow/ai-engine build`：通过，ESM/CJS/DTS 均生成成功。

## 自审

- 仅修改任务简报规定的 AI Engine 文件，并新增本任务要求的报告；没有修改其他功能。
- `parseAnnotationQueries` 和 `parseAnnotationReviews` 对 JSONL 行号、重复 ID、空字段及结构错误给出校验错误。
- review 解析保留 `humanRelevance: null` 作为未审核状态；finalization 明确拒绝该状态，符合任务要求的 finalization 测试场景。
- finalization 不修改输入 reviews/candidates，只创建新的 samples 和 relevantChunks；保留非零分级标签并稳定排序。
- 未生成真实标注数据，未调用外部服务。

## 疑问 / 风险

- 无需求疑问。
- 全量测试期间存在既有 Qdrant client/server 版本兼容性 stderr 警告（client 1.16.2、server 1.18.1），但相关测试通过，非本任务改动引起。
