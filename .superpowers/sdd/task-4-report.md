# Task 4 实施报告

## 结果

Task 4 已完成候选生成 CLI、对应测试和 workflow package scripts。实现范围没有包含 finalize CLI，也没有连接 PostgreSQL、Qdrant 或 Ollama 生成真实候选产物。

## 实现内容

- 新增 `apps/workflow/scripts/prepare-rag-annotation.ts`。
    - 解析 `--queries`、`--output`、`--manifest` 和正整数 `--top-k`，默认 `topK=10`。
    - 固定读取 Task 2 的 24 条 query 和 Knowledge Base `cmtjxa48x000dyygofy7skckk`。
    - 复用 Task 3 shared runtime，调用 vector/fulltext/hybrid 三种检索，并用 `QdrantVectorStore.listChunks` 读取完整 30 chunk corpus。
    - 每条 query 输出完整且排序稳定的 30 个候选；`candidateSources` 仅记录模式的 rank/score，所有 `humanRelevance` 为 `null`、`rationale` 为空字符串。
    - manifest 记录文档 SHA-256、chunking/embedding 设置、`annotationStatus: "candidate"`、`annotator: null` 和 `datasetSha256: null`。
    - 输出使用临时文件后 rename；服务流程在 `finally` 中断开 Prisma 并关闭 PostgreSQL pool；错误码为配置错误 `2`、服务错误 `1`，错误输出会脱敏环境值。
    - `--help` 兼容 pnpm 传入的独立 `--`，显示完整首跑命令。
- 修改 `apps/workflow/package.json`，加入 brief 要求的 `prepare:rag-annotation` 和 `finalize:rag-annotation` scripts；未实现 finalize 文件本身。
- 新增 `packages/ai-engine/src/knowledge/evaluation/__tests__/annotation-cli.test.ts`，覆盖默认参数、缺失参数、非法 top-k、重复 query ID、配置错误退出码、完整 corpus 输出形状、三模式来源信息、manifest 和 help 分隔符。

## TDD 与验证

1. RED：测试先运行，因 `prepare-rag-annotation` 不存在而失败。
2. GREEN：实现后 focused CLI/annotation 测试通过；后续为 pnpm `--` 分隔符兼容性补充测试，先失败后修复通过。
3. 最终验证：
    - `pnpm --filter @ai-workflow/ai-engine test`：13 个文件、156/156 通过。
    - `pnpm --filter @ai-workflow/workflow typecheck`：通过。
    - targeted Prettier、ESLint、`git diff --check`：通过。
    - `pnpm --filter @ai-workflow/workflow prepare:rag-annotation -- --help`：返回 0，帮助文本包含三个路径和 `--top-k 10`。

## Concerns

- brief 给出的 focused 命令 `pnpm --filter @ai-workflow/workflow exec vitest run scripts/annotation-cli.test.ts` 在当前仓库无法运行：workflow package 没有 `vitest` binary，且测试文件按 brief 的 Files 约定位于 ai-engine evaluation tests。实际使用 `pnpm --filter @ai-workflow/ai-engine test -- annotation-cli.test.ts` 完成 focused 验证。
- 全量 ai-engine 测试仍显示既有 Qdrant client/server 版本兼容性警告（client `1.16.2`、server `1.18.1`），测试本身通过，Task 4 未修改依赖。

## Review follow-up

针对 review 的 Important 项补充了 `main` 编排覆盖：

- `main` 增加可选的 `AnnotationRuntimeDependencies` 注入，默认路径仍使用真实 runtime；测试显式传入 vi.fn mock，因此不会连接真实 PostgreSQL、Qdrant 或 Ollama。
- mock runtime 测试生成 24 条 query，验证输出包含 24 条 review；每条 review 包含完整 mock corpus 的 30 个 chunk，且所有 `humanRelevance` 均为 `null`。
- 测试验证 vector/fulltext/hybrid 各调用 24 次，共 72 次，每次 `topK=10`；同时验证 `listChunks` 的固定 Knowledge Base 调用、review JSONL 和 manifest JSON 均可解析，以及 Prisma/pool 清理被调用。

本次追加验证：

- `pnpm --filter @ai-workflow/ai-engine test -- annotation-cli.test.ts annotation.test.ts`：31/31 通过。
- `pnpm --filter @ai-workflow/workflow typecheck`：通过。
- targeted Prettier、ESLint、`git diff --check`：通过。
