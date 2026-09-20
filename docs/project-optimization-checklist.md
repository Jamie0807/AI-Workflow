# AI Workflow 项目待优化清单

> 更新时间：2026-09-20
> 来源：项目代码审查
> 当前状态：待排期

本文档记录当前项目中值得持续优化的安全性、可靠性、性能、架构和工程化问题。清单中的“验收标准”用于后续关闭事项时进行验证。

## 1. 总体优先级

| 优先级       | 含义                                                   | 建议处理时间 |
| ------------ | ------------------------------------------------------ | ------------ |
| 最高（当前） | 当前开发工作的首要目标                                 | 立即启动     |
| P0           | 上线前必须处理，可能导致安全事故、数据不一致或任务丢失 | 立即排期     |
| P1           | 影响核心正确性、性能或规模化能力                       | 第一阶段     |
| P2           | 影响维护成本、开发体验和长期演进                       | 第二阶段     |

## 2. 当前验证基线

- [x] `pnpm typecheck` 通过。
- [x] `pnpm build` 通过。
- [x] AI Engine 单元测试通过：68 个测试通过。
- [ ] 建立自动化 RAG 检索质量评测：当前尚无基于人工标注评测集的可重复检索质量基线；此项为当前最高优先级。
- [ ] ESLint 警告清零：当前有 19 个警告。
- [ ] Qdrant 集成测试通过：当前因本地 Qdrant 未启动而跳过。
- [ ] 增加 CI、E2E、负载和安全测试。

## 3. 当前最高优先级及 P0：上线前必须处理

### OPT-000 自动化 RAG 检索质量评测（当前最高优先级）

- 状态：待处理；当前开发最高优先级
- 涉及范围：`packages/ai-engine/src/knowledge/**`、`apps/workflow/components/knowledge/search-test.tsx`、评测数据和 CI 配置
- 问题：现有检索测试界面便于人工试搜，Retriever 单元测试主要验证逻辑行为；尚未形成带相关性标注、可重复执行并能比较检索策略的质量评测基线，因此无法客观判断参数或实现变更是否提升检索效果。
- 建议：
    - 建立版本化的代表性查询评测集，为每条查询标注预期相关文档或 chunk；记录数据来源和标注约定；
    - 编写可重复运行的评测器，连接真实 Retriever，并覆盖向量、全文和混合检索及关键配置（如 topK、阈值）；
    - 计算并输出 Recall@K、Precision@K、MRR、nDCG@K 等排序指标，同时记录检索延迟；不同策略的原始相似度分数不直接横向比较；
    - 同时提供机器可读结果和便于审阅的报告，保存评测集、运行配置、代码版本和基线，便于复现与比较；
    - 将指标计算和评测器本身纳入自动化测试；在 CI 或专用集成评测中检测相对基线的回归，并明确 Qdrant 等依赖不可用时的处理方式；
    - 先建立可信质量基线，再依据评测结果调整切分、Embedding、检索策略和参数；当前范围聚焦检索质量，不以 LLM 生成答案评分替代检索评测。
- 验收标准：
    - 有来源清楚、经过人工相关性标注且纳入版本管理的评测集；
    - 可以对真实检索链路重复运行，比较向量、全文、混合策略及关键参数；
    - 报告至少包含 Recall@K、MRR、nDCG@K 和检索延迟，并注明评测配置；
    - 指标计算有自动化测试，结果可与固定基线比较并识别质量回归；
    - 评测依赖缺失或评测失败时会明确报错/标记，不会被静默跳过。

### OPT-001 API Key 生成和存储安全

- 状态：待处理
- 涉及文件：`apps/workflow/lib/types/api-key.ts`、`apps/workflow/prisma/schema.prisma`、`apps/api-server/src/common/guards/api-key.guard.ts`
- 问题：使用 `Math.random()` 生成 API Key；数据库保存完整 Key。数据库泄露后，所有密钥都可以直接使用。
- 建议：
    - 使用 `crypto.randomBytes()` 生成密钥；
    - 数据库只保存不可逆 hash 和展示用 prefix；
    - 鉴权时对请求 Key 做 hash 后查询；
    - 增加密钥轮换、撤销和过期策略。
- 验收标准：
    - 数据库中不存在完整 API Key；
    - 旧 Key 可以撤销；
    - 密钥生成和鉴权有单元测试；
    - 不影响历史 Key 的迁移或提供迁移方案。

### OPT-002 HTTP 节点 SSRF 和资源滥用防护

