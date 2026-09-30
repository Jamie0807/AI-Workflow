# RAG Retrieval Failure Analysis

## Dataset and baseline

- Dataset: `docs/rag/evaluation/prometheus-global-guardian-v1.jsonl`
- Dataset SHA-256: `9c3b6b988ed65c59001cb3913a7590f2db73dcd5d0270c16fa45a2ac927df817`
- Samples: 24
- Baseline report: `docs/rag/evaluation/baselines/prometheus-global-guardian-v1.report.json`
- Top-K: 5
- Generated at: 2026-09-30T09:51:59.663Z
- Git revision: `ecfc1bf8ce3ae2735ed5c89751882869edd831f8`

## Mode summary

| Mode     | Query count | Complete | Partial | Zero | background-only | False positives | Average false positives/query | Precision@K | Recall@K |  MRR@K | nDCG@K | p50 latency (ms) | p95 latency (ms) |
| -------- | ----------: | -------: | ------: | ---: | --------------: | --------------: | ----------------------------: | ----------: | -------: | -----: | -----: | ---------------: | ---------------: |
| vector   |          24 |        0 |      24 |    0 |               1 |              15 |                        0.6250 |      0.8750 |   0.1985 | 0.8958 | 0.4741 |          20.6203 |          27.3101 |
| fulltext |          24 |        0 |      17 |    7 |               3 |              19 |                        0.7917 |      0.4583 |   0.1064 | 0.6667 | 0.3224 |           2.1990 |           4.5716 |
| hybrid   |          24 |        0 |      24 |    0 |               1 |              17 |                        0.7083 |      0.8583 |   0.1957 | 0.9097 | 0.4724 |          19.3042 |          22.5595 |

## Priority failure queries

