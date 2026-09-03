# Prometheus Global Guardian RAG 工作流实施计划

> **面向 agentic worker：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 按照本计划逐项实施。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 构建并验证一个可配置的 RAG 工作流，使 Prometheus Global Guardian 能够通过 `outputs.result` 以及结构化风险分析字段进行调用和消费。

**架构：** 保持现有已发布应用的 API 和 RAG 节点不变。为共享的 End 节点输出配置扩展可选的 JSON path 和 fallback，在执行时解析 LLM JSON，并将配置的路径映射到输出字段。将工作流配置为使用 `user_input`、`hazard_context`、`location` 和 `language`；保留 `result` 作为 Guardian 兼容的自然语言响应。

**技术栈：** TypeScript、Vitest、React、React Hook Form、Next.js、`@ai-workflow/ai-engine`、Ollama、Qdrant、NestJS API server、Prettier、ESLint、Commitlint。

## 全局约束

- 不要在 executor 中硬编码 `risk_level`、`recommendations` 或其他 Guardian 字段名。
- 保留现有的 `POST /api/v1/apps/run` 请求形状和 `outputs.result` 兼容路径。
- 使用现有的 `hybrid` RAG 模式，初始 `topK: 5`、`outputFormat: text` 和 `threshold: 0.2`。
- 同时解析 LLM JSON 字符串和已解析对象。
- 支持点式对象路径和数组索引，例如 `recommendations[0]`。
- 当 JSON 解析失败时，使用 `result` 的 fallback 保留原始 LLM 响应；当 JSON 有效但路径缺失时，结构化字段保持为空，不要仅因为可选字段不可用就让整个工作流失败。
- 不要自动创建 Git commit。任何提交都必须由用户显式请求，然后使用 `pnpm commit`。
- 保持 `apps/webapp/next-env.d.ts` 和 `apps/workflow/next-env.d.ts` 中现有的用户改动不变。

---

## 文件清单

- 创建：`packages/ai-engine/src/utils/json-path.ts` — 解析 JSON-like 值并解析配置的对象/数组路径。
- 创建：`packages/ai-engine/src/utils/__tests__/json-path.test.ts` — 针对解析器和路径行为的精确单元测试。
- 修改：`packages/ai-engine/src/types/node.ts` — 为 `OutputParam` 添加可选 `path` 和 `fallback`。
- 修改：`packages/ai-engine/src/nodes/executors/end-executor.ts` — 使用基于警告的回退逻辑应用可选 JSON path 提取。
- 修改：`apps/workflow/components/flow/settings/forms/end-settings-form.tsx` — 在 End 节点输出配置中暴露可选 path 字段。
- 创建：`docs/superpowers/plans/2026-09-02-prometheus-global-guardian-rag-workflow-plan.md` — 本实施计划。
- 运行时配置：工作流编辑器和知识库数据 - 在引擎能力准备好后创建 Guardian 工作流；不要在源码中编码某个用户的数据库 ID。

## 任务 1：添加 JSON Path 工具

**文件：**

- 创建：`packages/ai-engine/src/utils/json-path.ts`
- 创建：`packages/ai-engine/src/utils/json-path.test.ts`
- 修改：`packages/ai-engine/src/index.ts`，仅在该工具适合作为公共包导出时进行。

**接口：**

- 提供 `parseJsonValue(value: unknown): unknown`，它应原样返回非字符串值，并在移除一个可选的 Markdown JSON fence 之后解析 JSON 字符串；无效 JSON 返回 `undefined`。
- 提供 `resolveJsonPath(value: unknown, path: string): { found: boolean; value: unknown }`。
- 接受诸如 `risk_level`、`analysis.summary`、`recommendations[0]` 和 `items[1].name` 这样的路径。
- 将空路径视为已找到，并返回解析后的根值。

- [ ] **步骤 1：编写失败测试**

````ts
import { describe, expect, it } from 'vitest'

import { parseJsonValue, resolveJsonPath } from './json-path'

describe('parseJsonValue', () => {
    it('解析 JSON 字符串', () => {
        expect(parseJsonValue('{"risk_level":"HIGH"}')).toEqual({ risk_level: 'HIGH' })
    })

    it('解析带 fence 的 JSON 响应', () => {
        expect(parseJsonValue('```json\n{"risk_level":"HIGH"}\n```')).toEqual({ risk_level: 'HIGH' })
    })

    it('保留对象原样，并对无效 JSON 返回 undefined', () => {
        const object = { risk_level: 'LOW' }
        expect(parseJsonValue(object)).toBe(object)
        expect(parseJsonValue('not json')).toBeUndefined()
    })
})

describe('resolveJsonPath', () => {
    const value = { analysis: { risk_level: 'HIGH' }, recommendations: ['evacuate'], items: [{ name: 'flood' }] }

    it('解析点式对象路径', () => {
        expect(resolveJsonPath(value, 'analysis.risk_level')).toEqual({ found: true, value: 'HIGH' })
    })

    it('解析数组索引', () => {
        expect(resolveJsonPath(value, 'recommendations[0]')).toEqual({ found: true, value: 'evacuate' })
        expect(resolveJsonPath(value, 'items[0].name')).toEqual({ found: true, value: 'flood' })
    })

    it('在路径缺失时返回未找到且不抛出异常', () => {
        expect(resolveJsonPath(value, 'analysis.missing')).toEqual({ found: false, value: undefined })
    })
})
````

