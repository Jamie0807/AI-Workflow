# AI Workflow

[English](./README.md) | 简体中文

AI Workflow 是一个面向实际业务落地的 AI 工作流开发平台。它提供可视化编排、测试运行、版本发布、API 调用、知识库检索和执行监控能力，用于把 LLM、RAG、HTTP 请求、条件分支和结构化输出组合成可维护、可复用、可集成的自动化流程。

代码按长期演进的产品项目组织，采用 Monorepo 管理多个应用和共享执行引擎，目标是支撑真实的开发、部署和迭代。

## 核心能力

- **可视化工作流编排**：基于 `@xyflow/react` 提供节点拖拽、连线、配置和测试运行。
- **统一执行引擎**：`packages/ai-engine` 负责 DAG 校验、拓扑排序、条件分支、节点执行和日志追踪。
- **RAG 知识库**：支持文档切片、Ollama Embedding、Qdrant 向量检索、全文检索和混合检索。
- **应用发布链路**：支持编辑态工作流、发布快照、API Key、执行历史和调用统计。
- **多入口运行**：平台内测试、轻量 WebApp 访问、NestJS 对外 API 都复用同一套执行内核。

## 技术栈

| 层级       | 技术                                                            |
| ---------- | --------------------------------------------------------------- |
| 工程组织   | pnpm workspace、Turborepo、TypeScript                           |
| 平台应用   | Next.js 16、React 19、App Router、Tailwind CSS 4                |
| 工作流编辑 | `@xyflow/react`、`react-hook-form`、Tiptap、shadcn/ui 风格组件  |
| 对外 API   | NestJS 11、Guard、Interceptor、Filter、class-validator          |
| 执行引擎   | `WorkflowEngine`、`GraphBuilder`、`NodeRegistry`、节点 Executor |
| AI / RAG   | Ollama、`@langchain/ollama`、Qdrant                             |
| 数据层     | PostgreSQL、Prisma 7                                            |
| 工程质量   | ESLint 9、Prettier、CSpell、Commitlint、Husky、lint-staged      |

## 项目结构

```text
ai-workflow/
├── apps/                         # 可独立运行的应用
│   ├── workflow/                 # 主平台：登录、应用管理、工作流编辑、知识库、监控、BFF API
│   │   ├── app/                  # Next.js App Router 页面、布局、Route Handlers、Middleware
│   │   ├── components/           # 业务组件和 shadcn/ui 风格基础组件
│   │   ├── hooks/                # 前端通用 hooks
│   │   ├── lib/                  # Auth、Prisma、服务封装、类型和工具函数
│   │   └── prisma/               # 主平台数据库 schema 和迁移
│   ├── api-server/               # NestJS 对外 API：API Key 鉴权、发布应用执行、调用日志
│   │   ├── src/                  # Nest 模块、Controller、Service、Guard、Filter
│   │   └── prisma/               # API 服务使用的 Prisma schema
│   └── webapp/                   # 轻量访问入口：面向访问者运行已发布工作流
│       ├── app/                  # Next.js 页面入口
│       ├── components/           # 运行面板和结果展示组件
│       ├── lib/                  # Prisma、类型、工具函数
│       └── prisma/               # WebApp 使用的 Prisma schema
├── packages/                     # 多应用共享包
│   └── ai-engine/                # 工作流执行引擎、节点协议、执行器、RAG 检索能力
│       ├── src/core/             # WorkflowEngine、GraphBuilder、ExecutionContext
│       ├── src/nodes/            # 节点注册、节点执行器
│       ├── src/validators/       # 工作流和节点配置校验
│       ├── src/knowledge/        # 文档切片、向量化、检索器
│       └── src/types/            # 工作流、节点、执行结果等共享类型
├── docker/                       # 本地基础设施编排
│   └── docker-compose.yml        # PostgreSQL、Qdrant
├── docs/                         # 项目文档
│   └── database.md               # 数据表、关系、级联规则、向量库边界
├── .husky/                       # Git hooks
├── .cspell/                      # 拼写检查词库
├── package.json                  # 根脚本和工程依赖
├── pnpm-workspace.yaml           # workspace 包范围
├── turbo.json                    # Turbo 任务编排
├── eslint.config.js              # ESLint 配置
├── .prettierrc                   # Prettier 配置
├── .prettierignore               # Prettier 忽略规则
└── cspell.json                   # CSpell 配置
```

