# 真实人工标注 RAG 评测集与首个质量基线设计

## 目标

为现有 RAG 评测 CLI 建立第一份可审阅、可版本化、可重复执行的真实人工标注评测集，并在同一份评测集上生成首个质量基线。基线用于后续比较向量、全文和混合检索的质量变化，不把自动检索结果或模型判断冒充人工标签。

首个评测对象为当前已存在并可连接的 Knowledge Base：

- 名称：`Prometheus Global Guardian 灾害分析 RAG 知识库`
- Knowledge Base ID：`cmtjxa48x000dyygofy7skckk`
- 当前文档：`prometheus-global-guardian-知识库.md`
- 当前索引：30 个 chunk，embedding 为 `ollama/mxbai-embed-large:latest`，维度 1024

## 现状与约束

- 当前评测框架已经支持 JSONL 校验、Precision@K、Recall@K、MRR@K、nDCG@K、延迟报告和基线比较。
- `docs/rag/evaluation/example.jsonl` 仍是虚构 ID 的工具链样例，不得用于质量结论。
- 现有评测数据格式的 `relevantChunks` 只接受 relevance `1`、`2`、`3`，且每条查询至少要有一个相关 chunk；本阶段不扩展“整个知识库无答案”的拒答评测。
- chunk ID 与切分版本绑定。文档内容、切分参数或重新索引变化后，必须重新核对受影响的标注。
- 评测只读调用 PostgreSQL、Qdrant 和 Ollama；不修改线上知识库或向量集合。

## 方案与取舍

采用“真实文档驱动的查询设计 + 检索候选池 + 人工裁决 + 版本化 JSONL + 三模式基线”的方案。

候选检索只负责把可能相关的 chunk 带到审阅者面前；最终 relevance 由人工根据原文和标注指南确认。首个知识库只有 30 个 chunk，候选池除了 vector/fulltext/hybrid 各自的 top-10 并集外，还允许审阅者从完整 chunk 清单中补入漏检的相关 chunk，避免把当前检索结果误当成完整标准答案。

不采用以下方案：

1. 只根据模型或当前检索排序自动生成标签：无法形成独立的质量标准。
2. 仅手写最终 JSONL、不保留候选审阅材料：难以复核标签来源和低相关样例。
3. 先开发 Web 标注界面：会把首个可用基线推迟到 UI 完成，当前规模用可审阅的 JSONL/Markdown 足够。

## 评测集设计

### 规模与覆盖

首版设计 24 条中文查询，按 8 类意图各 3 条。每类至少包含不同措辞；其中一部分使用同义表达或关键词式输入，另保留近似主题的低相关候选用于检验排序区分能力。

| 意图类别 | 覆盖内容 | 数量 |
| --- | --- | ---: |
| 知识库用途与边界 | 实时事实、知识规则、分析判断的区分；非官方系统边界 | 3 |
| 工作流输入与字段 | `hazard_context`、`total`、`byType`、`recent`、location/language | 3 |
| 灾害类型规则 | 统一编码、类型含义和分析重点 | 3 |
| 严重程度与数据源 | `ADVISORY/WATCH/WARNING`、USGS、NASA EONET、GDACS、DisasterAware | 3 |
| 灾害分析与通用建议 | 地震、洪水、野火、风暴、火山/海啸/滑坡、干旱 | 3 |
| 风险等级规则 | LOW/MEDIUM/HIGH/CRITICAL 的触发条件与限制 | 3 |
| JSON 输出契约 | 必填字段、数组约束、来源和 limitations 规则 | 3 |
| 典型用户问题 | 全球态势、洪水风险、最近地震、应急响应等真实问法 | 3 |

24 条是首个基线的最小规模，不代表完整覆盖。后续可按线上日志和失败案例扩展为 v2；扩展或修改样例必须产生新的数据集 SHA-256，不能覆盖旧基线。

### 相关性等级

审阅者逐个判断候选 chunk 对当前 query 的证据价值：

- `3`（直接相关）：chunk 直接回答问题，或包含回答所需的主要规则；应优先出现在 top-k。
- `2`（部分相关）：chunk 提供重要但不完整的支撑，需要与其他 chunk 结合才能回答；可计入相关集合但优先级低于 3。
- `1`（边缘相关）：chunk 与问题有明确主题联系，但只能提供背景或限制，不能单独支撑答案；只在确实有助于回答时标注。
- 不相关的候选不写入最终 `relevantChunks`。审阅材料可记录为 `0` 或 `not-relevant`，但最终评测 JSONL 仍遵循当前解析器只接受 1–3 的契约。