| Rank | Sample                            | Query                                                                                                              | Recommended focus mode | nDCG@K | Recall@K | False positives |
| ---: | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------- | -----: | -------: | --------------: |
|    1 | pgg-v1-typical-questions-synonym  | 当前洪水风险有多高？回答前应先核实哪些信息，数据不足时如何表达？                                                   | vector                 | 0.1950 |   0.1786 |               0 |
|    2 | pgg-v1-severity-sources-synonym   | USGS、NASA EONET 和 GDACS 的数据来源及严重程度映射有什么差异？                                                     | vector                 | 0.2475 |   0.1154 |               2 |
|    3 | pgg-v1-risk-levels-keywords       | risk_level：LOW｜MEDIUM｜HIGH｜CRITICAL｜WARNING｜叠加灾害｜证据不足                                               | hybrid                 | 0.2719 |   0.1481 |               1 |
|    4 | pgg-v1-risk-levels-synonym        | 为什么只有事件数量不能单独触发 HIGH 或 CRITICAL，信息不足时应如何选择等级？                                        | fulltext               | 0.3185 |   0.1481 |               1 |
|    5 | pgg-v1-hazard-types-synonym       | 遇到 UNKNOWN 或 DisasterAware 的额外类型编码时，Guardian 应该如何处理？                                            | vector                 | 0.3271 |   0.2174 |               0 |
|    6 | pgg-v1-hazard-types-keywords      | 灾害类型编码与分析重点：EARTHQUAKE｜FLOOD｜VOLCANO｜WILDFIRE｜TROPICAL_CYCLONE｜STORM｜DROUGHT｜TSUNAMI｜LANDSLIDE | vector                 | 0.3294 |   0.1923 |               0 |
|    7 | pgg-v1-hazard-types-direct        | 统一灾害类型编码与各类型的分析重点如何对应？                                                                       | vector                 | 0.3353 |   0.1667 |               1 |
|    8 | pgg-v1-typical-questions-direct   | 总结当前全球灾害态势时应读取哪些字段？                                                                             | vector                 | 0.3631 |   0.1852 |               0 |
|    9 | pgg-v1-typical-questions-keywords | 最近地震记录｜recent｜震级｜时间｜严重程度｜不推断伤亡或建筑损坏                                                   | vector                 | 0.4151 |   0.2632 |               0 |
|   10 | pgg-v1-severity-sources-direct    | ADVISORY、WATCH、WARNING 在 Guardian 中分别表示什么？                                                              | fulltext               | 0.4307 |   0.1739 |               1 |
|   11 | pgg-v1-hazard-guidance-synonym    | 地震、洪水或野火的通用准备建议有哪些，哪些行动不能被回答宣称已经执行？                                             | fulltext               | 0.4711 |   0.1923 |               0 |
|   12 | pgg-v1-risk-levels-direct         | LOW、MEDIUM、HIGH、CRITICAL 四个风险等级分别依据什么？                                                             | vector                 | 0.4727 |   0.1852 |               0 |
|   13 | pgg-v1-hazard-guidance-direct     | 在没有完整地点、时间、强度或官方预警时，灾害建议应如何表述？                                                       | vector                 | 0.5093 |   0.1852 |               0 |
|   14 | pgg-v1-json-contract-synonym      | sources 和 limitations 应如何填写，为什么不能从知识库生成当前事件数量或地点？                                      | fulltext               | 0.5245 |   0.1579 |               2 |
|   15 | pgg-v1-workflow-fields-keywords   | hazard_context｜total｜byType｜recent｜location｜language｜空或不完整快照                                          | vector                 | 0.6108 |   0.2778 |               0 |
|   16 | pgg-v1-json-contract-keywords     | JSON：result｜summary｜risk_level｜key_findings｜recommendations｜sources｜limitations｜数组｜有效 JSON            | vector                 | 0.6689 |   0.3077 |               1 |
|   17 | pgg-v1-workflow-fields-direct     | hazard_context、location 和 language 分别如何作为工作流输入？                                                      | vector                 | 0.6846 |   0.2632 |               0 |
|   18 | pgg-v1-scope-boundary-direct      | Prometheus Global Guardian 知识库如何区分实时事实、知识规则和分析判断？                                            | fulltext               | 0.6918 |   0.1200 |               2 |
|   19 | pgg-v1-scope-boundary-synonym     | 这个助手的灾害分析回答边界是什么，能否替代官方预警、应急调度或现场指挥？                                           | vector                 | 0.7449 |   0.1923 |               0 |
|   20 | pgg-v1-workflow-fields-synonym    | total、byType、recent 字段各表示什么，recent 有哪些覆盖限制？                                                      | fulltext               | 0.8318 |   0.2353 |               1 |
|   21 | pgg-v1-hazard-guidance-keywords   | 地震：余震｜建筑安全｜海啸；洪水：积水｜水位｜道路；野火：风向｜烟雾｜疏散                                         | hybrid                 | 0.8539 |   0.1739 |               1 |
|   22 | pgg-v1-scope-boundary-keywords    | 实时事实｜知识规则｜分析判断｜非官方预警系统｜现场指挥                                                             | vector                 | 0.8551 |   0.1923 |               0 |
|   23 | pgg-v1-severity-sources-keywords  | DisasterAware 原始字段｜统一 Hazard 字段｜USGS magnitude｜GDACS Red Orange｜NASA ADVISORY                          | fulltext               | 0.8936 |   0.2500 |               0 |
|   24 | pgg-v1-json-contract-direct       | 工作流 JSON 输出必须包含哪些字段，各字段的数据类型有什么要求？                                                     | fulltext               | 0.9079 |   0.2857 |               1 |

## Query-by-query diagnostics

### Mode: vector

#### pgg-v1-scope-boundary-direct — Prometheus Global Guardian 知识库如何区分实时事实、知识规则和分析判断？

- Coverage status: partial
- Covered ratio: 0.1200 (3/25)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_8`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1200, MRR@K: 0.5000, nDCG@K: 0.4163
- Latency: 670.9100 ms

#### pgg-v1-scope-boundary-synonym — 这个助手的灾害分析回答边界是什么，能否替代官方预警、应急调度或现场指挥？

- Coverage status: partial
- Covered ratio: 0.1923 (5/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_20`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1923, MRR@K: 1.0000, nDCG@K: 0.7449
- Latency: 27.3101 ms

#### pgg-v1-scope-boundary-keywords — 实时事实｜知识规则｜分析判断｜非官方预警系统｜现场指挥

