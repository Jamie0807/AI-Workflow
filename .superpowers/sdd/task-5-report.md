# Task 5 报告：人工标注 finalize

## 实现

- 新增 `apps/workflow/scripts/finalize-rag-annotation.ts`。
- 要求 `--review`、`--manifest`、`--dataset`、`--annotator`；`--reviewed-at` 默认为当前 ISO 时间戳。
- 解析并校验 review JSONL，拒绝未完成的人工作决策、缺少非零标签、缺少 rationale、重复候选、review/候选与 manifest Knowledge Base 不一致，以及非 candidate manifest。
- 仅通过 `finalizeAnnotationDataset` 输出 relevance `1/2/3`，按确定性 JSONL 序列化并计算 SHA-256。
- dataset 与 human-reviewed manifest 均先写入同目录临时文件再 rename；review 文件只读、不修改；不生成 baseline。
- 扩展 `annotation-cli.test.ts` 覆盖 null 决策、非零输出/hash、Knowledge Base mismatch 和 review 不变性。

## 验证

- `pnpm --filter @ai-workflow/ai-engine exec vitest run src/knowledge/evaluation/__tests__/annotation-cli.test.ts`：17/17 通过。
- `pnpm --filter @ai-workflow/ai-engine exec vitest run src/knowledge/evaluation/__tests__/annotation.test.ts src/knowledge/evaluation/__tests__/annotation-cli.test.ts`：34/34 通过。
- `pnpm --filter @ai-workflow/ai-engine test`：13 个测试文件、161/161 通过。
- `pnpm --filter @ai-workflow/ai-engine typecheck`：通过。
- `pnpm --filter @ai-workflow/workflow typecheck`：通过。
- `pnpm exec eslint apps/workflow/scripts/finalize-rag-annotation.ts packages/ai-engine/src/knowledge/evaluation/__tests__/annotation-cli.test.ts`：通过。
- `git diff --check`：通过。

## Concern

简报指定的 workflow 目录 Vitest 命令因 `@ai-workflow/workflow` 未安装 Vitest binary 直接失败；已用仓库实际安装的 ai-engine Vitest runner 执行同一测试文件并通过。运行环境还会显示已有的 zsh Homebrew 路径警告和 Qdrant client/server 版本提示，但不影响本任务测试结果。

## Reviewer 修复记录

### 修复前

命令：

```bash
pnpm --filter @ai-workflow/ai-engine exec vitest run src/knowledge/evaluation/__tests__/annotation-cli.test.ts
```

结果：28 个测试中 25 个通过、3 个失败；新增回滚场景因 `writeAtomicOutputs` 尚未暴露可注入发布操作而失败，验证了 reviewer 要求的发布协议测试尚未满足。

### 修复后

- `pnpm --filter @ai-workflow/ai-engine exec vitest run src/knowledge/evaluation/__tests__/annotation.test.ts src/knowledge/evaluation/__tests__/annotation-cli.test.ts`：2 个文件、45/45 通过。
- `pnpm --filter @ai-workflow/ai-engine typecheck`：通过。
- `pnpm --filter @ai-workflow/workflow typecheck`：通过。
- `pnpm exec prettier --check apps/workflow/scripts/finalize-rag-annotation.ts packages/ai-engine/src/knowledge/evaluation/__tests__/annotation-cli.test.ts .superpowers/sdd/task-5-report.md`：通过。
- `pnpm exec eslint apps/workflow/scripts/finalize-rag-annotation.ts packages/ai-engine/src/knowledge/evaluation/__tests__/annotation-cli.test.ts`：通过。

修复内容：发布前分别备份已有 dataset/manifest，两个临时文件准备完成后按 dataset、manifest 顺序发布；任一步失败都删除已发布新文件、恢复已有文件并清理 temp/backup。测试覆盖无旧文件、仅旧 dataset、仅旧 manifest、第二次 rename 失败、多行 JSONL、固定 SHA-256、四个必填参数、无 rationale、全 0、重复候选及 candidate-level Knowledge Base mismatch。未生成 baseline，人工标签仍只来自 review。
