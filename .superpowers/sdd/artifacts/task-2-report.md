# Task 2 实施报告

状态：DONE_WITH_CONCERNS

## 工作区与提交

- Worktree：`/Users/jamie/.codex/worktrees/automated-rag-evaluation/ai-workflow`
- 分支：`codex/automated-rag-evaluation`
- 前置 HEAD：`a552343`（Task 1）
- 实现 commit：`2874bdd`（`feat: add RAG ranking metrics`）
- 实现 commit 只包含简报列出的 3 个代码/测试文件；`.superpowers/` 中原有未跟踪文件未加入实现 commit。

## 改动文件

- `packages/ai-engine/src/knowledge/evaluation/metrics.ts`
    - 新增 `calculateRankingMetrics` 和 `aggregateRankingMetrics`。
    - 校验正整数 K 和非空相关集合。
    - 对 retrieved IDs 按首次出现去重；Precision 分母固定为 K，Recall 按相关集合计数，MRR 取前 K 首次命中倒数。
    - 使用 `2 ** relevance - 1` 和 `1 / log2(rank + 1)` 计算 graded nDCG，按相关性降序计算 IDCG，并在 IDCG 大于 0 时归一化。
    - 宏平均按查询等权计算；空指标集合抛出明确错误。
- `packages/ai-engine/src/knowledge/evaluation/__tests__/metrics.test.ts`
    - 先覆盖失败，再覆盖完美排序、排序惩罚、graded nDCG、无命中、重复 retrieved IDs、结果不足 K、非法 K、空相关集合、单项聚合和宏平均。
- `packages/ai-engine/src/knowledge/evaluation/types.ts`
    - 新增 `RankingMetrics` 类型。
- `.superpowers/sdd/artifacts/task-2-report.md`
    - 本报告；按用户要求写入。

## 实际命令与结果

### 上下文与范围审查

1. `sed -n '1,320p' /Users/jamie/.codex/worktrees/automated-rag-evaluation/ai-workflow/.superpowers/sdd/artifacts/task-2-brief.md`

    结果：读取 Task 2 精确需求、公式、测试命令和提交要求。

2. `git status --short --branch`

    结果：位于 `codex/automated-rag-evaluation`；实现前无 tracked 修改，`.superpowers/sdd/artifacts/` 下已有简报、复审包和进度文件未跟踪。

3. `GIT_DIR=...; GIT_COMMON=...; git branch --show-current; git rev-parse --show-toplevel`

    结果：确认 `GIT_DIR != GIT_COMMON`，是已隔离 worktree；根目录为本报告指定路径。

4. `git log --oneline --decorate -8`、`git show --stat --oneline a552343`、`rg --files packages/ai-engine/src/knowledge/evaluation packages/ai-engine`

    结果：确认 Task 1 HEAD 为 `a552343`，并核对现有 evaluation 类型、测试、Vitest 配置和 ai-engine scripts。

### TDD Red-Green

5. 新增测试后运行：

    `pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/metrics.test.ts`

    结果：退出码 1；测试套件因 `Cannot find module '../metrics'` 失败，尚未执行测试体，符合预期 Red。

6. 最小实现后运行同一针对性命令：

    `pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/metrics.test.ts`

    结果：退出码 0；1 个测试文件、15 个测试通过。

### 提交前与提交后验证

7. `pnpm --filter @ai-workflow/ai-engine typecheck`

    结果：退出码 0；`tsc --noEmit` 通过。实现调整后和 commit 后均重新运行并通过。

8. `pnpm --filter @ai-workflow/ai-engine test`

    结果：退出码 0；8 个测试文件、91 个测试通过。运行输出有既有 Qdrant 客户端 `1.16.2` 与服务端 `1.18.1` 的兼容性警告。

9. `git diff --check`、`git diff --cached --check`

    结果：退出码 0，无空白错误。

