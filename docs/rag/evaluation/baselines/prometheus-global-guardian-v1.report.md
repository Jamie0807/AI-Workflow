# RAG Retrieval Evaluation

- Generated at: 2026-09-29T16:51:25.639Z
- Dataset: `docs/rag/evaluation/prometheus-global-guardian-v1.jsonl`
- Dataset SHA-256: `9c3b6b988ed65c59001cb3913a7590f2db73dcd5d0270c16fa45a2ac927df817`
- Samples: 24
- Baseline: frozen initial report
- Baseline status: single-annotator initial baseline

## Mode: vector

| Metric           |   Value |
| ---------------- | ------: |
| Precision@K      |  0.8750 |
| Recall@K         |  0.1985 |
| MRR@K            |  0.8958 |
| nDCG@K           |  0.4741 |
| p50 latency (ms) | 20.6203 |
| p95 latency (ms) | 27.3101 |

### Configuration

- Knowledge Base IDs: `cmtjxa48x000dyygofy7skckk`
- Top K: 5
- Threshold: 0.2
- Vector weight: 0.7
- Git revision: `4aaf41b6f3ca64cd9c641da4e7ab6604213dd814`
- Qdrant collection: `knowledge_chunks` (http://localhost:6333)
- Embedding: cmtjxa48x000dyygofy7skckk=ollama/mxbai-embed-large:latest (1024d)

### Query results

- **pgg-v1-scope-boundary-direct** — Prometheus Global Guardian 知识库如何区分实时事实、知识规则和分析判断？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_23`
    - Metrics: Precision 0.6000, Recall 0.1200, MRR 0.5000, nDCG 0.4163
    - Latency: 670.9100 ms

- **pgg-v1-scope-boundary-synonym** — 这个助手的灾害分析回答边界是什么，能否替代官方预警、应急调度或现场指挥？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_20`
    - Metrics: Precision 1.0000, Recall 0.1923, MRR 1.0000, nDCG 0.7449
    - Latency: 27.3101 ms

- **pgg-v1-scope-boundary-keywords** — 实时事实｜知识规则｜分析判断｜非官方预警系统｜现场指挥
    - Retrieved: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_3`
    - Metrics: Precision 1.0000, Recall 0.1923, MRR 1.0000, nDCG 0.8551
    - Latency: 22.3592 ms

- **pgg-v1-workflow-fields-direct** — hazard_context、location 和 language 分别如何作为工作流输入？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_29`
    - Metrics: Precision 1.0000, Recall 0.2632, MRR 1.0000, nDCG 0.6846
    - Latency: 18.4512 ms

- **pgg-v1-workflow-fields-synonym** — total、byType、recent 字段各表示什么，recent 有哪些覆盖限制？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_22`
    - Metrics: Precision 0.8000, Recall 0.2353, MRR 1.0000, nDCG 0.7081
    - Latency: 18.0313 ms

- **pgg-v1-workflow-fields-keywords** — hazard_context｜total｜byType｜recent｜location｜language｜空或不完整快照
    - Retrieved: `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_26`
    - Metrics: Precision 1.0000, Recall 0.2778, MRR 1.0000, nDCG 0.6108
    - Latency: 18.3462 ms

- **pgg-v1-hazard-types-direct** — 统一灾害类型编码与各类型的分析重点如何对应？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_23`
    - Metrics: Precision 0.8000, Recall 0.1667, MRR 1.0000, nDCG 0.3353
    - Latency: 20.8582 ms

- **pgg-v1-hazard-types-synonym** — 遇到 UNKNOWN 或 DisasterAware 的额外类型编码时，Guardian 应该如何处理？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_29`
    - Metrics: Precision 1.0000, Recall 0.2174, MRR 1.0000, nDCG 0.3271
    - Latency: 20.2427 ms

- **pgg-v1-hazard-types-keywords** — 灾害类型编码与分析重点：EARTHQUAKE｜FLOOD｜VOLCANO｜WILDFIRE｜TROPICAL_CYCLONE｜STORM｜DROUGHT｜TSUNAMI｜LANDSLIDE
    - Retrieved: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_26`
    - Metrics: Precision 1.0000, Recall 0.1923, MRR 1.0000, nDCG 0.3294
    - Latency: 21.0374 ms

- **pgg-v1-severity-sources-direct** — ADVISORY、WATCH、WARNING 在 Guardian 中分别表示什么？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_23`
    - Metrics: Precision 0.4000, Recall 0.0870, MRR 0.3333, nDCG 0.0725
    - Latency: 21.9301 ms

- **pgg-v1-severity-sources-synonym** — USGS、NASA EONET 和 GDACS 的数据来源及严重程度映射有什么差异？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_29`
    - Metrics: Precision 0.6000, Recall 0.1154, MRR 0.3333, nDCG 0.2475
    - Latency: 23.9927 ms

- **pgg-v1-severity-sources-keywords** — DisasterAware 原始字段｜统一 Hazard 字段｜USGS magnitude｜GDACS Red Orange｜NASA ADVISORY
    - Retrieved: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_1`
    - Metrics: Precision 1.0000, Recall 0.2500, MRR 1.0000, nDCG 0.8595
    - Latency: 19.9136 ms

- **pgg-v1-hazard-guidance-direct** — 在没有完整地点、时间、强度或官方预警时，灾害建议应如何表述？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_26`
    - Metrics: Precision 1.0000, Recall 0.1852, MRR 1.0000, nDCG 0.5093
    - Latency: 21.2005 ms

- **pgg-v1-hazard-guidance-synonym** — 地震、洪水或野火的通用准备建议有哪些，哪些行动不能被回答宣称已经执行？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_20`
    - Metrics: Precision 1.0000, Recall 0.1923, MRR 1.0000, nDCG 0.3911
    - Latency: 20.3287 ms

- **pgg-v1-hazard-guidance-keywords** — 地震：余震｜建筑安全｜海啸；洪水：积水｜水位｜道路；野火：风向｜烟雾｜疏散
    - Retrieved: `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_5`
    - Metrics: Precision 1.0000, Recall 0.2174, MRR 1.0000, nDCG 0.8166
    - Latency: 20.6203 ms

- **pgg-v1-risk-levels-direct** — LOW、MEDIUM、HIGH、CRITICAL 四个风险等级分别依据什么？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_5`
    - Metrics: Precision 1.0000, Recall 0.1852, MRR 1.0000, nDCG 0.4727
    - Latency: 22.4756 ms

- **pgg-v1-risk-levels-synonym** — 为什么只有事件数量不能单独触发 HIGH 或 CRITICAL，信息不足时应如何选择等级？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_25`
    - Metrics: Precision 0.8000, Recall 0.1481, MRR 1.0000, nDCG 0.2508
    - Latency: 17.3797 ms

- **pgg-v1-risk-levels-keywords** — risk_level：LOW｜MEDIUM｜HIGH｜CRITICAL｜WARNING｜叠加灾害｜证据不足
    - Retrieved: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_2`
    - Metrics: Precision 0.8000, Recall 0.1481, MRR 1.0000, nDCG 0.2414
    - Latency: 17.2788 ms

- **pgg-v1-json-contract-direct** — 工作流 JSON 输出必须包含哪些字段，各字段的数据类型有什么要求？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`
    - Metrics: Precision 0.8000, Recall 0.2857, MRR 1.0000, nDCG 0.6723
    - Latency: 17.9656 ms

- **pgg-v1-json-contract-synonym** — sources 和 limitations 应如何填写，为什么不能从知识库生成当前事件数量或地点？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_26`
    - Metrics: Precision 0.6000, Recall 0.1579, MRR 0.3333, nDCG 0.1921
    - Latency: 20.7027 ms

- **pgg-v1-json-contract-keywords** — JSON：result｜summary｜risk_level｜key_findings｜recommendations｜sources｜limitations｜数组｜有效 JSON
    - Retrieved: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_2`
    - Metrics: Precision 0.8000, Recall 0.3077, MRR 1.0000, nDCG 0.6689
    - Latency: 21.4813 ms

- **pgg-v1-typical-questions-direct** — 总结当前全球灾害态势时应读取哪些字段？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_14`
    - Metrics: Precision 1.0000, Recall 0.1852, MRR 1.0000, nDCG 0.3631
    - Latency: 22.1864 ms

- **pgg-v1-typical-questions-synonym** — 当前洪水风险有多高？回答前应先核实哪些信息，数据不足时如何表达？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_4`
    - Metrics: Precision 1.0000, Recall 0.1786, MRR 1.0000, nDCG 0.1950
    - Latency: 19.5472 ms

- **pgg-v1-typical-questions-keywords** — 最近地震记录｜recent｜震级｜时间｜严重程度｜不推断伤亡或建筑损坏
    - Retrieved: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`
    - Metrics: Precision 1.0000, Recall 0.2632, MRR 1.0000, nDCG 0.4151
    - Latency: 20.1985 ms

## Mode: fulltext

| Metric           |  Value |
| ---------------- | -----: |
| Precision@K      | 0.4583 |
| Recall@K         | 0.1064 |
| MRR@K            | 0.6667 |
| nDCG@K           | 0.3224 |
| p50 latency (ms) | 2.1990 |
| p95 latency (ms) | 4.5716 |

### Configuration

- Knowledge Base IDs: `cmtjxa48x000dyygofy7skckk`
- Top K: 5
- Threshold: 0.2
- Vector weight: 0.7
- Git revision: `4aaf41b6f3ca64cd9c641da4e7ab6604213dd814`
- Qdrant collection: `knowledge_chunks` (http://localhost:6333)
- Embedding: cmtjxa48x000dyygofy7skckk=ollama/mxbai-embed-large:latest (1024d)

### Query results

- **pgg-v1-scope-boundary-direct** — Prometheus Global Guardian 知识库如何区分实时事实、知识规则和分析判断？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_8`
    - Metrics: Precision 0.6000, Recall 0.1200, MRR 1.0000, nDCG 0.6918
    - Latency: 12.1305 ms

- **pgg-v1-scope-boundary-synonym** — 这个助手的灾害分析回答边界是什么，能否替代官方预警、应急调度或现场指挥？
    - Retrieved: none
    - Metrics: Precision 0.0000, Recall 0.0000, MRR 0.0000, nDCG 0.0000
    - Latency: 3.3527 ms

- **pgg-v1-scope-boundary-keywords** — 实时事实｜知识规则｜分析判断｜非官方预警系统｜现场指挥
    - Retrieved: none
    - Metrics: Precision 0.0000, Recall 0.0000, MRR 0.0000, nDCG 0.0000
    - Latency: 2.3495 ms

- **pgg-v1-workflow-fields-direct** — hazard_context、location 和 language 分别如何作为工作流输入？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_18`
    - Metrics: Precision 0.8000, Recall 0.2105, MRR 1.0000, nDCG 0.1906
    - Latency: 4.5716 ms

- **pgg-v1-workflow-fields-synonym** — total、byType、recent 字段各表示什么，recent 有哪些覆盖限制？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`
    - Metrics: Precision 0.8000, Recall 0.2353, MRR 1.0000, nDCG 0.8318
    - Latency: 2.6442 ms

- **pgg-v1-workflow-fields-keywords** — hazard_context｜total｜byType｜recent｜location｜language｜空或不完整快照
    - Retrieved: none
    - Metrics: Precision 0.0000, Recall 0.0000, MRR 0.0000, nDCG 0.0000
    - Latency: 2.5545 ms

- **pgg-v1-hazard-types-direct** — 统一灾害类型编码与各类型的分析重点如何对应？
    - Retrieved: none
    - Metrics: Precision 0.0000, Recall 0.0000, MRR 0.0000, nDCG 0.0000
    - Latency: 2.4109 ms

- **pgg-v1-hazard-types-synonym** — 遇到 UNKNOWN 或 DisasterAware 的额外类型编码时，Guardian 应该如何处理？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_8`
    - Metrics: Precision 0.4000, Recall 0.0870, MRR 0.5000, nDCG 0.0879
    - Latency: 2.5373 ms

- **pgg-v1-hazard-types-keywords** — 灾害类型编码与分析重点：EARTHQUAKE｜FLOOD｜VOLCANO｜WILDFIRE｜TROPICAL_CYCLONE｜STORM｜DROUGHT｜TSUNAMI｜LANDSLIDE
    - Retrieved: none
    - Metrics: Precision 0.0000, Recall 0.0000, MRR 0.0000, nDCG 0.0000
    - Latency: 2.1990 ms

- **pgg-v1-severity-sources-direct** — ADVISORY、WATCH、WARNING 在 Guardian 中分别表示什么？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_2`
    - Metrics: Precision 0.8000, Recall 0.1739, MRR 0.5000, nDCG 0.4307
    - Latency: 2.2204 ms

- **pgg-v1-severity-sources-synonym** — USGS、NASA EONET 和 GDACS 的数据来源及严重程度映射有什么差异？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_11`
    - Metrics: Precision 0.6000, Recall 0.1154, MRR 1.0000, nDCG 0.2017
    - Latency: 2.1620 ms

- **pgg-v1-severity-sources-keywords** — DisasterAware 原始字段｜统一 Hazard 字段｜USGS magnitude｜GDACS Red Orange｜NASA ADVISORY
    - Retrieved: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_25`
    - Metrics: Precision 1.0000, Recall 0.2500, MRR 1.0000, nDCG 0.8936
    - Latency: 2.1700 ms

- **pgg-v1-hazard-guidance-direct** — 在没有完整地点、时间、强度或官方预警时，灾害建议应如何表述？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_28`
    - Metrics: Precision 1.0000, Recall 0.1852, MRR 1.0000, nDCG 0.4487
    - Latency: 2.2672 ms

- **pgg-v1-hazard-guidance-synonym** — 地震、洪水或野火的通用准备建议有哪些，哪些行动不能被回答宣称已经执行？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_5`
    - Metrics: Precision 1.0000, Recall 0.1923, MRR 1.0000, nDCG 0.4711
    - Latency: 2.2225 ms

- **pgg-v1-hazard-guidance-keywords** — 地震：余震｜建筑安全｜海啸；洪水：积水｜水位｜道路；野火：风向｜烟雾｜疏散
    - Retrieved: `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_15`
    - Metrics: Precision 0.6000, Recall 0.1304, MRR 1.0000, nDCG 0.6844
    - Latency: 2.7445 ms

- **pgg-v1-risk-levels-direct** — LOW、MEDIUM、HIGH、CRITICAL 四个风险等级分别依据什么？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_23`
    - Metrics: Precision 0.4000, Recall 0.0741, MRR 1.0000, nDCG 0.2252
    - Latency: 2.1540 ms

- **pgg-v1-risk-levels-synonym** — 为什么只有事件数量不能单独触发 HIGH 或 CRITICAL，信息不足时应如何选择等级？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_3`
    - Metrics: Precision 0.8000, Recall 0.1481, MRR 1.0000, nDCG 0.3185
    - Latency: 2.0908 ms

- **pgg-v1-risk-levels-keywords** — risk_level：LOW｜MEDIUM｜HIGH｜CRITICAL｜WARNING｜叠加灾害｜证据不足
    - Retrieved: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_21`
    - Metrics: Precision 0.4000, Recall 0.0741, MRR 1.0000, nDCG 0.2277
    - Latency: 2.1957 ms

- **pgg-v1-json-contract-direct** — 工作流 JSON 输出必须包含哪些字段，各字段的数据类型有什么要求？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_10`
    - Metrics: Precision 0.8000, Recall 0.2857, MRR 1.0000, nDCG 0.9079
    - Latency: 2.1806 ms

- **pgg-v1-json-contract-synonym** — sources 和 limitations 应如何填写，为什么不能从知识库生成当前事件数量或地点？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_15`
    - Metrics: Precision 0.6000, Recall 0.1579, MRR 1.0000, nDCG 0.5245
    - Latency: 2.0764 ms

- **pgg-v1-json-contract-keywords** — JSON：result｜summary｜risk_level｜key_findings｜recommendations｜sources｜limitations｜数组｜有效 JSON
    - Retrieved: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_10`
    - Metrics: Precision 0.2000, Recall 0.0769, MRR 1.0000, nDCG 0.5497
    - Latency: 2.0760 ms

- **pgg-v1-typical-questions-direct** — 总结当前全球灾害态势时应读取哪些字段？
    - Retrieved: none
    - Metrics: Precision 0.0000, Recall 0.0000, MRR 0.0000, nDCG 0.0000
    - Latency: 2.1930 ms

- **pgg-v1-typical-questions-synonym** — 当前洪水风险有多高？回答前应先核实哪些信息，数据不足时如何表达？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_26`
    - Metrics: Precision 0.2000, Recall 0.0357, MRR 1.0000, nDCG 0.0524
    - Latency: 2.1002 ms

- **pgg-v1-typical-questions-keywords** — 最近地震记录｜recent｜震级｜时间｜严重程度｜不推断伤亡或建筑损坏
    - Retrieved: none
    - Metrics: Precision 0.0000, Recall 0.0000, MRR 0.0000, nDCG 0.0000
    - Latency: 2.1004 ms

## Mode: hybrid

| Metric           |   Value |
| ---------------- | ------: |
| Precision@K      |  0.8583 |
| Recall@K         |  0.1957 |
| MRR@K            |  0.9097 |
| nDCG@K           |  0.4724 |
| p50 latency (ms) | 19.3042 |
| p95 latency (ms) | 22.5595 |

### Configuration

- Knowledge Base IDs: `cmtjxa48x000dyygofy7skckk`
- Top K: 5
- Threshold: 0.2
- Vector weight: 0.7
- Git revision: `4aaf41b6f3ca64cd9c641da4e7ab6604213dd814`
- Qdrant collection: `knowledge_chunks` (http://localhost:6333)
- Embedding: cmtjxa48x000dyygofy7skckk=ollama/mxbai-embed-large:latest (1024d)

### Query results

- **pgg-v1-scope-boundary-direct** — Prometheus Global Guardian 知识库如何区分实时事实、知识规则和分析判断？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_23`
    - Metrics: Precision 0.6000, Recall 0.1200, MRR 0.5000, nDCG 0.4163
    - Latency: 22.5595 ms

- **pgg-v1-scope-boundary-synonym** — 这个助手的灾害分析回答边界是什么，能否替代官方预警、应急调度或现场指挥？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_20`
    - Metrics: Precision 1.0000, Recall 0.1923, MRR 1.0000, nDCG 0.7449
    - Latency: 22.8712 ms

- **pgg-v1-scope-boundary-keywords** — 实时事实｜知识规则｜分析判断｜非官方预警系统｜现场指挥
    - Retrieved: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_3`
    - Metrics: Precision 1.0000, Recall 0.1923, MRR 1.0000, nDCG 0.8551
    - Latency: 20.6689 ms

- **pgg-v1-workflow-fields-direct** — hazard_context、location 和 language 分别如何作为工作流输入？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_2`
    - Metrics: Precision 0.8000, Recall 0.2105, MRR 1.0000, nDCG 0.3179
    - Latency: 18.7852 ms

- **pgg-v1-workflow-fields-synonym** — total、byType、recent 字段各表示什么，recent 有哪些覆盖限制？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`
    - Metrics: Precision 0.8000, Recall 0.2353, MRR 1.0000, nDCG 0.7683
    - Latency: 21.6546 ms

- **pgg-v1-workflow-fields-keywords** — hazard_context｜total｜byType｜recent｜location｜language｜空或不完整快照
    - Retrieved: `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_26`
    - Metrics: Precision 1.0000, Recall 0.2778, MRR 1.0000, nDCG 0.6108
    - Latency: 19.0500 ms

- **pgg-v1-hazard-types-direct** — 统一灾害类型编码与各类型的分析重点如何对应？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_23`
    - Metrics: Precision 0.8000, Recall 0.1667, MRR 1.0000, nDCG 0.3353
    - Latency: 18.7101 ms

- **pgg-v1-hazard-types-synonym** — 遇到 UNKNOWN 或 DisasterAware 的额外类型编码时，Guardian 应该如何处理？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_23`
    - Metrics: Precision 0.6000, Recall 0.1304, MRR 1.0000, nDCG 0.1765
    - Latency: 19.5590 ms

- **pgg-v1-hazard-types-keywords** — 灾害类型编码与分析重点：EARTHQUAKE｜FLOOD｜VOLCANO｜WILDFIRE｜TROPICAL_CYCLONE｜STORM｜DROUGHT｜TSUNAMI｜LANDSLIDE
    - Retrieved: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_26`
    - Metrics: Precision 1.0000, Recall 0.1923, MRR 1.0000, nDCG 0.3294
    - Latency: 19.1640 ms

- **pgg-v1-severity-sources-direct** — ADVISORY、WATCH、WARNING 在 Guardian 中分别表示什么？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_7`
    - Metrics: Precision 0.6000, Recall 0.1304, MRR 0.5000, nDCG 0.3767
    - Latency: 18.6845 ms

- **pgg-v1-severity-sources-synonym** — USGS、NASA EONET 和 GDACS 的数据来源及严重程度映射有什么差异？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_1`
    - Metrics: Precision 0.6000, Recall 0.1154, MRR 0.3333, nDCG 0.1804
    - Latency: 18.2326 ms

- **pgg-v1-severity-sources-keywords** — DisasterAware 原始字段｜统一 Hazard 字段｜USGS magnitude｜GDACS Red Orange｜NASA ADVISORY
    - Retrieved: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_25`
    - Metrics: Precision 1.0000, Recall 0.2500, MRR 1.0000, nDCG 0.8285
    - Latency: 19.3042 ms

- **pgg-v1-hazard-guidance-direct** — 在没有完整地点、时间、强度或官方预警时，灾害建议应如何表述？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_26`
    - Metrics: Precision 1.0000, Recall 0.1852, MRR 1.0000, nDCG 0.5093
    - Latency: 20.2181 ms

- **pgg-v1-hazard-guidance-synonym** — 地震、洪水或野火的通用准备建议有哪些，哪些行动不能被回答宣称已经执行？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_16`
    - Metrics: Precision 1.0000, Recall 0.1923, MRR 1.0000, nDCG 0.3940
    - Latency: 20.6922 ms

- **pgg-v1-hazard-guidance-keywords** — 地震：余震｜建筑安全｜海啸；洪水：积水｜水位｜道路；野火：风向｜烟雾｜疏散
    - Retrieved: `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_17`
    - Metrics: Precision 0.8000, Recall 0.1739, MRR 1.0000, nDCG 0.8539
    - Latency: 19.8804 ms

- **pgg-v1-risk-levels-direct** — LOW、MEDIUM、HIGH、CRITICAL 四个风险等级分别依据什么？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_5`
    - Metrics: Precision 1.0000, Recall 0.1852, MRR 1.0000, nDCG 0.4727
    - Latency: 17.9774 ms

- **pgg-v1-risk-levels-synonym** — 为什么只有事件数量不能单独触发 HIGH 或 CRITICAL，信息不足时应如何选择等级？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_1`
    - Metrics: Precision 0.8000, Recall 0.1481, MRR 1.0000, nDCG 0.2577
    - Latency: 18.8880 ms

- **pgg-v1-risk-levels-keywords** — risk_level：LOW｜MEDIUM｜HIGH｜CRITICAL｜WARNING｜叠加灾害｜证据不足
    - Retrieved: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_4`
    - Metrics: Precision 0.8000, Recall 0.1481, MRR 1.0000, nDCG 0.2719
    - Latency: 19.3595 ms

- **pgg-v1-json-contract-direct** — 工作流 JSON 输出必须包含哪些字段，各字段的数据类型有什么要求？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_25`
    - Metrics: Precision 1.0000, Recall 0.3571, MRR 1.0000, nDCG 0.7027
    - Latency: 20.5246 ms

- **pgg-v1-json-contract-synonym** — sources 和 limitations 应如何填写，为什么不能从知识库生成当前事件数量或地点？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_25`
    - Metrics: Precision 0.6000, Recall 0.1579, MRR 0.5000, nDCG 0.2940
    - Latency: 20.0753 ms

- **pgg-v1-json-contract-keywords** — JSON：result｜summary｜risk_level｜key_findings｜recommendations｜sources｜limitations｜数组｜有效 JSON
    - Retrieved: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_2`
    - Metrics: Precision 0.8000, Recall 0.3077, MRR 1.0000, nDCG 0.6689
    - Latency: 19.3688 ms

- **pgg-v1-typical-questions-direct** — 总结当前全球灾害态势时应读取哪些字段？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_14`
    - Metrics: Precision 1.0000, Recall 0.1852, MRR 1.0000, nDCG 0.3631
    - Latency: 18.4969 ms

- **pgg-v1-typical-questions-synonym** — 当前洪水风险有多高？回答前应先核实哪些信息，数据不足时如何表达？
    - Retrieved: `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_4`
    - Metrics: Precision 1.0000, Recall 0.1786, MRR 1.0000, nDCG 0.1950
    - Latency: 18.7108 ms

- **pgg-v1-typical-questions-keywords** — 最近地震记录｜recent｜震级｜时间｜严重程度｜不推断伤亡或建筑损坏
    - Retrieved: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`
    - Metrics: Precision 1.0000, Recall 0.2632, MRR 1.0000, nDCG 0.4151
    - Latency: 17.5505 ms