- 状态：待处理
- 涉及文件：`packages/ai-engine/src/nodes/executors/http-executor.ts`
- 问题：工作流可以请求任意 URL，存在访问内网服务、云厂商 metadata、localhost 和私有网络的 SSRF 风险。
- 建议：
    - 增加出站代理或 URL allowlist；
    - 禁止 localhost、RFC1918、link-local、metadata 地址；
    - 解析 DNS 后再次校验目标 IP，防止 DNS rebinding；
    - 限制响应体大小、请求时长、重定向次数和并发数；
    - 明确非 2xx 响应是否应该使节点失败。
- 验收标准：
    - 内网和 metadata 地址请求被拒绝；
    - 超大响应会被中止；
    - 超时、重定向和连接错误有稳定的错误码；
    - 有 SSRF 回归测试。

### OPT-003 公开执行入口限流和配额

- 状态：待处理
- 涉及文件：`apps/webapp/app/api/workflow/[id]/run/route.ts`、`apps/api-server/src/main.ts`、`apps/api-server/src/common/guards/api-key.guard.ts`
- 问题：公开 WebApp 和外部 API 缺少统一的 IP、应用、API Key 和并发限制，可能被滥用来消耗 LLM、HTTP 或向量服务资源。
- 建议：
    - 增加 IP/API Key/应用级 rate limit；
    - 增加单应用并发数和每日调用额度；
    - 限制请求体、输入字段和执行时间；
    - 对超限请求返回 429 和 `Retry-After`；
    - 记录限流命中日志。
- 验收标准：
    - 超过限制返回 429；
    - 并发执行数可配置；
    - API Key 使用统计不会因并发请求丢失或异常增长；
    - 有限流和配额测试。

### OPT-004 发布流程事务化和版本并发控制

- 状态：待处理
- 涉及文件：`apps/workflow/app/api/apps/[id]/publish/route.ts`、`apps/workflow/app/api/apps/[id]/unpublish/route.ts`
- 问题：创建 `PublishedApp` 和更新 `App.activePublishedId` 是两个独立操作。中途失败会产生不一致；并发发布可能计算出相同版本号。
- 建议：
    - 使用 Prisma transaction；
    - 对版本号生成增加数据库级并发控制；
    - 发布快照创建、激活版本切换和发布时间更新放入同一事务；
    - API Server 查询发布版本时同时校验 `publishedApp.appId === appId`。
- 验收标准：
    - 任一步失败都不会留下半发布状态；
    - 并发发布不会产生重复版本；
    - active published version 始终属于当前 App；
    - 有发布失败和并发发布测试。

### OPT-005 统一工作流结构校验

- 状态：待处理
- 涉及文件：`apps/workflow/app/api/apps/[id]/workflow/route.ts`、`apps/workflow/app/api/apps/[id]/workflow/run/route.ts`、`apps/workflow/app/api/apps/[id]/publish/route.ts`、`packages/ai-engine/src/validators/workflow-validator.ts`
- 问题：保存和运行接口主要依靠类型断言；发布只检查 start/end 节点，没有复用 AI Engine 的完整校验逻辑。
- 建议：
    - 抽出共享的 Zod workflow schema；
    - 保存、测试运行、发布前统一调用结构和配置校验；
    - 校验节点 ID 唯一、边合法、节点类型、配置、环和可达性；
    - 限制节点数量、边数量、Prompt 长度和 JSON 体积。
- 验收标准：
    - 无效工作流无法保存或发布；
    - 发布后的工作流不因配置缺失而首次运行失败；
    - 前后端共用同一套节点配置类型或 schema；
    - 有非法节点、非法边、环和超大请求测试。

### OPT-006 文档处理改为可靠后台任务

- 状态：待处理
- 涉及文件：`apps/workflow/app/api/knowledge/[id]/documents/route.ts`、`apps/workflow/lib/services/document-processor.ts`
- 问题：上传接口启动未等待的 Promise 执行切分、Embedding 和 Qdrant 写入。进程退出、Serverless 请求结束或服务重启时任务可能丢失。
- 建议：
    - 使用数据库任务表、队列或独立 Worker；
    - 任务具备幂等 ID、重试次数、退避和失败状态；
    - 处理阶段更新进度；
    - 上传、任务创建和计数更新使用事务；
    - 计数以任务结果为准，避免重复处理导致重复累加。
- 验收标准：
    - 服务重启后未完成任务可以继续；
    - 失败任务可重试；
    - 同一文档重复消费不会产生重复向量或重复计数；
    - 前端可以看到明确的 PENDING/PROCESSING/COMPLETED/ERROR 状态。