10. 首次提交命令：

    `git add packages/ai-engine/src/knowledge/evaluation/types.ts packages/ai-engine/src/knowledge/evaluation/metrics.ts packages/ai-engine/src/knowledge/evaluation/__tests__/metrics.test.ts && git diff --cached --check && git commit -m "feat: add RAG ranking metrics"`

    结果：提交钩子的 ESLint/Prettier 通过，但 CSpell 退出码 1；仓库词典将任务要求的 `ndcg`/`idcg` 缩写识别为未知词，共 15 处。

11. 在 3 个允许修改的文件中加入局部 `cspell:ignore ndcg idcg` 声明后，重新运行：

    `pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/metrics.test.ts`

    结果：退出码 0；15 个测试通过。

12. `pnpm --filter @ai-workflow/ai-engine typecheck`

    结果：退出码 0；`tsc --noEmit` 通过。

13. 第二次提交同一 `git add ... && git diff --cached --check && git commit -m "feat: add RAG ranking metrics"` 命令。

    结果：退出码 0；创建 commit `2874bdd`。提交钩子中的 ESLint、Prettier、CSpell（0 issues）通过；钩子随后执行根目录 `pnpm typecheck`，ai-engine build、ai-engine/workflow/webapp/api-server typecheck 全部通过。

14. commit 后并行重新运行：
    - `pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/metrics.test.ts`：退出码 0，15/15 通过。
    - `pnpm --filter @ai-workflow/ai-engine typecheck`：退出码 0。
    - `pnpm --filter @ai-workflow/ai-engine test`：退出码 0，8 个测试文件、91/91 通过；仍有同一 Qdrant 版本兼容性警告。

## Concerns

- 全量 ai-engine 测试仍输出 Qdrant 客户端 `1.16.2` 与服务端 `1.18.1` 的版本兼容性警告；测试通过，本任务未修改依赖或 Qdrant 配置。
- CSpell 默认不认识 `ndcg`/`idcg`，因此为了让仓库提交钩子通过，在本任务允许修改的 3 个文件内加入了局部忽略声明；未修改全局词典或其他文件。
- `.superpowers/sdd/artifacts/` 下原有未跟踪文件保持不变，未纳入 commit。

## Task 2 审查修复追加（2026-09-28）

审查 finding：`aggregateRankingMetrics` 原先先累加各字段再除以指标数量；两个有限的 `Number.MAX_VALUE` 相加会溢出为 `Infinity`，因此违反 `RankingMetrics` 字段必须为有限 number 的约束。

### 修复内容

- `packages/ai-engine/src/knowledge/evaluation/metrics.ts`
    - 新增按当前最大绝对值缩放的稳定平均实现，避免先累加未缩放的极值。
    - 对每个输入字段使用 `Number.isFinite` 校验；非有限输入抛出包含字段名的明确错误。
    - 对每个聚合结果再次校验有限性；若仍为非有限值，抛出包含字段名的明确错误。
    - 保持原有 0..1 指标的等权宏平均公式和结果不变。
- `packages/ai-engine/src/knowledge/evaluation/__tests__/metrics.test.ts`
    - 新增两个所有字段均为 `Number.MAX_VALUE` 的有限 `RankingMetrics` 回归测试，断言聚合结果所有字段均为有限值。
    - 新增 `NaN`、正无穷和负无穷输入的明确错误测试。

### 实际验证结果

1. 回归测试先在旧实现上按预期失败：极值用例得到非有限结果，非有限输入未抛错。
2. `pnpm --filter @ai-workflow/ai-engine test -- src/knowledge/evaluation/__tests__/metrics.test.ts`

    结果：退出码 0；1 个测试文件、19/19 个测试通过。

3. `pnpm --filter @ai-workflow/ai-engine typecheck`

    结果：退出码 0；`tsc --noEmit` 通过。

本次修复仅修改上述实现、测试和本报告；`.superpowers/sdd/artifacts/` 下原有未跟踪文件未加入提交。原报告中记录的 Qdrant 客户端/服务端版本兼容性 warning 未因本修复改变。
