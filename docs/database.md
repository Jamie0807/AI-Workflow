# Database Schema

本文档描述 AI Workflow 当前 PostgreSQL 数据模型、表关系和外部存储边界。权威 schema 位于 [`apps/workflow/prisma/schema.prisma`](../apps/workflow/prisma/schema.prisma)，`apps/api-server` 与 `apps/webapp` 使用同构 schema 访问同一数据库。

## 存储边界

| 存储       | 用途                                                              |
| ---------- | ----------------------------------------------------------------- |
| PostgreSQL | 用户、应用、工作流、发布快照、API Key、执行历史、知识库文档元数据 |
| Qdrant     | 知识库文档切片向量、payload、检索索引                             |
| Ollama     | LLM 与 Embedding 模型服务，不保存业务数据                         |
| SMTP 服务  | 注册验证邮件发送通道，不作为业务数据存储                          |

PostgreSQL 保存知识库文档的元数据和提取后的文本内容；向量化后的 chunk 不在 PostgreSQL 表中，而是在 Qdrant 中按知识库/文档关联信息保存。

## ER 关系概览

```text
User
├── App
│   ├── Workflow
│   ├── PublishedApp
│   │   └── AppExecution
│   ├── ApiKey
│   │   └── AppExecution
│   └── WorkflowExecution
└── KnowledgeBase
    └── Document
```

主要级联规则：

- 删除 `User` 会级联删除其 `App` 和 `KnowledgeBase`。
- 删除 `App` 会级联删除 `Workflow`、`PublishedApp`、`WorkflowExecution`、`ApiKey`。
- 删除 `PublishedApp` 会级联删除对应 `AppExecution`。
- 删除 `KnowledgeBase` 会级联删除对应 `Document`。
- 删除 `ApiKey` 时，`AppExecution.apiKeyId` 会置空，用于保留历史调用记录。

## 表说明

### `users`

用户账号与邮箱验证信息。

| 字段            | 类型      | 说明                 |
| --------------- | --------- | -------------------- |
| `id`            | String    | 主键，`cuid()`       |
| `email`         | String    | 唯一邮箱             |
| `password`      | String    | 密码哈希             |
| `name`          | String?   | 用户名称             |
| `avatar`        | String?   | 头像地址             |
| `emailVerified` | DateTime? | 邮箱验证时间         |
| `verifyToken`   | String?   | 邮箱验证 token，唯一 |
| `createdAt`     | DateTime  | 创建时间             |
| `updatedAt`     | DateTime  | 更新时间             |

关系：

- `users` 1:N `apps`
- `users` 1:N `knowledge_bases`

### `apps`

平台内的 AI 应用。一个应用拥有编辑态工作流、发布快照、API Key 和执行历史。

| 字段                | 类型      | 说明                                                               |
| ------------------- | --------- | ------------------------------------------------------------------ |
| `id`                | String    | 主键，`cuid()`                                                     |
| `name`              | String    | 应用名称                                                           |
| `description`       | String?   | 应用描述                                                           |
| `icon`              | String    | 应用图标标识，默认 `automation`；旧数据中的 emoji 会在前端兼容映射 |
| `type`              | AppType   | 应用类型：`WORKFLOW`、`CHATBOT`、`AGENT`                           |
| `tags`              | String[]  | 标签                                                               |
| `config`            | Json?     | 应用级配置                                                         |
| `version`           | Int       | 编辑态版本号                                                       |
| `isPublished`       | Boolean   | 是否已发布                                                         |
| `isDeleted`         | Boolean   | 软删除标记                                                         |
| `activePublishedId` | String?   | 当前激活发布版本 ID                                                |
| `userId`            | String    | 所属用户                                                           |
| `createdAt`         | DateTime  | 创建时间                                                           |
| `updatedAt`         | DateTime  | 更新时间                                                           |
| `publishedAt`       | DateTime? | 最近发布时间                                                       |

索引：

- `userId`
- `type`

关系：

- `apps` N:1 `users`
- `apps` 1:N `workflows`
- `apps` 1:N `published_apps`
- `apps` 1:N `api_keys`
- `apps` 1:N `workflow_executions`
- `apps.activePublishedId` N:1 `published_apps`

### `workflows`

