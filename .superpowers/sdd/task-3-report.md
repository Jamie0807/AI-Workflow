# Task 3 实现报告：离线 RAG 失败分析 CLI

## 状态

DONE。Task 3 已实现并提交。CLI 只读取冻结 JSONL 数据集和三模式基线报告，调用 Task 1/2 的纯分析 API，输出 JSON 与 Markdown 失败分析报告；没有连接 PostgreSQL、Qdrant、Ollama 或 LLM，也没有生成真实 v1 分析产物。

## 提交范围

Commit：`a1cd85ec43d181967cec11d88aed9f25a58f505c`（`feat: add offline RAG failure analysis CLI`）

提交只包含任务指定的 3 个 tracked 文件：

- `apps/workflow/scripts/analyze-rag.ts`
- `apps/workflow/package.json`
- `packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis-cli.test.ts`

`.superpowers/sdd/task-1-report.md` 和 `.superpowers/sdd/task-2-report.md` 的既有未提交修改保持原样，没有 staged，也没有纳入 commit。本报告按要求写入工作树但未纳入 commit。

## 实现内容

- 新增 `parseFailureAnalysisCliArgs(argv)`：支持 `--name value`、`--name=value`、pnpm 传入的 `--`，默认输出目录为 `docs/rag/evaluation/analyses`；拒绝未知、缺值和重复选项，并保留配置错误 exit code `2`。
- 通过 `git rev-parse --show-toplevel` 和 `git rev-parse HEAD` 获取仓库根目录与 revision；Git 命令不可用时分别回退到当前目录和 `unknown`。
- 相对 dataset/report/output 路径按仓库根目录解析；读取 dataset 原文后计算 SHA-256，再调用 `parseEvaluationDataset`。
- 要求 report 顶层 `reports` 为数组；逐个调用 `validateEvaluationReport`，并额外校验 config、query、retrieved results、metrics、latency 等结构。
- 同时校验报告顶层 `dataset.sha256`（如存在）和每个模式的 `metadata.datasetSha256`，最终以 dataset 原文计算的 SHA 为准；随后调用 `validateFailureAnalysisInput` 和 `analyzeRagFailure`。
- 新增固定 Markdown 章节：Dataset and baseline、Mode summary、Priority failure queries、Query-by-query diagnostics、Interpretation boundary。模式表包含覆盖状态、background-only、误召回、平均误召回、Precision/Recall/MRR/nDCG 和 p50/p95 latency；逐查询诊断包含漏召回、误召回、核心遗漏、covered ratio 和原始指标。
- JSON 与 Markdown 分别写入带 `randomUUID()` 后缀的 `.tmp` 文件，再 rename 到固定目标；`finally` 清理临时文件。输出 basename 从 `<stem>.report.json` 派生为 `<stem>.failure-analysis.json/.md`。
- `main(argv)` 成功返回 `0` 并输出两个文件路径；CLI 配置/输入错误返回 `2`，文件读取、纯分析和写入错误返回 `1`；主流程没有任何外部服务初始化。
- package script 为：`analyze:rag: ../../packages/ai-engine/node_modules/.bin/tsx scripts/analyze-rag.ts`。

## TDD 证据

1. RED：首次运行 `pnpm --filter @ai-workflow/ai-engine test -- failure-analysis-cli.test.ts` 时，测试因 `apps/workflow/scripts/analyze-rag` 不存在而失败。
2. GREEN：实现 CLI 后 focused test 通过；随后补充 metadata SHA 校验、ES2017 兼容性和格式/cspell 修复，并重新验证通过。
3. 测试使用真实临时目录、真实 JSONL/JSON 文件和真实 `analyzeRagFailure`；没有用 mock 替代成功路径。仅对写入失败场景注入 `writeFile` 依赖，以验证临时文件清理。

## 验证结果

- `pnpm --filter @ai-workflow/ai-engine test -- failure-analysis-cli.test.ts`：1 file，9/9 tests passed。
- `pnpm --filter @ai-workflow/ai-engine test`：15 files，201/201 tests passed。
- `pnpm --filter @ai-workflow/ai-engine build`：CJS、ESM、DTS 均构建成功。
- `pnpm --filter @ai-workflow/ai-engine typecheck`：通过。
- `pnpm --filter @ai-workflow/workflow typecheck`：通过。
- 提交钩子全仓 `pnpm typecheck`：ai-engine build/typecheck、workflow/webapp/api-server typecheck 全部通过。
- 提交钩子 eslint/prettier：通过。
- 提交钩子全仓 spellcheck：262 个文件、0 个问题。
- `pnpm exec prettier --check ...`（3 个任务文件）和 `git diff --check`：通过。

全量 ai-engine 测试仍输出仓库既有 Qdrant client/server 版本兼容性 stderr 警告（client `1.16.2`、server `1.18.1`），但测试通过且本任务未修改该依赖。每次命令也会显示本机 `.zprofile` 对不存在 `/opt/homebrew/bin/brew` 的环境提示；均不影响退出码或结果。

## 覆盖的失败场景

