# OPT-018 CI、E2E 和安全测试基线设计

> 状态：待用户审阅
> 日期：2026-09-30
> 关联清单：`docs/project-optimization-checklist.md` / OPT-018

## 目标

建立一套可在 GitHub Actions 中重复运行的质量基线，覆盖快速 PR 门禁、真实 PostgreSQL/Qdrant 集成、关键浏览器流程和安全回归。外部 Ollama 与 SMTP 不作为 CI 的必需依赖，避免模型服务、邮件服务或个人机器状态导致测试不稳定。

## 设计原则

- PR 必须在有限时间内得到确定结果；昂贵或易波动的负载任务只在手动/定时任务运行。
- PostgreSQL 和 Qdrant 使用真实服务，不用 mock 掩盖数据库/向量存储协议问题。
- LLM/Embedding 使用仓库内确定性的 fake Ollama，保证相同输入得到相同输出。
- 测试数据使用专用数据库和固定种子，不读取仓库中的真实 `.env` 或生产凭据。
- 安全测试只把已存在的安全承诺作为阻断条件；对尚未实现的 SSRF/限流控制显式登记为待启用用例，不把当前漏洞伪装成通过。
- 不改动业务安全行为来迎合测试；OPT-001～008 的修复仍按原清单单独排期。

## 分层架构

### 1. PR 快速门禁

GitHub Actions 的 `quality` job 执行：

- `pnpm install --frozen-lockfile`
- `pnpm spellcheck`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

根目录新增统一命令，至少包括：

- `test`：运行现有 AI Engine 单元测试和 Workflow 轻量测试；
- `test:integration`：运行真实 PostgreSQL/Qdrant 集成用例；
- `test:e2e`：运行 Playwright Chromium 用例；
- `test:security`：运行安全回归和安全缺口登记；
- `test:load`：运行可配置的轻量并发冒烟，不作为每次 PR 的必跑步骤。

### 2. 真实依赖集成层

GitHub Actions 使用服务容器或等价的 Compose 启动：

- PostgreSQL 固定主版本和测试凭据，映射到 CI 专用端口；
- Qdrant 固定与 `@qdrant/js-client-rest` 兼容的版本，不使用 `latest`；
- Workflow migration 在测试前执行，生成 Prisma Client 后再启动应用；
- 测试结束后销毁服务，不复用开发数据库。

集成测试优先验证可从网络观察到的行为：健康连接、迁移后的基本 CRUD、向量写入/查询/删除、文档与知识库关系，以及重复清理不会让测试进程静默成功。

### 3. 确定性外部服务替身

新增测试支持服务 `tests/support/fake-ollama.mjs`，只实现测试需要的 Ollama HTTP 合约：

- 模型列表返回固定的 embedding/chat 模型；
- embedding 根据输入的稳定 hash 返回固定维度向量；
- chat 返回固定 JSON 或文本响应，并记录请求次数；
- 未知路径返回 404，错误响应可由测试显式触发。

SMTP 不启动真实服务。注册 E2E 使用预置的已验证用户；如需验证注册流程，只检查邮件发送失败时的明确响应，不发送真实邮件。

### 4. 浏览器 E2E 层

使用 Playwright Chromium，应用通过生产构建启动。首批阻断流程：

1. 已验证用户登录、刷新后会话保持、退出后受保护页面拒绝访问；
2. 创建应用，确认编辑器显示默认工作流；
3. 保存工作流、发布版本、访问公开运行入口；
4. 使用不依赖外部模型的 Start → End 工作流完成一次运行；
5. 创建知识库、上传小型文本、等待处理完成、执行检索并检查返回内容；
6. 两个用户之间不能读取或修改对方的 App、Execution、Knowledge Base 和 Document。

测试通过 API fixture 完成清理和必要的种子数据，用户可见的核心动作仍通过浏览器完成。所有选择器优先使用可访问名称、角色或稳定 `data-testid`，不依赖 CSS 层级。

## 安全回归边界

### 阻断用例

- 未登录请求受保护 Route Handler 返回未授权响应；
- 用户 A 请求用户 B 的资源时不能读取、更新或删除；
- 缺失、随机、停用和过期 API Key 不能调用公开 API；
- 有效 API Key 只能访问其所属 App 的发布工作流；
- API 响应不包含密码、完整 API Key 或验证令牌；
- E2E 运行失败时不会在页面或响应中泄露数据库连接串、JWT Secret、Authorization/Cookie 等敏感值。

### 待启用用例

以下用例先以显式 `fixme`/缺口报告登记，避免把已知漏洞写成期望行为：

- HTTP 节点禁止 localhost、RFC1918、link-local 和云 metadata 地址；
- 超过 IP/API Key/应用额度或并发限制时返回 429 和 `Retry-After`；
- CORS 只允许配置的来源，不能反射任意 Origin。

当 OPT-002、OPT-003 或 OPT-008 修复后，应把对应 `fixme` 转为阻断测试，并删除缺口登记。

## CI 工作流

新增 `.github/workflows/ci.yml`，按依赖关系拆分为：

- `quality`：无外部服务的快速门禁；
- `integration`：PostgreSQL/Qdrant + migration + 集成测试；
- `e2e`：构建并启动 Workflow/WebApp/fake Ollama，执行 Chromium 流程；
- `security`：运行安全回归，上传缺口报告；
- `load-smoke`：仅在 `workflow_dispatch` 或定时触发，失败不影响普通 PR 门禁以外的质量报告。

`integration`、`e2e` 和 `security` 只有在测试服务健康且种子成功后才开始。每个 job 上传 Playwright trace/screenshot、服务日志、测试报告和安全缺口报告；失败时保留诊断材料。

## 失败处理与可诊断性

- 测试服务未就绪必须失败并说明 host、port 和健康检查结果；禁止自动跳过。
- fake Ollama 请求超时、未知路径和 malformed response 都有独立测试。
- E2E 失败自动保留 trace、截图和浏览器控制台日志。
- 集成测试失败保留 PostgreSQL/Qdrant 容器日志和 migration 输出。
- 所有测试脚本支持 `CI=true`，CI 模式不使用交互式输入、不访问真实外部服务。

## 非目标

- 本次不修复 API Key 存储、SSRF、限流、CORS 或文档处理可靠性本身；只建立可持续的测试入口和缺口可见性。
- 本次不引入完整生产级分布式压测平台；只提供可配置的轻量并发冒烟入口。
- 本次不测试真实 Ollama 模型质量；RAG 质量由 OPT-000 的专用评测负责。

## 完成标准

- 新 PR 会自动执行快速门禁，并能看到明确的测试结果；
- PostgreSQL/Qdrant 集成测试在真实服务上运行，服务不可用时明确失败；
- Playwright 至少覆盖登录、编辑/发布/运行和知识库基本流程；
- 用户资源隔离、API Key 鉴权和敏感信息泄露回归测试可重复运行；
- SSRF、限流和 CORS 缺口被机器可读地登记，后续修复可直接转为阻断用例；
- 手动/定时负载冒烟可以独立运行；
- 所有新增命令在本地和 CI 使用同一套入口，且不自动提交代码。