同一 query 可以有多个 relevance 为 3 的 chunk。不要因为 chunk 出现在当前检索 top-k 就自动标为相关，也不要为了让指标更好而删除已经确认相关的 chunk。

## 人工标注流程

1. 固定语料版本：记录 Knowledge Base ID、文档 ID、文档内容 SHA-256、chunk 数量、chunkSize/chunkOverlap、embedding 配置和标注日期。
2. 生成 24 条候选查询及候选池。每条 query 保存三个检索模式的 top-10 结果、chunk 文本、分数和 chunk ID；候选生成不写入最终评测集。
3. 审阅者逐条阅读 query、完整候选文本和原始知识库章节，按标注指南给候选 chunk 打 0/1/2/3；若发现候选池遗漏了原文中明确支持答案的 chunk，从完整 chunk 清单补入后再判定。
4. 对每条 query 做一次自检：至少一个相关 chunk；3 级 chunk 的理由可由原文直接追溯；低相关和近似主题候选没有被误标为高相关。
5. 将人工确认后的非零标签转换成版本化 JSONL。JSONL 只保存评测器需要的最小字段；人工理由、候选分数和审阅记录保存在同版本的 sidecar 审阅文件中。
6. 由第二次复核或项目负责人抽查全部 24 条，重点复核 relevance=1、多个 3 级 chunk、补入候选池的 chunk 以及文档标题/目录类 chunk。
7. 计算数据集 SHA-256 后，按 `top-k=5` 分别运行 vector、fulltext、hybrid，生成 JSON/Markdown 报告。报告中的质量指标才允许被称为首个质量基线。

如果只有一名审阅者完成标签，报告必须标记为“单人初始基线”；不将其描述为已完成一致性验证的黄金集。若后续增加第二位审阅者，可在 sidecar 中增加一致性字段，但不改变首版指标契约。

## 产物

建议新增以下版本化产物：

- `docs/rag/evaluation/prometheus-global-guardian-v1.jsonl`：人工确认后的正式评测集。
- `docs/rag/evaluation/prometheus-global-guardian-v1.manifest.json`：数据集版本、语料快照、标注规则版本、审阅者、日期和数据集 SHA-256。
- `docs/rag/evaluation/prometheus-global-guardian-v1.review.jsonl`：候选池及人工 0/1/2/3 判定，用于审计和复核，不直接作为 CLI 输入。
- `docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.json`：三种检索模式的首次真实评测报告；仅在人工标签和运行配置冻结后生成。
- `docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.md`：供人工阅读的摘要，明确记录“单人初始基线”或复核状态。
- `docs/rag/evaluation/README.md`：补充真实数据集使用方式、标注流程、语料变更后的失效规则和基线命名约定。

候选生成可以使用一次性脚本或 CLI，但候选输出不应覆盖正式 JSONL，也不能被 CI 当作基线。真实报告可能包含外部服务延迟，提交前需确认不含密钥、临时目录或无关运行产物。

## 基线配置与解释

- 查询数量：24
- 检索模式：`vector`、`fulltext`、`hybrid`
- `top-k`：5
- threshold、vectorWeight、embedding 和 Qdrant 配置：读取真实 Knowledge Base 当前值并写入报告
- 质量指标：Precision@5、Recall@5、MRR@5、nDCG@5
- 延迟：p50/p95 仅作为运行参考，不作为首版质量通过门禁
- 基线名称：`prometheus-global-guardian-v1`

基线只与相同数据集 SHA-256、相同 Knowledge Base、相同 `top-k`、相同检索模式和兼容检索配置比较。文档重切分、embedding 模型变化、检索参数变化或人工标签修订后，应创建新的基线版本或显式重新确认旧基线不再适用。

## 完成标准

1. 24 条查询均来自真实 Prometheus 知识库使用场景，并有人工确认的相关 chunk；没有虚构 Knowledge Base 或 chunk ID。
2. 每条 query 的人工标签可追溯到候选审阅记录和语料快照；最终 JSONL 通过现有数据校验。
3. vector、fulltext、hybrid 三种模式均在真实 PostgreSQL、Qdrant、Ollama 上成功运行。
4. 首个基线报告包含数据集哈希、语料/Embedding 配置、运行 revision、四项质量指标和 p50/p95 延迟。
5. 文档明确说明基线的人工审阅状态、适用范围和失效条件；不把演示数据或自动标签当作质量基线。

## 非目标

- 本阶段不引入新的 Web 标注系统、reranker、自动调参或在线监控。
- 本阶段不标注答案生成质量，不评估 LLM 最终回答的事实性和格式正确性。
- 本阶段不覆盖“知识库没有答案”的拒答召回率，后续需单独扩展数据契约。