编辑态工作流定义。保存画布节点、边和配置，用于编辑器继续修改。

| 字段          | 类型     | 说明           |
| ------------- | -------- | -------------- |
| `id`          | String   | 主键，`cuid()` |
| `name`        | String   | 工作流名称     |
| `description` | String?  | 工作流描述     |
| `nodes`       | Json     | 节点定义       |
| `edges`       | Json     | 连线定义       |
| `version`     | Int      | 版本号         |
| `appId`       | String   | 所属应用       |
| `createdAt`   | DateTime | 创建时间       |
| `updatedAt`   | DateTime | 更新时间       |

索引：

- `appId`
- `version`

### `published_apps`

发布态应用快照。发布时复制应用名称、描述、节点和边，运行时优先读取快照，避免编辑态变更影响线上调用。

| 字段          | 类型     | 说明               |
| ------------- | -------- | ------------------ |
| `id`          | String   | 主键，`cuid()`     |
| `version`     | Int      | 发布版本号         |
| `name`        | String   | 发布时应用名称快照 |
| `description` | String?  | 发布时应用描述快照 |
| `nodes`       | Json     | 发布时节点快照     |
| `edges`       | Json     | 发布时连线快照     |
| `appId`       | String   | 所属应用           |
| `publishedAt` | DateTime | 发布时间           |
| `publishedBy` | String?  | 发布者用户 ID      |

约束与索引：

- `@@unique([appId, version])`
- `appId`
- `version`

### `workflow_executions`

平台编辑器中的测试运行历史。

| 字段          | 类型            | 说明                          |
| ------------- | --------------- | ----------------------------- |
| `id`          | String          | 主键，`cuid()`                |
| `executionId` | String          | 执行唯一标识，唯一            |
| `status`      | ExecutionStatus | `RUNNING`、`SUCCESS`、`ERROR` |
| `inputs`      | Json?           | 输入参数                      |
| `outputs`     | Json?           | 输出结果                      |
| `error`       | String?         | 错误信息                      |
| `duration`    | Int?            | 执行耗时，毫秒                |
| `totalTokens` | Int             | Token 消耗                    |
| `nodeTraces`  | Json?           | 节点执行详情                  |
| `appId`       | String          | 所属应用                      |
| `startedAt`   | DateTime        | 开始时间                      |
| `completedAt` | DateTime?       | 完成时间                      |

索引：

- `appId`
- `status`
- `startedAt`

### `api_keys`

应用 API Key。用于对外 API 调用鉴权和统计。

| 字段         | 类型      | 说明                     |
| ------------ | --------- | ------------------------ |
| `id`         | String    | 主键，`cuid()`           |
| `name`       | String    | Key 名称                 |
| `key`        | String    | 实际 API Key，唯一       |
| `keyPrefix`  | String    | 展示用前缀               |
| `isActive`   | Boolean   | 是否启用                 |
| `expiresAt`  | DateTime? | 过期时间，空表示永不过期 |
| `lastUsedAt` | DateTime? | 最后使用时间             |
| `usageCount` | Int       | 使用次数                 |
| `appId`      | String    | 所属应用                 |
| `createdAt`  | DateTime  | 创建时间                 |
| `updatedAt`  | DateTime  | 更新时间                 |

索引：

- `appId`
- `key`

### `app_executions`

发布应用通过 API Key 或 WebApp 被调用时产生的执行历史。

| 字段             | 类型            | 说明                          |
| ---------------- | --------------- | ----------------------------- |
| `id`             | String          | 主键，`cuid()`                |
| `executionId`    | String          | 执行唯一标识，唯一            |
| `status`         | ExecutionStatus | `RUNNING`、`SUCCESS`、`ERROR` |
| `inputs`         | Json?           | 输入参数                      |
| `outputs`        | Json?           | 输出结果                      |
| `error`          | String?         | 错误信息                      |
| `duration`       | Int?            | 执行耗时，毫秒                |
| `totalTokens`    | Int             | Token 消耗                    |
| `nodeTraces`     | Json?           | 节点执行详情                  |
| `publishedAppId` | String          | 发布版本 ID                   |
| `apiKeyId`       | String?         | 调用使用的 API Key            |
| `startedAt`      | DateTime        | 开始时间                      |
| `completedAt`    | DateTime?       | 完成时间                      |

