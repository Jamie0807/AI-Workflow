# Task 1 实现报告：单模式 RAG 失败分析

## 状态

已完成。实现限定在单模式纯分析 API；未实现 CLI、文件读写、外部服务访问或跨模式组合。

## 改动文件

- `packages/ai-engine/src/knowledge/evaluation/failure-analysis.ts`
    - 定义完整的可序列化失败分析类型：模式、逐查询诊断、单模式 summary、跨模式结果类型。
    - 导出固定顺序的 `FAILURE_ANALYSIS_MODES`。
    - 实现 `validateModeFailureInput(dataset, report)`。
    - 实现 `analyzeModeFailure(dataset, report)`。
    - 使用数据集人工相关性等级计算 Top-K 覆盖、遗漏、误召回、最高相关性、覆盖状态、核心遗漏和 background-only；保留报告正式指标与延迟。
    - 实现单模式 summary：覆盖状态计数、background-only 计数、误召回总数/平均值、按遗漏次数降序且 chunk ID 升序的最常遗漏 chunk。
- `packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts`
    - 增加三种覆盖状态和 relevance 1/2/3 口径测试。
    - 增加单模式 summary、模式字段、查询 sample ID、重复查询、重复 retrieved chunk、retrievedResults ID 集合和重复标注 chunk 校验测试。
- `packages/ai-engine/src/knowledge/evaluation/index.ts`
    - 增加单模式函数、模式常量和公开类型导出。

## 关键行为

- relevance `>= 1` 计入相关覆盖；只有 relevance `>= 2` 的遗漏 chunk 进入 `missedCoreChunkIds`。
- 检索结果严格按报告原始顺序处理，并在 `report.config.topK` 处截断；不使用 score 推断原因。
- `retrievedResults` 只参与 chunk ID 集合一致性校验。
- 输入校验错误包含 mode、sample ID 或 chunk ID，便于后续 CLI 定位。
- 模块只依赖 TypeScript 数据类型和内存中的 `Map`/`Set`，不读取文件、不访问数据库、Qdrant、Ollama 或 LLM。

## TDD 与验证

先新增分类测试并运行 focused test，确认模块不存在导致测试按预期失败；随后实现最小 API，修正一个测试断言表达问题后重新验证。

通过的命令：

- `pnpm --filter @ai-workflow/ai-engine test -- failure-analysis.test.ts`：1 个测试文件、6/6 tests。
- `pnpm --filter @ai-workflow/ai-engine typecheck`：通过。
- `pnpm --filter @ai-workflow/ai-engine build`：ESM、CJS、DTS 构建通过。
- `pnpm exec prettier --check packages/ai-engine/src/knowledge/evaluation/failure-analysis.ts packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts packages/ai-engine/src/knowledge/evaluation/index.ts`：通过。
- `pnpm --filter @ai-workflow/ai-engine test`：14 个测试文件、181/181 tests。
- `git diff --check`：通过。

## 自审与关注事项

- 只修改了 Task 1 指定的 AI Engine 文件，并按用户要求覆盖了本报告；没有新增 CLI 或跨模式组合逻辑。
- 公共 index 仅导出 Task 1 的单模式函数、常量和完整类型；`FailureAnalysisResult` 等跨模式类型只做契约定义，没有实现跨模式计算。
- 全量测试输出了既有 Qdrant client/server 版本兼容性 stderr 警告（client 1.16.2、server 1.18.1），相关测试仍全部通过；该警告与本次改动无关。
- 每次命令还会显示本机 `.zprofile` 对不存在 `/opt/homebrew/bin/brew` 的环境提示；不影响测试、类型检查或构建。

## 提交

- Commit message: `feat: add RAG failure analysis core`

## 收尾记录

- 收尾前 staged diff 已复核，最终仅包含以下 3 个文件：
    - `packages/ai-engine/src/knowledge/evaluation/failure-analysis.ts`
    - `packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis.test.ts`
    - `packages/ai-engine/src/knowledge/evaluation/index.ts`
- `.superpowers/sdd/task-1-report.md` 保持为未 staged 修改，不纳入本次提交。
- `pnpm --filter @ai-workflow/ai-engine test -- failure-analysis.test.ts`：退出码 0；1 个测试文件、6/6 tests 通过。
- `pnpm --filter @ai-workflow/ai-engine typecheck`：退出码 0，通过。
- `pnpm --filter @ai-workflow/ai-engine build`：退出码 0；ESM、CJS、DTS 构建成功。
- `git diff --check`：退出码 0；无 whitespace 错误输出。
