# Task 2 实施报告：Prometheus Global Guardian 查询目录与人工标注指南

## 结果

Task 2 已完成，范围限定为：

- 固化 24 条来自 Prometheus Global Guardian 知识库规则和典型问题的查询；
- 提供人工标注等级、审阅流程和边界案例指南；
- 使用 Task 1 的 `parseAnnotationQueries` 增加确定性目录测试；
- 未生成候选池、人工 review JSONL、正式评测集或真实基线。

## 产物

### 查询目录

文件：`docs/rag/evaluation/prometheus-global-guardian-v1.queries.jsonl`

- 共 24 条 JSONL 记录；
- 每行字段顺序固定为 `id`、`query`、`intent`、`knowledgeBaseId`；
- Knowledge Base ID 固定为 `cmtjxa48x000dyygofy7skckk`；
- 24 个 query ID 全部唯一；
- 8 个 intent 各 3 条：
    - `scope-boundary`
    - `workflow-fields`
    - `hazard-types`
    - `severity-sources`
    - `hazard-guidance`
    - `risk-levels`
    - `json-contract`
    - `typical-questions`
- 每类包含直接问法、同义/改写问法和关键词式问法；
- 查询只引用知识库中的稳定规则、字段含义、来源映射、安全边界和典型用户问题，没有写入知识库未提供的实时事件数量、地点、时间、伤亡或预警结论。

### 标注指南

文件：`docs/rag/evaluation/prometheus-global-guardian-v1.annotation-guide.md`

指南明确了：

- `3` = 直接回答/主要规则；
- `2` = 重要但不完整支撑；
- `1` = 明确主题联系但只能作背景；
- `0` = 不相关；
- 必须阅读完整 chunk，不按检索分数、排名或来源自动判定；
- 必须为所有候选填写决策；
- 所有非零标签必须填写中文 rationale；
- 每条 query 至少保留一个非零标签，必要时从完整 chunk 清单补入漏检证据；
- 明确区分实时事件数量与字段说明、地震震级与损失/官方等级、通用建议与具体撤离指令三类边界。

### 确定性测试

文件：`packages/ai-engine/src/knowledge/evaluation/__tests__/annotation.test.ts`

新增测试从仓库中的 JSONL 文件读取内容，经 Task 1 的 `parseAnnotationQueries` 解析，并断言 24 条记录、固定 Knowledge Base ID、8 个 intent 各 3 条以及唯一 ID。

## TDD 记录

1. RED：只添加目录测试、不创建查询目录时，测试从 16 个增加到 17 个，其中目录测试因目录文件不存在而失败；失败位置是 `existsSync(queryCatalogPath)`，不是 parser 或测试运行错误。
2. GREEN：添加查询目录和指南后，目录测试通过，annotation 测试为 17/17。
3. REFACTOR：按仓库 Prettier 和 import-sort 规则整理测试文件，保持全部测试通过。

## 验证

- `pnpm --filter @ai-workflow/ai-engine test -- annotation.test.ts`：1 个测试文件、17/17 通过。
- `pnpm --filter @ai-workflow/ai-engine test`：12 个测试文件、142/142 通过。
- `pnpm --filter @ai-workflow/ai-engine typecheck`：通过。
- `pnpm exec prettier --check packages/ai-engine/src/knowledge/evaluation/__tests__/annotation.test.ts docs/rag/evaluation/prometheus-global-guardian-v1.annotation-guide.md`：通过。
- `pnpm exec eslint packages/ai-engine/src/knowledge/evaluation/__tests__/annotation.test.ts`：通过。
- 独立目录校验：24 行、24 个唯一 ID、8 类各 3 条、固定字段顺序、固定 Knowledge Base ID，全部通过。

完整 ai-engine 测试输出包含既有 Qdrant client/server 版本不匹配的 stderr 警告，但退出码为 0，且本任务没有修改 Qdrant 或相关运行时代码。

## 范围与遗留事项

本任务只修改了查询目录、标注指南、annotation 测试和本报告；没有修改候选生成器、Qdrant、运行时，也没有生成真实候选池、人工标签、正式评测集或基线报告。后续任务仍需在固定语料快照上生成候选并完成人工审阅，才能生成真实质量基线。