## 模块职责

| 模块                 | 职责                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `apps/workflow`      | 登录注册、应用管理、工作流编辑器、测试运行、知识库管理、API Key 管理、执行日志、监控面板 |
| `apps/api-server`    | 暴露 `POST /api/v1/apps/run`，校验 API Key，读取发布快照，调用执行引擎并记录调用历史     |
| `apps/webapp`        | 面向最终访问者的轻量工作流运行页面，默认端口 `3001`                                      |
| `packages/ai-engine` | 定义工作流协议、执行上下文、DAG 构建、节点注册与执行、RAG 基础能力                       |
| `docker`             | 本地 PostgreSQL 和 Qdrant 基础设施                                                       |

## 整体架构

项目采用 Monorepo + 多运行时应用 + 共享执行内核的架构。`apps/workflow` 是产品主控台，负责面向用户的编排、测试、发布和管理；`apps/webapp` 是轻量访问入口，用于运行已经发布的应用；`apps/api-server` 是面向第三方系统的服务端 API。三者都围绕 `packages/ai-engine` 工作，避免编辑器、网页访问和外部 API 各自实现一套执行规则。

```text
平台用户 / 第三方系统
        │
        ├── apps/workflow     # 编排、测试、发布、管理
        ├── apps/webapp       # 访问已发布应用
        └── apps/api-server   # API Key 鉴权后的对外调用
                 │
                 ▼
        packages/ai-engine
        ├── WorkflowEngine
        ├── GraphBuilder
        ├── NodeRegistry
        ├── Node Executors
        └── Knowledge / Retriever
                 │
                 ▼
        PostgreSQL / Qdrant / Ollama / SMTP
```

平台内测试运行、WebApp 运行和外部 API 调用都会收敛到 `packages/ai-engine`。这样可以保证编辑器中验证过的工作流，在发布后仍遵循同一套执行规则。

### 运行时分层

| 分层             | 主要位置                                                       | 说明                                                                 |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| 表现层           | `apps/workflow/app`、`apps/workflow/components`、`apps/webapp` | 页面、布局、表单、画布、结果展示和交互状态                           |
| BFF / Route API  | `apps/workflow/app/api`                                        | 主平台内部 API，处理登录注册、应用管理、工作流保存、测试运行、知识库 |
| 外部服务 API     | `apps/api-server/src`                                          | 给第三方系统调用，重点处理 API Key 鉴权、发布快照读取和执行记录      |
| 业务服务层       | `apps/workflow/lib/services`、`apps/api-server/src/modules`    | 封装应用、工作流、知识库、文档处理、调用统计等业务动作               |
| 执行引擎层       | `packages/ai-engine/src`                                       | DAG 校验、拓扑排序、节点执行、上下文变量、RAG 检索                   |
| 数据与基础设施层 | `prisma/schema.prisma`、`docker/docker-compose.yml`            | PostgreSQL 存业务数据，Qdrant 存向量索引，Ollama 提供模型能力        |

### 数据流边界

- `Workflow` 保存编辑态 `nodes / edges`，用于平台内持续编辑和测试。
- `PublishedApp` 保存发布快照，外部 API 和 WebApp 读取快照运行，避免草稿改动影响线上调用。
- `WorkflowExecution` 记录平台内测试运行，`AppExecution` 记录发布应用被外部调用后的运行历史。
- PostgreSQL 存用户、应用、工作流、发布版本、执行记录、知识库和文档元数据；Qdrant 存文档切片向量、payload 和检索索引。
- API Key 只用于已发布应用的外部调用；平台登录态由 `apps/workflow` 的认证逻辑管理。

## 工作流模型

工作流是一份可序列化的 DAG 定义，核心类型位于 [`packages/ai-engine/src/types/workflow.ts`](./packages/ai-engine/src/types/workflow.ts)。

```ts
export type NodeKind = 'start' | 'llm' | 'http' | 'condition' | 'end' | 'knowledge'

export interface WorkflowDefinition {
    id: string
    name: string
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
}
```

当前内置节点：