- [ ] **步骤 2：运行聚焦测试并验证其失败**

运行：`pnpm --filter @ai-workflow/ai-engine test -- src/utils/json-path.test.ts`

预期：FAIL，因为 `json-path.ts` 及其导出函数尚不存在。

- [ ] **步骤 3：实现最小可用工具**

使用一条分词规则，将 `a.b[0]` 转换为 `['a', 'b', '0']`，拒绝空路径或格式错误的路径 token，并且只遍历对象的自有属性。在调用 `JSON.parse` 前，精确移除一个前导/尾随 Markdown fence；不要试图从无效的模型响应中提取任意散文。

- [ ] **步骤 4：运行聚焦测试和格式化**

运行：`pnpm --filter @ai-workflow/ai-engine test -- src/utils/json-path.test.ts`

预期：所有 JSON 解析和路径解析测试通过。

运行：`pnpm exec prettier --write packages/ai-engine/src/utils/json-path.ts packages/ai-engine/src/utils/json-path.test.ts`

预期：两个文件都成功完成格式化。

## 任务 2：将配置路径集成到 End Executor

**文件：**

- 修改：`packages/ai-engine/src/types/node.ts`
- 修改：`packages/ai-engine/src/nodes/executors/end-executor.ts`

**接口：**

- 为 `OutputParam` 扩展 `path?: string`。
- 对每个输出，按现有方式解析 `output.value`。如果 `output.path` 非空，则调用 `resolveJsonPath(value, output.path)`。
- 如果路径存在，则将提取出的值转换为 `output.type`。
- 如果路径缺失或者源无法解析，记录 warning 并使用原始解析值，这样 `result` 仍然可用。

- [ ] **步骤 1：添加 executor 级别的失败测试**

使用 `packages/ai-engine/src/core` 和 `packages/ai-engine/src/logger` 中现有的 execution-context 与 logger factory，覆盖带下列配置的 `EndExecutor.execute`：

```ts
{
    outputs: [
        { name: 'result', type: 'string', value: '${llm.output}' },
        { name: 'risk_level', type: 'string', value: '${llm.output}', path: 'risk_level' },
        { name: 'recommendations', type: 'array', value: '${llm.output}', path: 'recommendations' },
    ]
}
```

将 `llm.output` 设为包含 `result`、`risk_level` 和 `recommendations` 的 JSON 字符串，然后断言结果对象包含完整的 `result` 字符串、`HIGH` 以及 recommendations 数组。再增加第二个用例，使用无效 JSON 并断言原始字符串被保留给 `result`，且没有异常向外抛出。

- [ ] **步骤 2：运行测试并验证新的 path 断言失败**

运行：`pnpm --filter @ai-workflow/ai-engine test -- end-executor`

预期：FAIL，因为 `OutputParam.path` 尚未被 `EndExecutor` 消费。

- [ ] **步骤 3：实现最小的 executor 改动**

导入 `resolveJsonPath`，如有必要仅添加一个私有 helper 以保持 `doExecute` 可读，并保留当前的变量解析、类型转换、输出存储和日志行为。在调试日志中添加配置的 path，但不要在现有 output value 行为之外记录更多 secret。

- [ ] **步骤 4：运行聚焦测试和 typecheck**

运行：`pnpm --filter @ai-workflow/ai-engine test -- end-executor`

预期：executor 测试通过，包括原始响应回退。

运行：`pnpm --filter @ai-workflow/ai-engine typecheck`

预期：TypeScript 以退出码 0 结束。

## 任务 3：为工作流编辑器添加 Path 配置

**文件：**

- 修改：`apps/workflow/components/flow/settings/forms/end-settings-form.tsx`

**接口：**

- 为本地 `OutputParam` 类型扩展 `path?: string`。
- 在“参数值”下方添加一个可选文本输入，标签为“JSON 路径”。
- 通过现有的 `onChange` 回调将其绑定到 `param.path`。
- 使用占位符 `risk_level 或 recommendations[0]`，并添加辅助文案说明：仅当上游值是 JSON object/string 时才需要它。
- 保留现有的自动保存过滤以及没有 `path` 的现有输出配置。

- [ ] **步骤 1：实现受控字段**

渲染一个 `Input`，其值为 `param.path ?? ''`，并且其变更处理函数调用 `onChange(index, { path: event.target.value || undefined })`。不要添加必填校验规则；`path` 是可选的，`result` 必须在没有它的情况下也能工作。

- [ ] **步骤 2：运行格式化和 workflow typecheck**

运行：`pnpm exec prettier --write apps/workflow/components/flow/settings/forms/end-settings-form.tsx`

预期：文件成功完成格式化。

运行：`pnpm --filter @ai-workflow/workflow typecheck`

预期：TypeScript 以退出码 0 结束。

## 任务 4：创建 Guardian 工作流配置

**文件：**

