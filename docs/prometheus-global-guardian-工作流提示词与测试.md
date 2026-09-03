# Prometheus Global Guardian 工作流提示词与测试

本文档用于保存工作流配置和回归测试记录，**不上传到 RAG 知识库**。RAG 上传文档仅保留灾害领域知识、字段规则和安全边界。

## 1. 当前用户提示词

页面中的变量通过变量选择器插入，本文档使用表达式表示：

```text
请根据以下输入返回完整且有效的 JSON。

用户问题：
${start.user_input}

实时灾害上下文：
${start.hazard_context}

地区：
${start.location}

语言：
${start.language}

知识库参考内容：
${knowledge-28a55425.output}

处理规则：

1. hazard_context 是唯一的实时灾害事实来源。
2. 灾害数量、类型、地点、时间和严重程度只能从 hazard_context 中提取。
3. 知识库内容只能用于解释 Guardian 术语、分析方法和提供通用建议。
4. 不得把知识库中的示例、规则或历史内容当作当前灾害数据。
5. 不得输出模板变量、变量名、占位符或 Markdown 代码块。
6. 当 total 为 0 时，必须明确说明当前没有实时灾害事件，并填写 limitations。
7. 如果 hazard_context 中没有 severity 字段，必须明确说明无法判断当前事件的具体严重程度。
8. 如果数据缺少地点、时间或严重程度，必须在 limitations 中说明。
9. 如果用户询问 WATCH、WARNING、ADVISORY，必须严格按照知识库中的定义回答。这些等级不是未来、现在、过去的时间顺序。
10. 如果用户询问当前事件，只能使用 hazard_context 中的实时数据。
11. 必须返回以下全部字段：

result：适合聊天展示的简洁中文回答
summary：一句话摘要
risk_level：只能是 LOW、MEDIUM、HIGH 或 CRITICAL
key_findings：关键发现数组
recommendations：建议数组
sources：数据来源数组
limitations：信息限制数组

12. 只返回 JSON，不要添加 JSON 之外的解释文字。
13. 即使 hazard_context 中的 total 为 0，也必须返回完整 JSON，不得省略任何字段。此时 result 说明当前没有实时灾害事件，summary 说明暂无实时事件，risk_level 使用 LOW，key_findings、recommendations、sources 和 limitations 必须返回数组。
```

## 2. 工作流配置

- 知识库：`Prometheus Global Guardian 灾害分析 RAG 知识库`。
- 查询内容：`start.user_input`。
- 检索模式：混合检索。
- Top K：5。
- 相似度阈值：20%。

### End 节点输出映射

每个参数的参数值均为 `大模型 / output`：

| 参数名            | JSON 路径         | 回退值                   |
| ----------------- | ----------------- | ------------------------ |
| `result`          | `result`          | 暂时无法生成灾害分析结果 |
| `summary`         | `summary`         | 暂无摘要                 |
| `risk_level`      | `risk_level`      | `LOW`                    |
| `key_findings`    | `key_findings`    | `[]`                     |
| `recommendations` | `recommendations` | `[]`                     |
| `sources`         | `sources`         | `[]`                     |
| `limitations`     | `limitations`     | `["大模型输出解析失败"]` |

回退值只在 JSON 解析失败时使用，不能使用大模型完整输出作为回退值。

## 3. 回归测试

### 测试 1：全球灾害态势分析

输入：

```json
{
    "user_input": "请分析当前全球灾害态势，说明主要灾害类型、风险等级、关键发现和建议。",
    "hazard_context": {
        "total": 4,
        "byType": { "EARTHQUAKE": 2, "FLOOD": 1, "WILDFIRE": 1 },
        "recent": "Guardian 当前近期事件摘要"
    },
    "location": "global",
    "language": "zh"
}
```

检查点：输出应识别 2 个地震、1 个洪水和 1 个野火，共 4 个事件；数量必须与 `hazard_context` 一致。

最近一次观测：数量识别正确，输出风险等级为 `MEDIUM`。

### 测试 2：Guardian 严重程度术语解释

输入：

```json
{
    "user_input": "请解释 Guardian 中 WATCH、WARNING 和 ADVISORY 的含义，并说明当前洪水事件应该如何判断。",
    "hazard_context": {
        "total": 1,
        "byType": { "FLOOD": 1 },
        "recent": [{ "title": "Flood event", "type": "FLOOD" }]
    },
    "location": "Southeast Asia",
    "language": "zh"
}
```

检查点：必须解释三个术语；由于没有 `severity`，必须说明无法判断当前洪水的具体等级，不能按未来、现在、过去解释三个等级。

最近一次观测：已正确说明洪水严重程度未提供，但术语解释仍需继续回归确认。

### 测试 3：无实时事件时的洪水建议

输入：

```json
{
    "user_input": "请给出洪水灾害的通用应急准备建议，并说明当前信息有哪些限制。",
    "hazard_context": { "total": 0, "byType": {}, "recent": [] },
    "location": "global",
    "language": "zh"
}
```

检查点：必须说明当前没有实时事件；返回 `LOW`；所有字段都必须存在，数组字段必须返回数组；建议只能是通用建议。

最近一次观测：成功给出疏散通知、涉水安全、应急物资、水位和道路信息等建议，未触发 `result` 回退值。

## 4. 验收标准

- 实时数量和类型必须与 `hazard_context` 一致。
- 缺少 `severity` 时必须说明无法判断具体等级。
- `total` 为 0 时必须说明没有实时事件，并返回完整 JSON。
- 大模型必须返回 `result`、`summary`、`risk_level`、`key_findings`、`recommendations`、`sources`、`limitations` 七个字段。
- 不得出现模板变量、虚构数量、地点、时间或 Markdown 代码块。