- Coverage status: partial
- Covered ratio: 0.1923 (5/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_3`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_9`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1923, MRR@K: 1.0000, nDCG@K: 0.8551
- Latency: 22.3592 ms

#### pgg-v1-workflow-fields-direct — hazard_context、location 和 language 分别如何作为工作流输入？

- Coverage status: partial
- Covered ratio: 0.2632 (5/19)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_29`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_28`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.2632, MRR@K: 1.0000, nDCG@K: 0.6846
- Latency: 18.4512 ms

#### pgg-v1-workflow-fields-synonym — total、byType、recent 字段各表示什么，recent 有哪些覆盖限制？

- Coverage status: partial
- Covered ratio: 0.2353 (4/17)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_22`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_27`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.2353, MRR@K: 1.0000, nDCG@K: 0.7081
- Latency: 18.0313 ms

#### pgg-v1-workflow-fields-keywords — hazard_context｜total｜byType｜recent｜location｜language｜空或不完整快照

- Coverage status: partial
- Covered ratio: 0.2778 (5/18)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_26`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.2778, MRR@K: 1.0000, nDCG@K: 0.6108
- Latency: 18.3462 ms

#### pgg-v1-hazard-types-direct — 统一灾害类型编码与各类型的分析重点如何对应？

- Coverage status: partial
- Covered ratio: 0.1667 (4/24)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.1667, MRR@K: 1.0000, nDCG@K: 0.3353
- Latency: 20.8582 ms

#### pgg-v1-hazard-types-synonym — 遇到 UNKNOWN 或 DisasterAware 的额外类型编码时，Guardian 应该如何处理？

- Coverage status: partial
- Covered ratio: 0.2174 (5/23)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_29`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_12`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.2174, MRR@K: 1.0000, nDCG@K: 0.3271
- Latency: 20.2427 ms

#### pgg-v1-hazard-types-keywords — 灾害类型编码与分析重点：EARTHQUAKE｜FLOOD｜VOLCANO｜WILDFIRE｜TROPICAL_CYCLONE｜STORM｜DROUGHT｜TSUNAMI｜LANDSLIDE

- Coverage status: partial
- Covered ratio: 0.1923 (5/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_26`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1923, MRR@K: 1.0000, nDCG@K: 0.3294
- Latency: 21.0374 ms

#### pgg-v1-severity-sources-direct — ADVISORY、WATCH、WARNING 在 Guardian 中分别表示什么？

- Coverage status: partial
- Covered ratio: 0.0870 (2/23)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`
- Background-only: yes
- Max retrieved relevance: 1
- Raw metrics: Precision@K: 0.4000, Recall@K: 0.0870, MRR@K: 0.3333, nDCG@K: 0.0725
- Latency: 21.9301 ms

#### pgg-v1-severity-sources-synonym — USGS、NASA EONET 和 GDACS 的数据来源及严重程度映射有什么差异？

- Coverage status: partial
- Covered ratio: 0.1154 (3/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_29`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_8`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1154, MRR@K: 0.3333, nDCG@K: 0.2475
- Latency: 23.9927 ms

#### pgg-v1-severity-sources-keywords — DisasterAware 原始字段｜统一 Hazard 字段｜USGS magnitude｜GDACS Red Orange｜NASA ADVISORY

- Coverage status: partial
- Covered ratio: 0.2500 (5/20)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_1`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_29`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.2500, MRR@K: 1.0000, nDCG@K: 0.8595
- Latency: 19.9136 ms

#### pgg-v1-hazard-guidance-direct — 在没有完整地点、时间、强度或官方预警时，灾害建议应如何表述？

- Coverage status: partial
- Covered ratio: 0.1852 (5/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_26`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1852, MRR@K: 1.0000, nDCG@K: 0.5093
- Latency: 21.2005 ms

#### pgg-v1-hazard-guidance-synonym — 地震、洪水或野火的通用准备建议有哪些，哪些行动不能被回答宣称已经执行？

- Coverage status: partial
- Covered ratio: 0.1923 (5/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_20`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1923, MRR@K: 1.0000, nDCG@K: 0.3911
- Latency: 20.3287 ms

#### pgg-v1-hazard-guidance-keywords — 地震：余震｜建筑安全｜海啸；洪水：积水｜水位｜道路；野火：风向｜烟雾｜疏散

- Coverage status: partial
- Covered ratio: 0.2174 (5/23)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_5`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.2174, MRR@K: 1.0000, nDCG@K: 0.8166
- Latency: 20.6203 ms

#### pgg-v1-risk-levels-direct — LOW、MEDIUM、HIGH、CRITICAL 四个风险等级分别依据什么？

- Coverage status: partial
- Covered ratio: 0.1852 (5/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_5`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1852, MRR@K: 1.0000, nDCG@K: 0.4727
- Latency: 22.4756 ms

#### pgg-v1-risk-levels-synonym — 为什么只有事件数量不能单独触发 HIGH 或 CRITICAL，信息不足时应如何选择等级？

- Coverage status: partial
- Covered ratio: 0.1481 (4/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_25`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.1481, MRR@K: 1.0000, nDCG@K: 0.2508
- Latency: 17.3797 ms

#### pgg-v1-risk-levels-keywords — risk_level：LOW｜MEDIUM｜HIGH｜CRITICAL｜WARNING｜叠加灾害｜证据不足

- Coverage status: partial
- Covered ratio: 0.1481 (4/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_2`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.1481, MRR@K: 1.0000, nDCG@K: 0.2414
- Latency: 17.2788 ms

#### pgg-v1-json-contract-direct — 工作流 JSON 输出必须包含哪些字段，各字段的数据类型有什么要求？

- Coverage status: partial
- Covered ratio: 0.2857 (4/14)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_3`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_4`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_21`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.2857, MRR@K: 1.0000, nDCG@K: 0.6723
- Latency: 17.9656 ms

#### pgg-v1-json-contract-synonym — sources 和 limitations 应如何填写，为什么不能从知识库生成当前事件数量或地点？

- Coverage status: partial
- Covered ratio: 0.1579 (3/19)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_26`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_4`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_24`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1579, MRR@K: 0.3333, nDCG@K: 0.1921
- Latency: 20.7027 ms

#### pgg-v1-json-contract-keywords — JSON：result｜summary｜risk_level｜key_findings｜recommendations｜sources｜limitations｜数组｜有效 JSON

- Coverage status: partial
- Covered ratio: 0.3077 (4/13)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_2`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_4`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_21`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.3077, MRR@K: 1.0000, nDCG@K: 0.6689
- Latency: 21.4813 ms

#### pgg-v1-typical-questions-direct — 总结当前全球灾害态势时应读取哪些字段？

- Coverage status: partial
- Covered ratio: 0.1852 (5/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_14`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_15`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1852, MRR@K: 1.0000, nDCG@K: 0.3631
- Latency: 22.1864 ms

#### pgg-v1-typical-questions-synonym — 当前洪水风险有多高？回答前应先核实哪些信息，数据不足时如何表达？

- Coverage status: partial
- Covered ratio: 0.1786 (5/28)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_4`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_23`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1786, MRR@K: 1.0000, nDCG@K: 0.1950
- Latency: 19.5472 ms

#### pgg-v1-typical-questions-keywords — 最近地震记录｜recent｜震级｜时间｜严重程度｜不推断伤亡或建筑损坏

- Coverage status: partial
- Covered ratio: 0.2632 (5/19)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_9`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_9`, `cmtjxadio000eyygov3gl3za5_22`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.2632, MRR@K: 1.0000, nDCG@K: 0.4151
- Latency: 20.1985 ms

### Mode: fulltext

#### pgg-v1-scope-boundary-direct — Prometheus Global Guardian 知识库如何区分实时事实、知识规则和分析判断？

- Coverage status: partial
- Covered ratio: 0.1200 (3/25)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_8`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1200, MRR@K: 1.0000, nDCG@K: 0.6918
- Latency: 12.1305 ms

#### pgg-v1-scope-boundary-synonym — 这个助手的灾害分析回答边界是什么，能否替代官方预警、应急调度或现场指挥？

- Coverage status: zero
- Covered ratio: 0.0000 (0/26)
- Covered relevant IDs: none
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 0
- Raw metrics: Precision@K: 0.0000, Recall@K: 0.0000, MRR@K: 0.0000, nDCG@K: 0.0000
- Latency: 3.3527 ms

#### pgg-v1-scope-boundary-keywords — 实时事实｜知识规则｜分析判断｜非官方预警系统｜现场指挥

- Coverage status: zero
- Covered ratio: 0.0000 (0/26)
- Covered relevant IDs: none
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_9`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 0
- Raw metrics: Precision@K: 0.0000, Recall@K: 0.0000, MRR@K: 0.0000, nDCG@K: 0.0000
- Latency: 2.3495 ms

#### pgg-v1-workflow-fields-direct — hazard_context、location 和 language 分别如何作为工作流输入？

- Coverage status: partial
- Covered ratio: 0.2105 (4/19)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_18`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_28`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_6`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: yes
- Max retrieved relevance: 1
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.2105, MRR@K: 1.0000, nDCG@K: 0.1906
- Latency: 4.5716 ms

#### pgg-v1-workflow-fields-synonym — total、byType、recent 字段各表示什么，recent 有哪些覆盖限制？

- Coverage status: partial
- Covered ratio: 0.2353 (4/17)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_25`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_28`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_27`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.2353, MRR@K: 1.0000, nDCG@K: 0.8318
- Latency: 2.6442 ms

#### pgg-v1-workflow-fields-keywords — hazard_context｜total｜byType｜recent｜location｜language｜空或不完整快照

- Coverage status: zero
- Covered ratio: 0.0000 (0/18)
- Covered relevant IDs: none
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 0
- Raw metrics: Precision@K: 0.0000, Recall@K: 0.0000, MRR@K: 0.0000, nDCG@K: 0.0000
- Latency: 2.5545 ms

#### pgg-v1-hazard-types-direct — 统一灾害类型编码与各类型的分析重点如何对应？

- Coverage status: zero
- Covered ratio: 0.0000 (0/24)
- Covered relevant IDs: none
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 0
- Raw metrics: Precision@K: 0.0000, Recall@K: 0.0000, MRR@K: 0.0000, nDCG@K: 0.0000
- Latency: 2.4109 ms

#### pgg-v1-hazard-types-synonym — 遇到 UNKNOWN 或 DisasterAware 的额外类型编码时，Guardian 应该如何处理？

- Coverage status: partial
- Covered ratio: 0.0870 (2/23)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_13`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_8`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_12`
- Background-only: yes
- Max retrieved relevance: 1
- Raw metrics: Precision@K: 0.4000, Recall@K: 0.0870, MRR@K: 0.5000, nDCG@K: 0.0879
- Latency: 2.5373 ms

#### pgg-v1-hazard-types-keywords — 灾害类型编码与分析重点：EARTHQUAKE｜FLOOD｜VOLCANO｜WILDFIRE｜TROPICAL_CYCLONE｜STORM｜DROUGHT｜TSUNAMI｜LANDSLIDE

- Coverage status: zero
- Covered ratio: 0.0000 (0/26)
- Covered relevant IDs: none
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 0
- Raw metrics: Precision@K: 0.0000, Recall@K: 0.0000, MRR@K: 0.0000, nDCG@K: 0.0000
- Latency: 2.1990 ms

#### pgg-v1-severity-sources-direct — ADVISORY、WATCH、WARNING 在 Guardian 中分别表示什么？

- Coverage status: partial
- Covered ratio: 0.1739 (4/23)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_2`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_8`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.1739, MRR@K: 0.5000, nDCG@K: 0.4307
- Latency: 2.2204 ms

#### pgg-v1-severity-sources-synonym — USGS、NASA EONET 和 GDACS 的数据来源及严重程度映射有什么差异？

- Coverage status: partial
- Covered ratio: 0.1154 (3/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_11`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_8`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1154, MRR@K: 1.0000, nDCG@K: 0.2017
- Latency: 2.1620 ms

#### pgg-v1-severity-sources-keywords — DisasterAware 原始字段｜统一 Hazard 字段｜USGS magnitude｜GDACS Red Orange｜NASA ADVISORY

- Coverage status: partial
- Covered ratio: 0.2500 (5/20)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_25`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.2500, MRR@K: 1.0000, nDCG@K: 0.8936
- Latency: 2.1700 ms

#### pgg-v1-hazard-guidance-direct — 在没有完整地点、时间、强度或官方预警时，灾害建议应如何表述？

- Coverage status: partial
- Covered ratio: 0.1852 (5/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_28`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1852, MRR@K: 1.0000, nDCG@K: 0.4487
- Latency: 2.2672 ms

#### pgg-v1-hazard-guidance-synonym — 地震、洪水或野火的通用准备建议有哪些，哪些行动不能被回答宣称已经执行？

- Coverage status: partial
- Covered ratio: 0.1923 (5/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_5`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1923, MRR@K: 1.0000, nDCG@K: 0.4711
- Latency: 2.2225 ms

#### pgg-v1-hazard-guidance-keywords — 地震：余震｜建筑安全｜海啸；洪水：积水｜水位｜道路；野火：风向｜烟雾｜疏散

- Coverage status: partial
- Covered ratio: 0.1304 (3/23)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_15`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_6`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1304, MRR@K: 1.0000, nDCG@K: 0.6844
- Latency: 2.7445 ms

#### pgg-v1-risk-levels-direct — LOW、MEDIUM、HIGH、CRITICAL 四个风险等级分别依据什么？

- Coverage status: partial
- Covered ratio: 0.0741 (2/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.4000, Recall@K: 0.0741, MRR@K: 1.0000, nDCG@K: 0.2252
- Latency: 2.1540 ms

#### pgg-v1-risk-levels-synonym — 为什么只有事件数量不能单独触发 HIGH 或 CRITICAL，信息不足时应如何选择等级？

- Coverage status: partial
- Covered ratio: 0.1481 (4/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_3`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.1481, MRR@K: 1.0000, nDCG@K: 0.3185
- Latency: 2.0908 ms

#### pgg-v1-risk-levels-keywords — risk_level：LOW｜MEDIUM｜HIGH｜CRITICAL｜WARNING｜叠加灾害｜证据不足

- Coverage status: partial
- Covered ratio: 0.0741 (2/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_21`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.4000, Recall@K: 0.0741, MRR@K: 1.0000, nDCG@K: 0.2277
- Latency: 2.1957 ms

#### pgg-v1-json-contract-direct — 工作流 JSON 输出必须包含哪些字段，各字段的数据类型有什么要求？

- Coverage status: partial
- Covered ratio: 0.2857 (4/14)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_29`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_10`
- Missed core IDs: none
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.2857, MRR@K: 1.0000, nDCG@K: 0.9079
- Latency: 2.1806 ms

#### pgg-v1-json-contract-synonym — sources 和 limitations 应如何填写，为什么不能从知识库生成当前事件数量或地点？

- Coverage status: partial
- Covered ratio: 0.1579 (3/19)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_6`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_15`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1579, MRR@K: 1.0000, nDCG@K: 0.5245
- Latency: 2.0764 ms

#### pgg-v1-json-contract-keywords — JSON：result｜summary｜risk_level｜key_findings｜recommendations｜sources｜limitations｜数组｜有效 JSON

- Coverage status: partial
- Covered ratio: 0.0769 (1/13)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_22`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_10`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_21`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.2000, Recall@K: 0.0769, MRR@K: 1.0000, nDCG@K: 0.5497
- Latency: 2.0760 ms

#### pgg-v1-typical-questions-direct — 总结当前全球灾害态势时应读取哪些字段？

- Coverage status: zero
- Covered ratio: 0.0000 (0/27)
- Covered relevant IDs: none
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`
- Background-only: no
- Max retrieved relevance: 0
- Raw metrics: Precision@K: 0.0000, Recall@K: 0.0000, MRR@K: 0.0000, nDCG@K: 0.0000
- Latency: 2.1930 ms

#### pgg-v1-typical-questions-synonym — 当前洪水风险有多高？回答前应先核实哪些信息，数据不足时如何表达？

- Coverage status: partial
- Covered ratio: 0.0357 (1/28)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_26`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_23`
- Background-only: yes
- Max retrieved relevance: 1
- Raw metrics: Precision@K: 0.2000, Recall@K: 0.0357, MRR@K: 1.0000, nDCG@K: 0.0524
- Latency: 2.1002 ms

#### pgg-v1-typical-questions-keywords — 最近地震记录｜recent｜震级｜时间｜严重程度｜不推断伤亡或建筑损坏

- Coverage status: zero
- Covered ratio: 0.0000 (0/19)
- Covered relevant IDs: none
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_9`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_9`, `cmtjxadio000eyygov3gl3za5_22`
- Background-only: no
- Max retrieved relevance: 0
- Raw metrics: Precision@K: 0.0000, Recall@K: 0.0000, MRR@K: 0.0000, nDCG@K: 0.0000
- Latency: 2.1004 ms

### Mode: hybrid

#### pgg-v1-scope-boundary-direct — Prometheus Global Guardian 知识库如何区分实时事实、知识规则和分析判断？

- Coverage status: partial
- Covered ratio: 0.1200 (3/25)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_8`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1200, MRR@K: 0.5000, nDCG@K: 0.4163
- Latency: 22.5595 ms

#### pgg-v1-scope-boundary-synonym — 这个助手的灾害分析回答边界是什么，能否替代官方预警、应急调度或现场指挥？

- Coverage status: partial
- Covered ratio: 0.1923 (5/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_20`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1923, MRR@K: 1.0000, nDCG@K: 0.7449
- Latency: 22.8712 ms

#### pgg-v1-scope-boundary-keywords — 实时事实｜知识规则｜分析判断｜非官方预警系统｜现场指挥

- Coverage status: partial
- Covered ratio: 0.1923 (5/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_3`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_9`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1923, MRR@K: 1.0000, nDCG@K: 0.8551
- Latency: 20.6689 ms

#### pgg-v1-workflow-fields-direct — hazard_context、location 和 language 分别如何作为工作流输入？

- Coverage status: partial
- Covered ratio: 0.2105 (4/19)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_2`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_28`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.2105, MRR@K: 1.0000, nDCG@K: 0.3179
- Latency: 18.7852 ms

#### pgg-v1-workflow-fields-synonym — total、byType、recent 字段各表示什么，recent 有哪些覆盖限制？

- Coverage status: partial
- Covered ratio: 0.2353 (4/17)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_27`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_24`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.2353, MRR@K: 1.0000, nDCG@K: 0.7683
- Latency: 21.6546 ms

#### pgg-v1-workflow-fields-keywords — hazard_context｜total｜byType｜recent｜location｜language｜空或不完整快照

- Coverage status: partial
- Covered ratio: 0.2778 (5/18)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_26`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.2778, MRR@K: 1.0000, nDCG@K: 0.6108
- Latency: 19.0500 ms

#### pgg-v1-hazard-types-direct — 统一灾害类型编码与各类型的分析重点如何对应？

- Coverage status: partial
- Covered ratio: 0.1667 (4/24)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.1667, MRR@K: 1.0000, nDCG@K: 0.3353
- Latency: 18.7101 ms

#### pgg-v1-hazard-types-synonym — 遇到 UNKNOWN 或 DisasterAware 的额外类型编码时，Guardian 应该如何处理？

- Coverage status: partial
- Covered ratio: 0.1304 (3/23)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_12`
- Background-only: yes
- Max retrieved relevance: 1
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1304, MRR@K: 1.0000, nDCG@K: 0.1765
- Latency: 19.5590 ms

#### pgg-v1-hazard-types-keywords — 灾害类型编码与分析重点：EARTHQUAKE｜FLOOD｜VOLCANO｜WILDFIRE｜TROPICAL_CYCLONE｜STORM｜DROUGHT｜TSUNAMI｜LANDSLIDE

- Coverage status: partial
- Covered ratio: 0.1923 (5/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_26`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1923, MRR@K: 1.0000, nDCG@K: 0.3294
- Latency: 19.1640 ms

#### pgg-v1-severity-sources-direct — ADVISORY、WATCH、WARNING 在 Guardian 中分别表示什么？

- Coverage status: partial
- Covered ratio: 0.1304 (3/23)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_7`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1304, MRR@K: 0.5000, nDCG@K: 0.3767
- Latency: 18.6845 ms

#### pgg-v1-severity-sources-synonym — USGS、NASA EONET 和 GDACS 的数据来源及严重程度映射有什么差异？

- Coverage status: partial
- Covered ratio: 0.1154 (3/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_1`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_8`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1154, MRR@K: 0.3333, nDCG@K: 0.1804
- Latency: 18.2326 ms

#### pgg-v1-severity-sources-keywords — DisasterAware 原始字段｜统一 Hazard 字段｜USGS magnitude｜GDACS Red Orange｜NASA ADVISORY

- Coverage status: partial
- Covered ratio: 0.2500 (5/20)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_8`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_25`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_29`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_28`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_29`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.2500, MRR@K: 1.0000, nDCG@K: 0.8285
- Latency: 19.3042 ms

#### pgg-v1-hazard-guidance-direct — 在没有完整地点、时间、强度或官方预警时，灾害建议应如何表述？

- Coverage status: partial
- Covered ratio: 0.1852 (5/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_26`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1852, MRR@K: 1.0000, nDCG@K: 0.5093
- Latency: 20.2181 ms

#### pgg-v1-hazard-guidance-synonym — 地震、洪水或野火的通用准备建议有哪些，哪些行动不能被回答宣称已经执行？

- Coverage status: partial
- Covered ratio: 0.1923 (5/26)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_16`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1923, MRR@K: 1.0000, nDCG@K: 0.3940
- Latency: 20.6922 ms

#### pgg-v1-hazard-guidance-keywords — 地震：余震｜建筑安全｜海啸；洪水：积水｜水位｜道路；野火：风向｜烟雾｜疏散

- Coverage status: partial
- Covered ratio: 0.1739 (4/23)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_6`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_27`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.1739, MRR@K: 1.0000, nDCG@K: 0.8539
- Latency: 19.8804 ms

#### pgg-v1-risk-levels-direct — LOW、MEDIUM、HIGH、CRITICAL 四个风险等级分别依据什么？

- Coverage status: partial
- Covered ratio: 0.1852 (5/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_5`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1852, MRR@K: 1.0000, nDCG@K: 0.4727
- Latency: 17.9774 ms

#### pgg-v1-risk-levels-synonym — 为什么只有事件数量不能单独触发 HIGH 或 CRITICAL，信息不足时应如何选择等级？

- Coverage status: partial
- Covered ratio: 0.1481 (4/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_1`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.1481, MRR@K: 1.0000, nDCG@K: 0.2577
- Latency: 18.8880 ms

#### pgg-v1-risk-levels-keywords — risk_level：LOW｜MEDIUM｜HIGH｜CRITICAL｜WARNING｜叠加灾害｜证据不足

- Coverage status: partial
- Covered ratio: 0.1481 (4/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_4`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.1481, MRR@K: 1.0000, nDCG@K: 0.2719
- Latency: 19.3595 ms

#### pgg-v1-json-contract-direct — 工作流 JSON 输出必须包含哪些字段，各字段的数据类型有什么要求？

- Coverage status: partial
- Covered ratio: 0.3571 (5/14)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_25`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_21`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.3571, MRR@K: 1.0000, nDCG@K: 0.7027
- Latency: 20.5246 ms

#### pgg-v1-json-contract-synonym — sources 和 limitations 应如何填写，为什么不能从知识库生成当前事件数量或地点？

- Coverage status: partial
- Covered ratio: 0.1579 (3/19)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_25`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_4`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.6000, Recall@K: 0.1579, MRR@K: 0.5000, nDCG@K: 0.2940
- Latency: 20.0753 ms

#### pgg-v1-json-contract-keywords — JSON：result｜summary｜risk_level｜key_findings｜recommendations｜sources｜limitations｜数组｜有效 JSON

- Coverage status: partial
- Covered ratio: 0.3077 (4/13)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_2`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: `cmtjxadio000eyygov3gl3za5_4`
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_21`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 0.8000, Recall@K: 0.3077, MRR@K: 1.0000, nDCG@K: 0.6689
- Latency: 19.3688 ms

#### pgg-v1-typical-questions-direct — 总结当前全球灾害态势时应读取哪些字段？

- Coverage status: partial
- Covered ratio: 0.1852 (5/27)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_14`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_15`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1852, MRR@K: 1.0000, nDCG@K: 0.3631
- Latency: 18.4969 ms

#### pgg-v1-typical-questions-synonym — 当前洪水风险有多高？回答前应先核实哪些信息，数据不足时如何表达？

- Coverage status: partial
- Covered ratio: 0.1786 (5/28)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_26`, `cmtjxadio000eyygov3gl3za5_16`, `cmtjxadio000eyygov3gl3za5_20`, `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_4`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_0`, `cmtjxadio000eyygov3gl3za5_5`, `cmtjxadio000eyygov3gl3za5_6`, `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_11`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_17`, `cmtjxadio000eyygov3gl3za5_18`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_24`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_23`
- Background-only: no
- Max retrieved relevance: 2
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.1786, MRR@K: 1.0000, nDCG@K: 0.1950
- Latency: 18.7108 ms

#### pgg-v1-typical-questions-keywords — 最近地震记录｜recent｜震级｜时间｜严重程度｜不推断伤亡或建筑损坏

- Coverage status: partial
- Covered ratio: 0.2632 (5/19)
- Covered relevant IDs: `cmtjxadio000eyygov3gl3za5_14`, `cmtjxadio000eyygov3gl3za5_2`, `cmtjxadio000eyygov3gl3za5_27`, `cmtjxadio000eyygov3gl3za5_25`, `cmtjxadio000eyygov3gl3za5_1`
- Missed relevant IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_9`, `cmtjxadio000eyygov3gl3za5_22`, `cmtjxadio000eyygov3gl3za5_12`, `cmtjxadio000eyygov3gl3za5_13`, `cmtjxadio000eyygov3gl3za5_19`, `cmtjxadio000eyygov3gl3za5_21`, `cmtjxadio000eyygov3gl3za5_23`, `cmtjxadio000eyygov3gl3za5_28`, `cmtjxadio000eyygov3gl3za5_29`
- False-positive IDs: none
- Missed core IDs: `cmtjxadio000eyygov3gl3za5_10`, `cmtjxadio000eyygov3gl3za5_15`, `cmtjxadio000eyygov3gl3za5_3`, `cmtjxadio000eyygov3gl3za5_4`, `cmtjxadio000eyygov3gl3za5_7`, `cmtjxadio000eyygov3gl3za5_9`, `cmtjxadio000eyygov3gl3za5_22`
- Background-only: no
- Max retrieved relevance: 3
- Raw metrics: Precision@K: 1.0000, Recall@K: 0.2632, MRR@K: 1.0000, nDCG@K: 0.4151
- Latency: 17.5505 ms

## Interpretation boundary

The recommended focus mode is a deterministic review ordering based on observed metrics, not an automatic root-cause proof.
The analysis reports retrieval facts from the dataset and baseline reports; it does not infer or prescribe a retrieval fix.