| 节点        | 作用                       |
| ----------- | -------------------------- |
| `start`     | 定义工作流输入参数         |
| `llm`       | 调用 Ollama 大模型生成内容 |
| `http`      | 请求外部 HTTP 服务         |
| `condition` | 基于意图或条件选择分支     |
| `knowledge` | 从知识库检索相关文档切片   |
| `end`       | 定义工作流最终输出         |

节点配置类型见 [`packages/ai-engine/src/types/node.ts`](./packages/ai-engine/src/types/node.ts)，节点执行器位于 [`packages/ai-engine/src/nodes/executors`](./packages/ai-engine/src/nodes/executors)。

## 关键执行链路

### 平台内测试运行

```text
用户在编辑器点击运行
    → components/flow/test-run
    → lib/hooks/use-workflow-runner.ts
    → apps/workflow/app/api/apps/[id]/workflow/run
    → createWorkflowEngine()
    → WorkflowEngine.execute()
    → SSE 返回节点状态、日志和最终结果
    → 写入 WorkflowExecution
```

### 外部 API 调用

```text
第三方系统请求 api-server
    → ApiKeyGuard 校验 Authorization: Bearer <API_KEY>
    → WorkflowController 接收 POST /api/v1/apps/run
    → WorkflowService 读取 PublishedApp 快照
    → createWorkflowEngine()
    → WorkflowEngine.execute()
    → 写入 AppExecution
    → 返回同步结果或 SSE 事件流
```

### 知识库处理

```text
上传文档
    → 创建 Document 记录
    → 文本切片
    → Ollama 生成 embedding
    → Qdrant 写入向量和 payload
    → 检索测试或 Knowledge 节点复用同一套 Retriever
```

## 快速开始

### 前置依赖

- Node.js 20+
- pnpm 9.x
- Docker 和 Docker Compose
- 本地 Ollama 服务，默认访问 `http://localhost:11434`

如需使用知识库向量化能力，请准备 Embedding 模型：

```bash
ollama pull mxbai-embed-large:latest
```

LLM 节点和条件节点使用的模型由页面配置决定，需要提前在 Ollama 中拉取对应模型。

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动本地基础设施

```bash
pnpm docker:start
```

该命令会启动：

- PostgreSQL：`localhost:5433`
- Qdrant REST API：`localhost:6333`
- Qdrant gRPC：`localhost:6334`

停止基础设施：

```bash
pnpm docker:top
```

当前脚本名是 `docker:top`，实际执行的是 `docker compose down`。

### 3. 配置环境变量

`apps/workflow/.env`：

```env
DATABASE_URL="postgresql://postgres:xiaoer@localhost:5433/postgres"
```

`apps/workflow/.env.local`：

```env
DATABASE_URL="postgresql://postgres:xiaoer@localhost:5433/postgres"
JWT_SECRET="replace-with-a-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WEBAPP_URL="http://localhost:3001"
NEXT_PUBLIC_API_SERVER_URL="http://localhost:3100"
QDRANT_URL="http://localhost:6333"
OLLAMA_BASE_URL="http://localhost:11434"

SMTP_HOST="smtp.qq.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-email@qq.com"
SMTP_PASSWORD="your-smtp-token"
SMTP_FROM_NAME="AI 工作流"
SMTP_FROM_EMAIL="your-email@qq.com"
# EMAIL_OVERRIDE_TO="dev-target@example.com"
```

`apps/api-server/.env`：

```env
DATABASE_URL="postgresql://postgres:xiaoer@localhost:5433/postgres"
PORT="3100"
OLLAMA_BASE_URL="http://localhost:11434"
QDRANT_URL="http://localhost:6333"
```

`apps/webapp/.env`：

```env
DATABASE_URL="postgresql://postgres:xiaoer@localhost:5433/postgres"
```

SMTP 配置用于注册验证邮件。`SMTP_PASSWORD` 通常是邮箱服务商提供的授权码或应用专用密码，不是邮箱登录密码。

### 4. 初始化数据库

首次启动需要执行迁移，并分别为三个应用生成 Prisma Client：

```bash
(cd apps/workflow && pnpm exec prisma migrate deploy)
(cd apps/workflow && pnpm exec prisma generate)
(cd apps/api-server && pnpm exec prisma generate)
(cd apps/webapp && pnpm exec prisma generate)
```