### OPT-007 知识库和文档向量一致性

- 状态：待处理
- 涉及文件：`apps/workflow/app/api/knowledge/[id]/route.ts`、`apps/workflow/app/api/knowledge/[id]/documents/[docId]/route.ts`、`apps/workflow/lib/services/document-processor.ts`
- 问题：删除知识库仍未删除 Qdrant 向量；删除文档时先删除 PostgreSQL 记录，再删除 Qdrant 数据，任一步失败都会留下孤儿数据。
- 建议：
    - 使用删除任务或 Outbox 保证最终一致性；
    - 支持按知识库和文档 ID 重试清理；
    - 增加孤儿向量扫描和清理脚本；
    - 重新处理文档前先删除旧向量。
- 验收标准：
    - 删除知识库后不会继续检索到其文档；
    - Qdrant 删除失败会进入可重试状态；
    - 有 PostgreSQL 与 Qdrant 一致性检查脚本。

### OPT-008 生产配置和 CORS 安全

- 状态：待处理
- 涉及文件：`docker/docker-compose.yml`、`apps/workflow/lib/prisma.ts`、`apps/webapp/lib/prisma.ts`、`apps/api-server/src/prisma/prisma.service.ts`、`apps/api-server/src/main.ts`
- 问题：代码和 Docker 配置包含默认数据库密码；数据库连接缺失时会回退到默认连接串；API Server 使用 `origin: true` 开放 CORS。
- 建议：
    - 生产环境缺少必要环境变量时启动失败；
    - 默认凭据只保留在 `.env.example`；
    - 使用 secret manager 或部署平台密钥；
    - CORS 改为明确的生产域名白名单。
- 验收标准：
    - 生产环境不会使用默认数据库密码；
    - 缺少 `DATABASE_URL`、`JWT_SECRET` 等变量时启动直接失败；
    - 未授权 Origin 被拒绝；
    - 开发环境仍可通过示例配置启动。

## 4. P1：正确性和性能

### OPT-009 修复 DAG 可达性、分支和并行执行

- 状态：待处理
- 涉及文件：`packages/ai-engine/src/core/graph-builder.ts`、`packages/ai-engine/src/core/engine.ts`
- 问题：当前拓扑排序会把所有入度为 0 的节点加入执行队列，孤立节点也会执行；所有节点串行执行，独立分支无法并行。
- 建议：
    - 只执行从 start 可达的节点；
    - 使用 Map 缓存节点，避免反复 `.find()`；
    - 使用索引指针替代 `queue.shift()`；
    - 对互不依赖的 ready nodes 并行执行；
    - 明确条件分支后的 join、跳过节点和失败传播规则。
- 验收标准：
    - 孤立节点不执行；
    - 复杂 DAG 的执行顺序稳定；
    - 可并行节点执行耗时明显下降；
    - 分支、汇合、循环检测都有测试。

### OPT-010 统一 Executor 超时、取消和运行时配置

- 状态：待处理
- 涉及文件：`packages/ai-engine/src/core/engine.ts`、`packages/ai-engine/src/nodes/index.ts`、`packages/ai-engine/src/nodes/executors/llm-executor.ts`、`packages/ai-engine/src/nodes/executors/condition-executor.ts`
- 问题：`ollamaBaseUrl` 和 `defaultTimeout` 已在 Engine 配置中声明，但没有真正传递给 LLM/Condition Executor；LLM 也没有统一的 AbortSignal。
- 建议：
    - 将运行时配置注入所有 Executor；
    - LLM、Condition、HTTP、Embedding、Qdrant 使用统一超时；
    - 执行上下文支持取消信号；
    - 客户端断开后停止继续消耗模型和外部 HTTP 资源。
- 验收标准：
    - 修改 `OLLAMA_BASE_URL` 后所有模型节点使用新地址；
    - 超时能终止长时间运行的模型调用；
    - SSE 客户端断开后服务端任务可以取消；
    - 有超时和取消测试。

### OPT-011 RAG 模型、维度和检索配置一致性

