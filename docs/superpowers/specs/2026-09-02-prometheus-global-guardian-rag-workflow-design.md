# Prometheus Global Guardian RAG 工作流设计

## 1. 目标

设计一条已发布的 AI 工作流，供 `prometheus-global-guardian` 通过现有的 `POST /api/v1/apps/run` 接口调用。

工作流需要把 Guardian 的实时灾害上下文与运维知识库结合起来，同时返回两类结果：

- `result`：供 Guardian 聊天窗口展示的完整自然语言回答。
- 结构化字段：供 Guardian 的风险卡片、告警面板、筛选功能和后续自动化使用。

第一版定位为灾害分析助手，不应声称自己是权威的应急调度系统，也不应基于不足的证据做出预测。

## 2. 现有集成约束

API 服务通过 API Key 鉴权，一个 API Key 绑定一个已发布应用。请求体如下：

```json
{
    "inputs": {
        "user_input": "请评估当前的洪水风险。",
        "hazard_context": {
            "total": 128,
            "byType": { "FLOOD": 34, "EARTHQUAKE": 61 },
            "recent": []
        },
        "location": "global",
        "language": "zh"
    }
}
```

已发布的工作流执行的是 `PublishedApp` 快照。修改工作流后，必须重新发布，API 才会使用最新版本。

Guardian 当前读取 `outputs.result` 作为聊天回复，因此这个字段必须始终存在，并且内容要适合直接展示给用户。

## 3. 工作流结构

```text
开始节点
  -> 知识库检索节点
  -> 大模型分析节点
  -> 结束节点
```

### 开始节点

输入参数：

| 名称             | 类型   | 必填 | 用途                                                        |
| ---------------- | ------ | ---- | ----------------------------------------------------------- |
| `user_input`     | string | 是   | 用户的问题或分析请求。                                      |
| `hazard_context` | object | 是   | Guardian 当前数据快照，包括事件总数、按类型统计和最近事件。 |
| `location`       | string | 否   | 地区、国家或 `global`。                                     |
| `language`       | string | 否   | `en` 或 `zh`，默认使用 `en`。                               |

### 知识库检索节点

使用 `hybrid` 混合检索模式：灾害名称、风险等级等精确词语使用全文检索，相关处置流程和语义相近的内容使用向量检索。

查询内容：

```text
${start.user_input} ${start.location}
```

建议的初始配置：

| 配置项     | 值                          |
| ---------- | --------------------------- |
| 检索模式   | `hybrid`                    |
| Top K      | `5`                         |
| 输出格式   | `text`                      |
| 相似度阈值 | `0.2`，后续根据评测数据调优 |

知识库应包含经过审核的运维资料，包括风险等级定义、各类灾害处置流程、疏散和公共安全指南、数据源解释说明等。知识库不应包含凭据、个人隐私数据或未经验证的社交媒体内容。

### 大模型分析节点

提示词需要提供四类上下文：

1. 开始节点的 `user_input`。
2. 开始节点的 `hazard_context`。
3. 开始节点的 `location` 和 `language`。
4. 知识库检索结果。

模型需要被明确要求：只使用传入的上下文；区分已观测事实和分析判断；证据不足时说明限制；不得编造事件详情、时间、地点和数值。

模型应返回以下格式的有效 JSON：

```json
{
    "result": "适合在聊天窗口展示的简洁回答。",
    "summary": "一句话态势摘要。",
    "risk_level": "LOW",
    "key_findings": ["已观测到的关键发现"],
    "recommendations": ["行动建议"],
    "sources": ["知识库依据"],
    "limitations": ["已知数据限制"]
}
```

`risk_level` 只允许使用 `LOW`、`MEDIUM`、`HIGH` 和 `CRITICAL`。只有在实时数据和检索到的处置规范能够支持时，模型才可以提高风险等级。

### 结束节点

返回以下字段：

| 输出字段          | 类型   | 来源                                                                                           |
| ----------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `result`          | string | 结束节点通过 JSON 路径 `result` 提取；JSON 解析失败时使用回退值 `${llm.output}` 保留原始回复。 |
| `summary`         | string | JSON 路径 `summary`。                                                                          |
| `risk_level`      | string | JSON 路径 `risk_level`。                                                                       |
| `key_findings`    | array  | JSON 路径 `key_findings`。                                                                     |
| `recommendations` | array  | JSON 路径 `recommendations`。                                                                  |
| `sources`         | array  | JSON 路径 `sources`。                                                                          |
| `limitations`     | array  | JSON 路径 `limitations`。                                                                      |

字段提取必须由工作流配置驱动。引擎需要先把 JSON 字符串解析为对象，再根据路径读取 `risk_level`、`recommendations` 等字段；执行器中不能写死这些字段名。

## 4. Guardian 消费接口

Guardian 可以这样读取响应：

```js
const { result, summary, risk_level, key_findings, recommendations, sources, limitations } = response.data.outputs
```

`result` 是现有流式聊天适配器的兼容字段。结构化字段用于增强 Guardian 的界面，但在 JSON 解析成功时，工作流应全部返回这些字段。

Guardian 应将 `sources` 作为辅助依据，而不是实时灾害事实的替代品。实时数据仍然以 Guardian 的灾害数据源为准；知识库负责提供处置流程和解释规则。

## 5. 异常和降级策略

- 缺少 `user_input`：沿用现有 API 参数校验逻辑拒绝请求。
- `hazard_context` 缺失或格式错误：模型必须说明实时上下文不可用，不得声称当前发生了某个具体事件；仍可以基于知识库回答通用处置问题。
- 没有检索到相关知识片段：继续回答，但必须明确说明依据不足，不能伪造来源。
- 大模型返回无效 JSON：`result` 使用结束节点配置的回退值 `${llm.output}` 保留原始模型回复；其他未配置回退值的结构化字段返回空值或 `null`，并在执行日志中记录解析警告。JSON 有效但缺少某个路径时，该字段保持空值，不使用回退值。
- Ollama 模型或嵌入模型缺失：返回现有执行错误，提醒运维人员修复运行环境配置。
- 工作流未发布：现有 API 返回 `APP_NOT_PUBLISHED`；配置 Guardian 前必须先发布工作流。

## 6. 必需的平台能力

当前结束节点只能解析变量并转换整个变量值，无法从 JSON 回复中提取配置的字段。因此需要增加可选的输出路径配置，例如：

```text
value: ${llm.output}
path: risk_level
type: string
```

路径解析器应支持对象字段和数组下标，例如 `recommendations[0]`。它需要同时支持对象和 JSON 字符串，并在路径不存在时记录清晰的警告。

## 7. 验收标准

满足以下条件后，认为实现完成：

1. 已发布应用可以使用 Guardian 的请求格式和 API Key 调用。
2. 工作流会对选定知识库执行混合检索。
3. 大模型能够收到用户问题、实时灾害上下文和检索片段。
4. `outputs.result` 存在，并能被 Guardian 现有适配器读取。
5. 结构化输出通过配置的 JSON 路径映射，而不是由执行器写死字段。
6. 至少有测试覆盖 JSON 字符串解析、对象解析、嵌套路径、数组下标和路径缺失场景。
7. 即使结构化解析失败，Guardian 仍能展示 `result`。
8. 工作流配置变化后会重新发布，并使用 cURL 验证已发布版本。

## 8. 第一版暂不包含

- 自动向 Guardian 或外部灾害系统写回事件。
- 自动触发应急通知或做出疏散决策。
- 跨 API 请求的长期对话记忆。
- 替换 Guardian 现有的实时数据采集和分析服务。
- 在大模型回复完成前流式输出不完整的结构化 JSON。