### 5. 启动开发服务

终端 1：

```bash
pnpm dev
```

该命令通过 Turbo 启动有 `dev` 脚本的工作区应用，主要包含：

- `workflow`：`http://localhost:3000`
- `webapp`：`http://localhost:3001`

终端 2：

```bash
pnpm --filter @ai-workflow/api-server start:dev
```

API 服务默认地址：

- `api-server`：`http://localhost:3100`
- 工作流运行接口：`POST http://localhost:3100/api/v1/apps/run`

## 常用命令

```bash
# 开发
pnpm dev
pnpm --filter @ai-workflow/api-server start:dev

# 构建与类型检查
pnpm build
pnpm typecheck
pnpm --filter @ai-workflow/ai-engine test

# 代码质量
pnpm lint
pnpm spellcheck
pnpm commit

# 基础设施
pnpm docker:start
pnpm docker:top

# 清理
pnpm clean
pnpm clean:all
```

## API 调用示例

已发布应用并创建 API Key 后，可以通过 `api-server` 调用：

```bash
curl -X POST "http://localhost:3100/api/v1/apps/run" \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "question": "请介绍这个产品"
    },
    "stream": false
  }'
```

流式调用时传入 `"stream": true`，服务端会返回 SSE 事件。

## 重要源码入口

| 主题             | 文件                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 工作流类型       | [`packages/ai-engine/src/types/workflow.ts`](./packages/ai-engine/src/types/workflow.ts)                                       |
| 节点配置类型     | [`packages/ai-engine/src/types/node.ts`](./packages/ai-engine/src/types/node.ts)                                               |
| 执行引擎         | [`packages/ai-engine/src/core/engine.ts`](./packages/ai-engine/src/core/engine.ts)                                             |
| 图构建与拓扑排序 | [`packages/ai-engine/src/core/graph-builder.ts`](./packages/ai-engine/src/core/graph-builder.ts)                               |
| 执行上下文       | [`packages/ai-engine/src/core/context.ts`](./packages/ai-engine/src/core/context.ts)                                           |
| 节点注册         | [`packages/ai-engine/src/nodes/index.ts`](./packages/ai-engine/src/nodes/index.ts)                                             |
| 节点执行器       | [`packages/ai-engine/src/nodes/executors`](./packages/ai-engine/src/nodes/executors)                                           |
| 知识库检索       | [`packages/ai-engine/src/knowledge`](./packages/ai-engine/src/knowledge)                                                       |
| 工作流编辑器     | [`apps/workflow/components/flow/editor`](./apps/workflow/components/flow/editor)                                               |
| 节点配置表单     | [`apps/workflow/components/flow/settings/forms`](./apps/workflow/components/flow/settings/forms)                               |
| 测试运行 Hook    | [`apps/workflow/lib/hooks/use-workflow-runner.ts`](./apps/workflow/lib/hooks/use-workflow-runner.ts)                           |
| 知识库服务       | [`apps/workflow/lib/services/knowledge-service.ts`](./apps/workflow/lib/services/knowledge-service.ts)                         |
| 文档处理         | [`apps/workflow/lib/services/document-processor.ts`](./apps/workflow/lib/services/document-processor.ts)                       |
| 对外 API 控制器  | [`apps/api-server/src/modules/workflow/workflow.controller.ts`](./apps/api-server/src/modules/workflow/workflow.controller.ts) |
| 对外 API 服务    | [`apps/api-server/src/modules/workflow/workflow.service.ts`](./apps/api-server/src/modules/workflow/workflow.service.ts)       |

## 数据模型

Prisma schema 位于各应用的 `prisma/schema.prisma`。当前核心模型包括：

| 模型                | 说明                                        |
| ------------------- | ------------------------------------------- |
| `User`              | 用户、邮箱验证信息                          |
| `App`               | AI 应用基础信息、发布状态、当前激活发布版本 |
| `Workflow`          | 编辑态工作流版本，保存 nodes / edges JSON   |
| `PublishedApp`      | 发布态应用快照                              |
| `WorkflowExecution` | 平台内测试运行记录                          |
| `AppExecution`      | 外部 API 调用记录                           |
| `ApiKey`            | 应用 API Key                                |
| `KnowledgeBase`     | 知识库配置                                  |
| `Document`          | 知识库文档元数据，向量切片存储在 Qdrant     |