- 状态：待处理
- 涉及文件：`packages/ai-engine/src/nodes/executors/knowledge-executor.ts`、`packages/ai-engine/src/knowledge/embeddings/ollama-embeddings.ts`、`packages/ai-engine/src/knowledge/store/qdrant-store.ts`、`apps/workflow/app/api/knowledge/[id]/search/route.ts`
- 问题：Knowledge Executor 固定使用默认 Embedding 模型和 1024 维；Qdrant collection 已存在时不校验维度；全文检索一次性读取最多 1000 条，并用未经转义的查询词创建 RegExp。
- 建议：
    - 将 Embedding provider、模型、维度和 collection 版本纳入知识库运行时配置；
    - 创建或使用 collection 时校验维度；
    - 使用真正的全文索引或分页 scroll；
    - 对正则特殊字符转义，最好移除用户输入 RegExp；
    - 校验 Embedding 返回向量维度。
- 验收标准：
    - 不同 Embedding 配置不会互相写入错误 collection；
    - 特殊字符查询不会返回 500；
    - 大知识库检索不会一次性加载全部切片；
    - 向量维度不一致时有明确错误。

### OPT-012 优化统计和历史查询

- 状态：待处理
- 涉及文件：`apps/workflow/app/api/apps/[id]/stats/route.ts`、`apps/workflow/app/api/apps/[id]/executions/route.ts`、`apps/workflow/prisma/schema.prisma`
- 问题：统计接口多次查询整段时间内的所有执行记录，再在 Node.js 中聚合，数据量增长后会占用大量内存和数据库连接。
- 建议：
    - 使用 SQL `GROUP BY` 或 Prisma `groupBy`；
    - 增加 `(publishedAppId, startedAt)` 等联合索引；
    - 使用按日聚合表或缓存；
    - 为执行日志设置分页、归档和保留周期；
    - 对列表查询参数统一做最大值限制。
- 验收标准：
    - 统计接口不再加载整个时间窗口的明细记录；
    - 大量执行记录下内存占用稳定；
    - 统计和列表接口有查询耗时基准。

### OPT-013 限制日志、输入输出和敏感数据持久化

- 状态：待处理
- 涉及文件：`packages/ai-engine/src/logger/execution-logger.ts`、`apps/workflow/app/api/apps/[id]/workflow/run/route.ts`、`apps/api-server/src/modules/workflow/workflow.service.ts`
- 问题：执行记录和实时事件可能包含完整输入、输出、Prompt、HTTP body 和错误内容，当前主要是简单截断，缺少统一脱敏和保留策略。
- 建议：
    - 默认关闭详细日志；
    - 对 Authorization、Cookie、Token、Prompt 和 HTTP body 脱敏；
    - 限制单条日志和整次执行的 JSON 大小；
    - 对执行历史增加保留天数、归档和删除能力；
    - 将用户可见错误与内部错误分离。
- 验收标准：
    - 敏感 header/body 不会写入日志；
    - 超大输出不会导致 SSE 或数据库写入失败；
    - 执行历史可以按策略自动清理。

### OPT-014 HTTP、Condition 和 End 节点行为明确化

- 状态：待处理
- 涉及文件：`packages/ai-engine/src/nodes/executors/http-executor.ts`、`packages/ai-engine/src/nodes/executors/condition-executor.ts`、`packages/ai-engine/src/nodes/executors/end-executor.ts`
- 问题：HTTP 非 2xx 当前仍返回节点成功；Condition 解析失败时默认选择第一个意图，可能导致工作流静默走错分支；输出类型转换失败时可能返回 0、`false` 或包装后的对象，掩盖数据错误。
- 建议：
    - 提供明确的失败策略配置；
    - Condition 无法解析时默认失败或进入显式 fallback 分支；
    - 对置信度、意图名称和输出类型做严格校验；
    - 在 UI 中显示节点失败原因。
- 验收标准：
    - 非 2xx、解析失败和类型转换失败行为有文档和测试；
    - 不会静默选择错误分支；
    - 失败节点能正确更新执行记录和 SSE 状态。

## 5. P2：架构、前端和工程化

### OPT-015 统一 Prisma schema 和生成代码

- 状态：待处理
- 涉及文件：`apps/workflow/prisma/schema.prisma`、`apps/api-server/prisma/schema.prisma`、`apps/webapp/prisma/schema.prisma`、各目录下 `generated/prisma`
- 问题：三个应用维护同构 schema，并提交大量生成代码，容易出现 schema、migration 和客户端版本漂移。
- 建议：
    - 以 `apps/workflow/prisma` 作为唯一 migration 来源；
    - 抽出共享 Prisma client package；
    - 由构建流程生成 client；
    - 不再手工维护重复 schema；
    - 在 CI 中检查 schema 一致性。
- 验收标准：
    - 数据模型只有一个权威来源；
    - API Server、WebApp 和主应用使用同一版本 client；
    - migration deploy 和 generate 流程可以一键执行。

