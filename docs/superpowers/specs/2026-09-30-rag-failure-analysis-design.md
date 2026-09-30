# RAG 基线失败分析设计

## 1. 目标

为现有 RAG 评测链路增加一个可重复运行的离线失败分析工具。工具读取已经冻结的人工标注评测集和三模式检索报告，输出机器可读与人工可读的分析结果，帮助确定下一步应优化 chunk、Embedding、全文检索、hybrid 融合、rerank 还是查询集。

本阶段只做问题定位，不修改实际检索逻辑，不自动调整参数，也不使用 LLM 推断失败原因。

## 2. 背景

当前项目已经具备：

- 人工标注评测集和 manifest；
- vector、fulltext、hybrid 三种检索模式的基线报告；
- Precision@K、Recall@K、MRR@K、nDCG@K 和延迟指标；
- 基线比较和回归门禁。

基线报告已经包含每条查询的检索 chunk、分数和逐查询指标，但还不能直接回答“哪些查询失败、漏掉了哪些相关 chunk、不同模式差异在哪里”。失败分析工具应在不访问外部服务的前提下补齐这一层诊断能力。

## 3. 范围

### 3.1 输入

命令接收两个必需输入：

- 正式评测数据集 JSONL：包含查询和 `relevantChunks` 相关性等级；
- 基线报告 JSON：包含一个或多个检索模式的逐查询结果。

第一版要求输入报告至少包含 `vector`、`fulltext`、`hybrid` 三种模式，并校验：

- 数据集 SHA-256 一致；
- 查询 ID 集合一致；
- 每个模式的 `topK` 一致；
- 每个查询都能在数据集中找到对应人工标注；
- 检索结果中的 chunk ID 能与标注集合进行确定性对照。

### 3.2 分析维度

对每个模式、每条查询输出以下诊断信息：

- 人工标注相关 chunk 总数；
- Top-K 命中的相关 chunk 数量和命中比例；
- 未被召回的相关 chunk ID；
- Top-K 中相关性为 `0` 的误召回 chunk ID；
- Top-K 中最高相关性等级；
- 是否完全覆盖、部分覆盖或完全没有召回相关 chunk；
- 是否出现“只召回背景 chunk，但遗漏核心 chunk”的情况。核心 chunk 定义为人工相关性 `2` 或 `3`，背景 chunk 定义为 `1`；
- 原始 Precision、Recall、MRR、nDCG 和延迟，避免诊断结果与基线指标脱节。

其中：

- `relevance >= 1` 视为可用于召回覆盖率的相关 chunk；
- `relevance >= 2` 只用于识别核心内容遗漏，不替代正式评测指标；
- `relevance = 0` 只表示人工审阅认为与当前查询无关。

### 3.3 模式对比

报告应按查询对比三种模式：

- 各模式的 Precision、Recall、MRR、nDCG 和延迟；
- 各模式命中的相关 chunk 集合；
- 各模式独有的命中和遗漏 chunk；
- 每条查询的推荐关注模式。

推荐关注模式使用确定性排序：先比较 nDCG，再比较 MRR，再比较 Precision，最后比较 Recall；完全相同则按固定模式顺序 `vector`、`fulltext`、`hybrid`。该字段只是帮助审阅，不表示自动证明某种模式是根因。

### 3.4 汇总结果

报告需要提供：

- 每个模式的查询总数；
- 完全覆盖、部分覆盖、零相关召回和背景-only 查询数量；
- 误召回总数及平均每查询误召回数；
- 最常被遗漏的相关 chunk；
- 按 nDCG、Recall 和误召回数排序的重点失败查询列表；
- 三种模式的汇总对比表。

报告只描述可从评测数据直接观察到的事实。像“应该调高向量权重”“应该重切 chunk”等内容只能作为待验证方向，不由工具直接下结论。

## 4. 架构设计

### 4.1 纯分析模块

在 `packages/ai-engine/src/knowledge/evaluation/failure-analysis.ts` 增加无外部依赖的纯函数。它接收已解析的数据集和报告对象，返回稳定、可序列化的分析结果。该模块不读取文件、不访问数据库、不调用 Qdrant、Ollama 或 LLM。

### 4.2 Workflow CLI

在 `apps/workflow/scripts/analyze-rag.ts` 增加 CLI：

```bash
pnpm --filter @ai-workflow/workflow analyze:rag -- \
  --dataset docs/rag/evaluation/prometheus-global-guardian-v1.jsonl \
  --report docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.json \
  --output-dir docs/rag/evaluation/analyses
```

CLI 负责参数解析、文件读取、JSONL 解析、报告结构校验、调用纯分析模块，以及原子写入 JSON 和 Markdown 两种报告。相对路径按仓库根目录解释，错误使用明确的配置或数据错误信息并返回非零退出码。

### 4.3 版本化产物

第一版真实基线生成：

- `docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.json`
- `docs/rag/evaluation/analyses/prometheus-global-guardian-v1.failure-analysis.md`

产物记录数据集哈希、基线报告路径、模式、Top-K、分析生成时间和 Git revision，避免把不同数据集或不同检索配置的诊断结果混在一起。

## 5. 测试设计

纯分析模块测试覆盖：

1. 完全覆盖、部分覆盖和零相关召回三类查询；
2. 误召回和未召回 chunk 的精确集合；
3. relevance `1`、`2`、`3` 的覆盖和核心遗漏判断；
4. 三模式指标对比和确定性推荐关注模式；
5. 最常遗漏 chunk 和汇总计数；
6. 缺少查询、数据集哈希不一致、Top-K 不一致和重复 chunk ID 时拒绝分析。

CLI 测试覆盖：

- 缺少必需参数；
- 输入文件不存在或 JSON/JSONL 无法解析；
- 报告与数据集不匹配；
- 成功写出 JSON/Markdown 报告；
- 输出目录创建和失败时不留下半成品。

## 6. 非目标与后续顺序

本阶段不包含：

- 修改 vector、fulltext、hybrid 或 rerank 实现；
- 自动搜索最优阈值或向量权重；
- Web UI；
- LLM 最终答案质量评分；
- 第二标注人一致性计算。

完成失败分析报告后，按以下顺序推进：

1. 根据报告选择一个最明确的检索问题进行小范围优化；
2. 重新运行三模式评测并与 v1 基线比较；
3. 补充第二标注人并计算一致性；
4. 增加无答案查询和最终答案质量评测。