- 缺少 dataset/report 参数、重复/未知/缺值参数。
- dataset/report 文件不存在、非法 JSONL、非法 JSON、缺少顶层 `reports`。
- 缺少 `hybrid` 模式、顶层 dataset SHA 冲突、模式 metadata SHA 冲突、query ID 集合不一致、top-K 不一致。
- Markdown/JSON 写入在发布前失败时，最终文件和随机 `.tmp` 文件均不残留。

## Task 3 审查修复追加（2026-09-30）

审查发现的 Critical/Important/Minor 已处理：

- 双文件报告发布改为成对事务式流程：先写两个 `.tmp`，再将已有 JSON/Markdown 目标移到事务专属 `.bak`，依次发布两个新文件；任一 rename 失败都会删除已发布的新文件、恢复已有目标、清理 `.tmp/.bak`，成功后也清理 backup。`writeFile`、`rename`、`unlink` 可通过最小依赖注入测试。
- 新增第二次发布 rename 失败的回滚测试，确认旧 JSON/Markdown 内容恢复且目录无新半成品、tmp 或 backup。
- 新增 `CliInputError`；非法 JSONL、非法 JSON、报告结构错误、dataset SHA 冲突以及跨报告 query/topK/retrieved chunk ID 匹配错误统一返回 exit code `1`；CLI 参数配置错误仍返回 `2`。
- `main` 对输入校验错误补充实际解析后的 dataset/report 绝对路径，同时保留 mode、sample、chunk、topK 定位信息；补充 CLI 文件读取路径触发 retrievedResults/retrievedChunkIds 不一致的测试和缺失 report 文件测试。
- Markdown 动态路径与 chunk ID 使用按内容选择长度的代码 span，动态反引号不会破坏 Markdown；增加最小渲染测试。

### 审查修复 TDD 与验证

1. RED：先加入 6 个审查回归断言，focused test 为 13 tests、6 failures，失败原因分别对应旧错误码、路径缺失、无回滚和反引号未保护。
2. GREEN：实现上述修复后 focused test 为 13/13 passed。
3. 最终验证：
    - `pnpm --filter @ai-workflow/ai-engine test -- failure-analysis-cli.test.ts`：1 file，13/13 tests passed。
    - `pnpm --filter @ai-workflow/ai-engine test`：15 files，205/205 tests passed。
    - `pnpm --filter @ai-workflow/workflow typecheck`：通过。
    - `pnpm --filter @ai-workflow/ai-engine build`：CJS、ESM、DTS 均构建成功。
    - `pnpm --filter @ai-workflow/ai-engine typecheck`：通过。
    - `pnpm exec prettier --check apps/workflow/scripts/analyze-rag.ts packages/ai-engine/src/knowledge/evaluation/__tests__/failure-analysis-cli.test.ts`：通过。
    - `git diff --check`：通过。

全量测试仍出现仓库既有 Qdrant client/server 版本兼容性 stderr 警告，但退出码为 `0`；本机命令也会显示 `.zprofile` 中不存在 `/opt/homebrew/bin/brew` 的环境提示，均未影响验证结果。审查修复代码/测试改动未包含本报告、Task 1/2 报告或其他现有工作区修改。

审查修复 commit：`ecfc1bf8ce3ae2735ed5c89751882869edd831f8`。

## Task 3 最终稳定性修复与真实 v1 产物（2026-09-30）

后续复审发现原子发布异常路径仍有两处错误被静默吞掉：回滚恢复失败可能丢失唯一 `.bak`，成功发布后的 backup/temp 清理失败可能错误返回成功。已修复 `writeFailureAnalysisReports`：

- 回滚阶段逐项检查已发布文件删除、旧文件恢复和临时文件清理；恢复或清理失败会与原发布错误合并后抛出。
- 无法恢复的 `.bak` 和无法清理的临时文件不再被无条件删除，保留现场供人工恢复。
- 成功发布后的所有临时文件和 backup 清理失败会显式 reject，并继续尝试其他清理项。
- 新增“第二次发布 rename 失败且 JSON restore 失败”以及“成功发布 cleanup 失败”回归测试。

真实 v1 失败分析已生成：

- `docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.json`
- `docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.md`
- 数据集 24 条查询，`topK=5`，包含 vector/fulltext/hybrid 三种模式。

本轮验证：

- `pnpm --filter @ai-workflow/ai-engine test -- failure-analysis-cli.test.ts`：15/15 passed。
- `pnpm --filter @ai-workflow/workflow typecheck`：通过。
- `pnpm --filter @ai-workflow/ai-engine build`：CJS、ESM、DTS 均成功。
- `pnpm --filter @ai-workflow/ai-engine typecheck`：通过。
- `pnpm --filter @ai-workflow/workflow analyze:rag -- --dataset docs/rag/evaluation/prometheus-global-guardian-v1.jsonl --report docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.json --output-dir docs/rag/evaluation/analyses`：成功生成两份报告。
- `git diff --check`：通过。

本轮修复涉及的代码/测试文件已单独提交：`9dc9cff fix: preserve failure analysis publish errors`。本报告及 Task 1/2 报告保持为工作树未提交修改，不纳入该提交。