### OPT-016 清理 Next.js 和依赖管理警告

- 状态：待处理
- 涉及文件：`apps/workflow/next.config.ts`、`apps/webapp/next.config.ts`、`apps/workflow/pnpm-lock.yaml`
- 问题：构建时检测到多个 lockfile，Next.js 无法确定 Turbopack workspace root；主仓库和 `apps/workflow` 存在重复 lockfile。
- 建议：
    - 保留 workspace 根目录的唯一 lockfile；
    - 删除不再使用的嵌套 lockfile；
    - 或显式配置 `turbopack.root`；
    - 统一依赖升级和锁文件更新流程。
- 验收标准：
    - `pnpm build` 不再出现 workspace root 警告；
    - CI 和本地安装使用同一份 lockfile；
    - 依赖版本不会因进入子目录而变化。

### OPT-017 清理 React Hooks 和组件状态警告

- 状态：待处理
- 涉及文件：`apps/workflow/components/flow/editor/index.tsx`、`apps/workflow/lib/hooks/use-workflow-runner.ts`、`apps/workflow/components/flow/settings/dynamic-form-renderer.tsx`、`apps/workflow/components/knowledge/chunk-drawer.tsx`
- 问题：当前 ESLint 有 19 个警告，包含缺失 Hook 依赖、动态组件创建和不安全 memo 场景，可能导致旧闭包、状态重置或数据不同步。
- 建议：
    - 逐条处理 `react-hooks/exhaustive-deps`；
    - 将动态组件注册结果稳定化；
    - 使用 `useWatch` 替代不适合 memo 的 `watch()`；
    - 将组件和常量拆分到独立模块以改善 Fast Refresh。
- 验收标准：
    - `pnpm lint` 无 error、无 warning；
    - 节点选择、自动保存、SSE 事件和表单切换有回归测试；
    - 组件切换不会重置用户输入。

### OPT-018 建立 CI、E2E 和安全测试基线

- 状态：待处理
- 涉及文件：仓库根目录、`packages/ai-engine/src/**/__tests__`、各应用测试目录
- 问题：当前主要是 AI Engine 单元测试，缺少 API、数据库、SSE、前端和安全回归测试。
- 建议：
    - CI 至少执行 lint、typecheck、unit test、build；
    - 增加 PostgreSQL/Qdrant 集成测试服务；
    - 增加 Playwright 登录、编辑、发布、运行和知识库 E2E；
    - 增加 API Key、SSRF、限流、权限和数据隔离测试；
    - 增加大 DAG、大文档和并发执行压测。
- 验收标准：
    - Pull Request 自动阻止 lint、类型、测试或构建失败；
    - Qdrant 集成测试不再静默跳过；
    - 关键发布、运行、删除和权限场景都有自动化覆盖。

## 6. 推荐实施顺序

### 第一阶段：建立 RAG 检索质量基线（当前最高优先级）

- [ ] OPT-000 自动化 RAG 检索质量评测

完成首轮基线后，优先依据评测结果确定 RAG 检索相关改进的收益和顺序。

### 第二阶段：安全和数据可靠性

- [ ] OPT-001 API Key 安全
- [ ] OPT-002 SSRF 防护
- [ ] OPT-003 限流和配额
- [ ] OPT-004 发布事务
- [ ] OPT-005 工作流校验
- [ ] OPT-006 文档后台任务
- [ ] OPT-007 向量一致性
- [ ] OPT-008 生产配置和 CORS

### 第三阶段：执行引擎和 RAG

- [ ] OPT-009 DAG 可达性、分支和并行执行
- [ ] OPT-010 超时、取消和运行时配置
- [ ] OPT-011 RAG 配置一致性
- [ ] OPT-014 节点失败策略

### 第四阶段：性能和长期维护

- [ ] OPT-012 统计和历史查询
- [ ] OPT-013 日志和数据保留
- [ ] OPT-015 Prisma schema 统一
- [ ] OPT-016 lockfile 和构建告警
- [ ] OPT-017 React 警告清理
- [ ] OPT-018 CI、E2E 和安全测试

## 7. 完成定义

本清单中的事项只有在以下条件全部满足后才可以标记为完成：

- 已完成代码或配置变更；
- 已增加对应的自动化测试或验证脚本；
- `pnpm lint`、`pnpm typecheck`、`pnpm build` 通过；
- 相关集成测试在真实依赖服务上通过；
- 文档、环境变量和部署说明已同步更新；
- 没有引入新的未解释 warning、TODO 或数据迁移风险。