索引：

- `publishedAppId`
- `apiKeyId`
- `status`
- `startedAt`

### `knowledge_bases`

知识库配置和统计信息。

| 字段                | 类型                | 说明                           |
| ------------------- | ------------------- | ------------------------------ |
| `id`                | String              | 主键，`cuid()`                 |
| `name`              | String              | 知识库名称                     |
| `description`       | String?             | 知识库描述                     |
| `icon`              | String              | 图标，默认 `📚`                |
| `embeddingModel`    | String              | Embedding 模型                 |
| `embeddingProvider` | String              | Embedding 服务商               |
| `dimensions`        | Int                 | 向量维度                       |
| `chunkSize`         | Int                 | 切片长度                       |
| `chunkOverlap`      | Int                 | 切片重叠长度                   |
| `retrievalMode`     | RetrievalMode       | `VECTOR`、`FULLTEXT`、`HYBRID` |
| `vectorWeight`      | Float               | 混合检索中的向量权重           |
| `topK`              | Int                 | 返回条数                       |
| `threshold`         | Float               | 相似度阈值                     |
| `documentCount`     | Int                 | 文档数量                       |
| `chunkCount`        | Int                 | 切片数量                       |
| `status`            | KnowledgeBaseStatus | `READY`、`INDEXING`、`ERROR`   |
| `userId`            | String              | 所属用户                       |
| `createdAt`         | DateTime            | 创建时间                       |
| `updatedAt`         | DateTime            | 更新时间                       |

索引：

- `userId`
- `status`

### `documents`

知识库文档元数据和文本提取结果。

| 字段              | 类型           | 说明                                          |
| ----------------- | -------------- | --------------------------------------------- |
| `id`              | String         | 主键，`cuid()`                                |
| `name`            | String         | 文档显示名称                                  |
| `originalName`    | String         | 原始文件名                                    |
| `mimeType`        | String         | MIME 类型                                     |
| `size`            | Int            | 文件大小，字节                                |
| `content`         | String?        | 提取后的文本内容                              |
| `status`          | DocumentStatus | `PENDING`、`PROCESSING`、`COMPLETED`、`ERROR` |
| `errorMessage`    | String?        | 处理失败原因                                  |
| `chunkCount`      | Int            | 切片数量                                      |
| `processedAt`     | DateTime?      | 处理完成时间                                  |
| `knowledgeBaseId` | String         | 所属知识库                                    |
| `createdAt`       | DateTime       | 创建时间                                      |
| `updatedAt`       | DateTime       | 更新时间                                      |

索引：

- `knowledgeBaseId`
- `status`

## 枚举

### `ExecutionStatus`

| 值        | 说明   |
| --------- | ------ |
| `RUNNING` | 运行中 |
| `SUCCESS` | 成功   |
| `ERROR`   | 失败   |

### `AppType`

| 值         | 说明       |
| ---------- | ---------- |
| `WORKFLOW` | 工作流应用 |
| `CHATBOT`  | 聊天助手   |
| `AGENT`    | Agent 应用 |

### `RetrievalMode`

| 值         | 说明     |
| ---------- | -------- |
| `VECTOR`   | 向量检索 |
| `FULLTEXT` | 全文检索 |
| `HYBRID`   | 混合检索 |

### `KnowledgeBaseStatus`

| 值         | 说明   |
| ---------- | ------ |
| `READY`    | 可用   |
| `INDEXING` | 索引中 |
| `ERROR`    | 异常   |

### `DocumentStatus`

| 值           | 说明   |
| ------------ | ------ |
| `PENDING`    | 待处理 |
| `PROCESSING` | 处理中 |
| `COMPLETED`  | 已完成 |
| `ERROR`      | 异常   |

## 数据一致性说明

- `Workflow` 保存编辑态 JSON，`PublishedApp` 保存发布态快照，两者刻意分离。
- `App.activePublishedId` 指向当前线上生效的发布版本。
- `WorkflowExecution` 面向平台内测试运行；`AppExecution` 面向发布后调用历史。
- `ApiKey.key` 是鉴权字段，页面展示时应使用 `keyPrefix`，避免泄露完整 Key。
- 删除用户或应用会触发级联删除，执行前应确认是否需要保留历史记录或迁移归属。