完整字段、索引、关系和级联删除规则见 [`docs/database.md`](./docs/database.md)。

## 新增节点的推荐路径

1. 在 `packages/ai-engine/src/types` 扩展节点类型和配置类型。
2. 在 `packages/ai-engine/src/validators` 增加配置校验。
3. 在 `packages/ai-engine/src/nodes/executors` 实现节点执行器。
4. 在 `packages/ai-engine/src/nodes/index.ts` 注册执行器。
5. 在 `apps/workflow/components/flow/nodes` 增加画布节点组件。
6. 在 `apps/workflow/components/flow/settings/forms` 增加配置表单。

执行逻辑应优先落在 `ai-engine`，这样平台内测试、WebApp 运行和对外 API 调用可以自然复用。

## 前端工程化

### 应用组织

`apps/workflow` 采用 Next.js App Router。页面级入口放在 `app/`，业务 UI 放在 `components/`，跨页面复用的请求封装、上下文、类型和工具函数放在 `lib/`。编辑器相关代码集中在 `components/flow`，知识库相关代码集中在 `components/knowledge`，应用管理、API Key、监控和执行日志分别有独立组件目录，便于按业务域维护。

`apps/webapp` 保持轻量，只承载已发布应用的访问和运行，不承担编辑、发布、知识库管理等主控台职责。

### UI 与交互约定

- 组件使用 React 19 + TypeScript，基础 UI 采用 shadcn/ui 风格组件，样式使用 Tailwind CSS 4。
- 工作流画布由 `@xyflow/react` 承载，节点展示组件、节点配置表单和执行测试面板分目录维护。
- 表单优先使用 `react-hook-form`，复杂文本输入和变量引用使用 Tiptap 相关组件。
- 图标统一使用 `lucide-react` 或已有 Tabler 图标；应用图标通过 `apps/workflow/components/app-icon.tsx` 做统一映射，旧 emoji 数据只作为兼容输入。
- 页面和组件尽量以业务域拆分，执行规则不写在 UI 里，工作流运行逻辑优先下沉到 `packages/ai-engine`。

### 状态与接口

- 前端页面通过 `lib/services/*` 封装请求，页面组件不直接散落复杂 `fetch` 逻辑。
- 登录态通过 `apps/workflow/app/api/auth/*` 和 `lib/auth.ts` 维护。
- 平台内工作流测试使用 SSE 返回节点状态、日志和最终结果，对应 Hook 为 `apps/workflow/lib/hooks/use-workflow-runner.ts`。
- 发布应用的外部调用走 `apps/api-server`，主控台管理和测试走 `apps/workflow/app/api`，两者共享数据库和执行引擎，但运行入口分离。

### 代码质量与提交链路

- TypeScript：各 workspace 提供 `typecheck`，根目录脚本会先构建 `ai-engine`，再按 `ai-engine`、`workflow`、`webapp`、`api-server` 的顺序执行类型检查。
- ESLint：根目录 `eslint.config.js` 统一规则。
- Prettier：`.prettierrc` 定义格式化风格，`.prettierignore` 排除构建产物和不适合格式化的文件。
- CSpell：`cspell.json` 和 `.cspell/custom-words.txt` 维护项目词库，避免技术名词误报。
- Husky + lint-staged：提交前执行 staged 文件检查、拼写检查和类型检查。
- 提交命令：使用 `pnpm commit` 通过 Commitizen 和 Commitlint 创建提交。
- Turbo：`turbo.json` 管理 build、typecheck 等任务依赖和缓存。

## 后端工程化

### 服务边界

后端分为主平台 BFF 和对外 API 两类入口。`apps/workflow/app/api` 使用 Next.js Route Handlers，为主控台提供登录注册、应用管理、工作流保存、测试运行、知识库和监控等内部接口。`apps/api-server` 使用 NestJS，为第三方系统提供发布应用调用入口，重点承担 API Key 鉴权、发布快照读取、执行引擎调用和外部调用日志记录。

