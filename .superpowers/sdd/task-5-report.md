# Task 5 报告：人工标注 finalize

## 实现

- 新增 `apps/workflow/scripts/finalize-rag-annotation.ts`。
- 要求 `--review`、`--manifest`、`--dataset`、`--annotator`；`--reviewed-at` 默认为当前 ISO 时间戳。
- 解析并校验 review JSONL，拒绝未完成的人工作决策、缺少非零标签、缺少 rationale、重复候选、review/候选与 manifest Knowledge Base 不一致，以及非 candidate manifest。
- 仅通过 `finalizeAnnotationDataset` 输出 relevance `1/2/3`，按确定性 JSONL 序列化并计算 SHA-256。
- dataset 与 human-reviewed manifest 均先写入同目录临时文件再 rename；review 文件只读、不修改；不生成 baseline。
- 扩展 `annotation-cli.test.ts` 覆盖 null 决策、非零输出/hash、Knowledge Base mismatch 和 review 不变性。

## 二次复审修复

- rollback 恢复不再吞掉 rename 错误；恢复失败会抛出包含 `rollback failure` 的错误。
- 只有确认对应 backup 已恢复，或两个目标已成功提交，才会删除该 backup；恢复失败的 backup 会保留供人工恢复。
- 新增直接 writer 的 restore-failure 测试，以及真实 finalize CLI 的双旧文件、第二次发布失败回滚测试。
- 未生成 baseline，人工标签仍只来自 review。

## 最终验证

- `pnpm --filter @ai-workflow/ai-engine exec vitest run src/knowledge/evaluation/__tests__/annotation.test.ts src/knowledge/evaluation/__tests__/annotation-cli.test.ts`：2 个文件、47/47 通过（annotation 17、annotation CLI 30）。
- `pnpm --filter @ai-workflow/ai-engine typecheck`：通过。
- `pnpm --filter @ai-workflow/workflow typecheck`：通过。
- `pnpm exec prettier --check apps/workflow/scripts/finalize-rag-annotation.ts packages/ai-engine/src/knowledge/evaluation/__tests__/annotation-cli.test.ts .superpowers/sdd/task-5-report.md`：通过。
- `pnpm exec eslint apps/workflow/scripts/finalize-rag-annotation.ts packages/ai-engine/src/knowledge/evaluation/__tests__/annotation-cli.test.ts`：通过。
- `git diff --check`：通过。

## Concern

workflow package 未安装 Vitest binary，因此使用 ai-engine runner 执行同一覆盖测试；环境仍显示既有的 zsh Homebrew 路径警告和 Qdrant client/server 版本提示。