- 通过现有工作流编辑器进行运行时配置；任何源码文件都不应包含硬编码的 knowledge-base ID 或 published-app ID。
- 可选文档更新：仅当最终设置步骤尚未记录时，才更新 `docs/project-plan.md` 或新增一份 operator guide。

**接口：**

- Start 输入：`user_input: string` 必填，`hazard_context: object` 必填，`location: string` 可选，`language: string` 可选且默认值为 `en`。
- Knowledge query：`${start.user_input} ${start.location}`。
- Knowledge settings：`hybrid`、Top K `5`、threshold `0.2`、output `text`。
- LLM 输出：严格 JSON，包含 `result`、`summary`、`risk_level`、`key_findings`、`recommendations`、`sources` 和 `limitations`。
- End outputs：`result` 使用 path `result` 且 fallback 为 `${llm.output}`，其余字段使用与其 JSON keys 匹配的配置路径。只有在上游值不是有效 JSON 时才使用 fallback；如果在有效 JSON 中路径缺失，则保持为空。

- [ ] **步骤 1：准备知识库**

创建或选择一个知识库，其中包含经过审核的风险级别定义、危险响应流程、疏散/公共安全指导，以及数据源解释说明。在测试检索前，确认其文档状态为 `COMPLETED`，并且其 embedding model 在 Ollama 中可用。

- [ ] **步骤 2：在编辑器中配置并测试工作流**

使用一个包含小型 `hazard_context` 对象的示例输入，并验证 trace 显示 Start -> Knowledge -> LLM -> End。确认结果同时包含可读响应和映射后的字段。

- [ ] **步骤 3：发布工作流**

在所有配置更改完成后发布应用。使用现有的 API-key UI 记录已发布应用的 API key；不要将 key 写入源码控制或文档。

## 任务 5：验证 Guardian 兼容的 API 行为

**文件：**

- 除非发现契约不匹配导致请求无法工作，否则不需要新的产品代码。
- Guardian 侧验证目标：`/Users/jamie/Documents/文稿 - Jamie的MacBook Pro/code/prometheus-global-guardian/server/ai/ai-chat-route.js`。

**接口：**

- POST endpoint：`${AI_WORKFLOW_API_URL}/api/v1/apps/run`。
- Header：`Authorization: Bearer <API_KEY>`。
- Body input key：`user_input`，不是 `message`。
- 必需的兼容输出：`response.data.outputs.result`。

- [ ] **步骤 1：运行一次直接的 cURL 烟雾测试**

```bash
curl -sS -X POST "$AI_WORKFLOW_API_URL/api/v1/apps/run" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AI_WORKFLOW_API_KEY" \
  -d '{"inputs":{"user_input":"请分析当前洪水风险","hazard_context":{"total":1,"byType":{"FLOOD":1},"recent":[]},"location":"global","language":"zh"}}'
```

预期：HTTP 成功，`data.outputs.result` 是可读字符串，并且当模型返回有效 JSON 时，结构化输出键也存在。

- [ ] **步骤 2：验证 Guardian 适配器路径**

配置 Guardian 的 workflow provider，使其将 `user_input` 和 `disasterContext` payload 发送到 `hazard_context`。确认 `extractWorkflowResult` 仍然读取 `outputs.result`，而 UI 以后可以按需消费结构化字段。

- [ ] **步骤 3：测试降级行为**

运行一次没有匹配知识内容的请求，再运行一次模型返回非 JSON 的请求。预期：Guardian 仍然收到可读的 `result`；缺失的结构化字段不会把请求变成 API failure。

## 任务 6：仓库级验证

**文件：**

- 任务 1-5 修改的所有文件。

- [ ] **步骤 1：运行包测试**

运行：`pnpm --filter @ai-workflow/ai-engine test`

预期：所有 engine 测试通过。

- [ ] **步骤 2：运行项目 typecheck**

运行：`pnpm typecheck`

预期：engine build/typecheck、workflow typecheck、webapp typecheck 和 API server typecheck 全部成功完成。

- [ ] **步骤 3：运行 lint、格式化和 spellcheck**

运行：`pnpm lint`

预期：没有错误；已有的 warning 可以保留，但如果未变更则必须报告。

运行：`pnpm exec prettier --check packages/ai-engine/src/utils/json-path.ts packages/ai-engine/src/utils/json-path.test.ts packages/ai-engine/src/types/node.ts packages/ai-engine/src/nodes/executors/end-executor.ts apps/workflow/components/flow/settings/forms/end-settings-form.tsx`

预期：所列文件都符合 Prettier 风格。

运行：`pnpm spellcheck`

预期：已修改项目文件中没有拼写错误。

- [ ] **步骤 4：检查最终 diff**

运行：`git diff --check` 和 `git status --short`。

预期：没有空白字符错误；无关的用户改动仍然保留；不包含 secrets、API keys、database dumps 或生成的构建产物。

## 提交策略

不要在实施后自动提交。如果用户显式请求提交，运行仓库的 `pnpm commit` 流程，让 Commitlint 验证提交信息，然后报告生成的 commit。除此之外，保持变更留在工作区中供审阅。