两类入口共享 PostgreSQL、Prisma schema 和 `packages/ai-engine`，但职责边界不同：主平台 API 面向已登录用户和编辑态数据，`api-server` 面向外部系统和发布态快照。

### API 设计与鉴权

- 主平台接口统一放在 `apps/workflow/app/api`，通过 `lib/auth.ts` 获取当前登录用户，并在具体 Route Handler 中校验资源归属。
- 对外 API 放在 `apps/api-server/src/modules/workflow`，入口为 `POST /api/v1/apps/run`。
- 外部调用通过 `ApiKeyGuard` 校验 `Authorization: Bearer <API_KEY>`，只允许访问已发布且 API Key 有效的应用。
- 主平台 API 使用 `lib/api-response.ts` 返回统一成功/错误结构；NestJS 服务使用全局 `TransformInterceptor` 和 `HttpExceptionFilter` 统一响应和异常处理。
- 长任务或需要过程反馈的执行链路使用 SSE 返回节点状态、日志、错误和最终结果。

### 数据访问与持久化

- Prisma 是主要数据访问层，schema 位于各应用的 `prisma/schema.prisma`，数据库结构以 `apps/workflow/prisma/migrations` 为迁移来源。
- 业务数据存 PostgreSQL，包括用户、应用、工作流、发布快照、API Key、执行记录、知识库和文档元数据。
- 向量数据存 Qdrant，包含文档切片向量、payload 和检索索引；PostgreSQL 只保存知识库配置、文档元数据和处理状态。
- 编辑态工作流写入 `Workflow`，发布时复制为 `PublishedApp` 快照，外部调用只读取发布快照，避免草稿改动影响线上。
- 平台测试写入 `WorkflowExecution`，外部 API 调用写入 `AppExecution`，便于监控、审计和问题排查。

### 配置与安全

- 数据库、Qdrant、Ollama、SMTP、JWT Secret、服务端口等均通过环境变量注入，本地示例见“快速开始”章节。
- `.env*` 被 `.gitignore` 排除，不应提交真实密钥、SMTP 授权码、JWT Secret 或生产数据库连接串。
- API Key 只在创建时返回完整值，后续展示使用 `keyPrefix`，服务端通过完整 key 做校验。
- 删除用户、应用、工作流、发布版本、知识库等资源时依赖 Prisma relation 和数据库外键规则控制级联边界，详细关系见 [`docs/database.md`](./docs/database.md)。

### 后端质量约定

- 新增业务接口时优先补齐输入校验、资源归属校验、错误码和执行记录。
- 工作流执行、节点行为和 RAG 检索能力优先放在 `packages/ai-engine`，避免在 Route Handler 或 Controller 中复制执行逻辑。
- NestJS 模块按 Controller、Service、DTO、Guard、Prisma Service 分层；主平台 Route Handler 中复杂逻辑应下沉到 `lib/services/*`。
- 修改 Prisma schema 后需要同步迁移、重新生成 Prisma Client，并更新 [`docs/database.md`](./docs/database.md)。
- 提交前执行 `pnpm lint`、`pnpm spellcheck`、`pnpm typecheck`，避免格式、拼写和类型问题进入主分支。

## 工程规范

- ESLint 配置：[`eslint.config.js`](./eslint.config.js)
- Prettier 配置： [`.prettierrc`](./.prettierrc)
- CSpell 配置：[`cspell.json`](./cspell.json)
- Commitlint 配置：[`commitlint.config.js`](./commitlint.config.js)
- Husky hooks：`.husky/`
- 忽略规则： [`.gitignore`](./.gitignore)

提交前建议执行：

```bash
pnpm lint
pnpm spellcheck
pnpm typecheck
pnpm commit
```

## 维护说明

- 不提交 `.env*`、`node_modules`、`.next`、`.turbo`、`dist`、`build` 和本地数据库数据。
- 工作流执行行为的变更优先在 `packages/ai-engine` 实现，并同步验证平台测试运行、WebApp 运行和 API 调用。
- 生产环境部署前需要替换数据库、SMTP、Ollama、Qdrant 等外部服务配置，并确保 API Key、JWT Secret 等敏感配置由环境变量注入。

## License

UNLICENSED
