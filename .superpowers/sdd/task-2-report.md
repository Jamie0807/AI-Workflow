# Task 2 实现报告：跨模式 RAG 失败分析

## 状态

已完成。实现限定在现有纯模块和测试；未实现 CLI、文件读写或输出产物。

## 改动文件

- `packages/ai-engine/src/knowledge/evaluation/failure-analysis.ts`
    - 实现 `validateFailureAnalysisInput(input)`：校验三种模式是否齐全且不重复、数据集 SHA、查询 ID 集合、`topK` 一致性，并委托单模式校验检查查询/chunk 错误。
    - 实现 `analyzeRagFailure(input)`：按 `vector`、`fulltext`、`hybrid` 固定顺序生成完整单模式诊断和 `byMode`。
    - 生成逐查询三模式快照，按数据集 `relevantChunks` 原始顺序计算 `uniqueCoveredRelevantChunkIds` 与 `uniqueMissedRelevantChunkIds`。
    - 按 nDCG、MRR、Precision、Recall 降序推荐关注模式，完全相同按 `vector`、`fulltext`、`hybrid` 稳定 tie-break。
    - 按 nDCG 升序、Recall 升序、误召回数降序、sample ID 升序生成 `priorityFailures`。
- `packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts`
    - 增加三查询三模式汇总、唯一命中/遗漏、模式推荐和 priority 排序测试。
    - 增加模式输入缺失/重复、dataset SHA、查询 ID、`topK`、重复 retrieved chunk 和 `retrievedResults`/`retrievedChunkIds` 不一致测试。

## TDD 与验证

- RED：新增 Task 2 测试后 focused test 为 14 tests，其中 8 个按预期失败，原因是跨模式函数尚未实现。
- GREEN：实现后 focused test 通过，14/14 tests。
- `pnpm --filter @ai-workflow/ai-engine test -- failure-analysis.test.ts`：通过，14/14。
- `pnpm --filter @ai-workflow/ai-engine test`：通过，14 个测试文件、189/189 tests。
- `pnpm --filter @ai-workflow/ai-engine build`：通过，ESM/CJS/DTS 构建成功。
- `pnpm --filter @ai-workflow/ai-engine typecheck`：通过。
- 定向 ESLint、Prettier check、`git diff --check`：通过。
- 提交钩子额外完成 root typecheck 和 spellcheck，均通过。

## 提交与范围核对

- Commit：`78cda86e2bebfae7f8cd529b10c6f40162162cab`（`feat: compare RAG retrieval failure modes`）。
- commit 仅包含：
    - `packages/ai-engine/src/knowledge/evaluation/failure-analysis.ts`
    - `packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts`
- `.superpowers/sdd/task-1-report.md` 保持为原有未 staged 修改，未纳入提交。
- 本报告按要求保持未提交。

## Concerns

- 无本任务范围内 concerns。
- 命令输出仍会显示本机 `.zprofile` 对不存在 `/opt/homebrew/bin/brew` 的环境提示；全量测试另有既有 Qdrant client/server 版本兼容性 stderr 警告，但相关测试通过，均与本次改动无关。

## 审查修复追加

### 修复内容

- `validateFailureAnalysisInput` 现在对每个基线报告明确拒绝缺少 `metadata` 或缺少 `metadata.datasetSha256` 的输入，并继续校验 dataset SHA 是否匹配。
- `evaluation/index.ts` 现在公开导出运行时 API `analyzeRagFailure` 和 `validateFailureAnalysisInput`；测试通过 evaluation barrel 导入并调用这两个 API。
- 参数化拒绝测试现在逐场景断言错误包含模式、sample ID、chunk ID 或 topK 等实际定位信息，不再只断言错误数组非空。
- 增加 priorityFailures 稳定排序测试，覆盖 Recall、误召回数和 sampleId tie-break。

### TDD 与最终验证

- RED：先加入上述回归测试，covering test 为 17 个测试，其中 11 个按预期失败；失败原因包含 barrel API 尚未导出和缺失 dataset SHA 校验未报错。
- GREEN：补充最小实现后，`pnpm --filter @ai-workflow/ai-engine test -- failure-analysis.test.ts` 通过，1 个测试文件、17/17 tests。
- `pnpm --filter @ai-workflow/ai-engine typecheck`：通过，退出码 0。
- `pnpm --filter @ai-workflow/ai-engine build`：通过，ESM/CJS/DTS 构建成功，退出码 0。
- `git diff --check`：通过，退出码 0。

本次修复仍未实现 CLI；报告文件本身不纳入修复 commit。

## Task 2 复审 Minor 测试修复追加

- 根因：`priorityFailures` 测试 fixture 的 dataset/sample 与 report query 输入顺序原本就是 `q-1,q-2,q-3,q-4`，与期望一致，无法证明排序没有依赖输入顺序。
- 修复：仅调整 `failure-analysis.test.ts` 的 fixture，将 dataset samples 和各模式 report queries 反转为 `q-4,q-3,q-2,q-1`，保留期望 priority 顺序 `q-1,q-2,q-3,q-4`。
- 排序覆盖：所有样本 nDCG 相同；`q-1` 以更低 Recall 优先，`q-2` 与 `q-3/q-4` Recall 相同且误召回更多，`q-3/q-4` 的 Recall 与误召回数均相同后依赖 sampleId。
- 未修改生产逻辑，未实现 CLI；报告文件本身不纳入本次修复 commit。
- `pnpm --filter @ai-workflow/ai-engine test -- failure-analysis.test.ts`：通过，1 个测试文件、17/17 tests。
- `git diff --check`：通过。

## Task 2 复审 Minor：priorityFailures tie-break 测试澄清

- 状态：已完成，未修改生产逻辑。
- 在 `createInputForPriorityTieBreaks` 中保留反向输入：dataset samples 和所有 mode 的 report queries 均为 `q-4,q-3,q-2,q-1`，期望输出为 `q-1,q-2,q-3,q-4`。
- 测试现在显式断言所有候选 nDCG 均为 `0.2`；最低 Recall 的 `q-1` 排在最前；Recall 相同的候选按 falsePositiveCount `2,1,1` 降序；Recall 与 falsePositiveCount 都相同的 `q-3`、`q-4` 按 sampleId 升序。
- 本次只修改 `packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts`；报告本身不纳入修复 commit。

### 本次验证

- `pnpm --filter @ai-workflow/ai-engine test -- failure-analysis.test.ts`：通过，1 个测试文件、17/17 tests。
- `pnpm exec prettier --check packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts`：通过。
- `git diff --check`：通过。
- 修复提交：`4004827`（`test: clarify priority failure tie-breaks`），提交仅包含目标测试文件。
