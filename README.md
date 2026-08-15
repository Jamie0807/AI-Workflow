# AI Workflow

English | [简体中文](./README.zh-CN.md)

AI Workflow is an AI workflow development platform built for real product development. It provides visual orchestration, test runs, release snapshots, API invocation, knowledge-base retrieval, and execution monitoring, so teams can compose LLM, RAG, HTTP request, conditional branch, and structured output capabilities into maintainable and reusable automation flows.

The repository is organized as a long-lived product codebase. It uses a Monorepo to manage multiple applications and a shared workflow execution engine, with the goal of supporting real development, deployment, and iteration.

## Core Capabilities

- **Visual workflow orchestration**: node dragging, connection, configuration, and test execution powered by `@xyflow/react`.
- **Shared execution engine**: `packages/ai-engine` owns DAG validation, topological sorting, conditional branching, node execution, and execution tracing.
- **RAG knowledge base**: document chunking, Ollama embeddings, Qdrant vector search, full-text search, and hybrid retrieval.
- **Application release flow**: draft workflows, published snapshots, API keys, execution history, and usage statistics.
- **Multiple runtime entries**: platform test runs, lightweight WebApp access, and the NestJS external API reuse the same execution core.

## Tech Stack

| Layer               | Technologies                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| Workspace           | pnpm workspace, Turborepo, TypeScript                                  |
| Platform app        | Next.js 16, React 19, App Router, Tailwind CSS 4                       |
| Workflow editor     | `@xyflow/react`, `react-hook-form`, Tiptap, shadcn/ui-style components |
| External API        | NestJS 11, Guard, Interceptor, Filter, class-validator                 |
| Execution engine    | `WorkflowEngine`, `GraphBuilder`, `NodeRegistry`, node executors       |
| AI / RAG            | Ollama, `@langchain/ollama`, Qdrant                                    |
| Data layer          | PostgreSQL, Prisma 7                                                   |
| Engineering quality | ESLint 9, Prettier, CSpell, Commitlint, Husky, lint-staged             |

## Project Structure

```text
ai-workflow/
├── apps/                         # Independently runnable applications
│   ├── workflow/                 # Main platform: auth, apps, editor, knowledge base, monitoring, BFF API
│   │   ├── app/                  # Next.js App Router pages, layouts, route handlers, middleware
│   │   ├── components/           # Business components and shadcn/ui-style primitives
│   │   ├── hooks/                # Shared frontend hooks
│   │   ├── lib/                  # Auth, Prisma, services, types, utilities
│   │   └── prisma/               # Main platform Prisma schema and migrations
│   ├── api-server/               # NestJS external API: API key auth, published app execution, call logs
│   │   ├── src/                  # Nest modules, controllers, services, guards, filters
│   │   └── prisma/               # Prisma schema used by the API service
│   └── webapp/                   # Lightweight visitor entry for running published workflows
│       ├── app/                  # Next.js page entry
│       ├── components/           # Runner panel and result display components
│       ├── lib/                  # Prisma, types, utilities
│       └── prisma/               # Prisma schema used by WebApp
├── packages/                     # Shared packages
│   └── ai-engine/                # Workflow engine, node protocol, executors, RAG retrieval
│       ├── src/core/             # WorkflowEngine, GraphBuilder, ExecutionContext
│       ├── src/nodes/            # Node registry and executors
│       ├── src/validators/       # Workflow and node config validation
│       ├── src/knowledge/        # Chunking, embeddings, retrievers
│       └── src/types/            # Shared workflow, node, execution result types
├── docker/                       # Local infrastructure orchestration
│   └── docker-compose.yml        # PostgreSQL, Qdrant
├── docs/                         # Project documentation
│   └── database.md               # Tables, relations, cascading rules, vector-store boundary
├── .husky/                       # Git hooks
├── .cspell/                      # Spell-check dictionary
├── package.json                  # Root scripts and dependencies
├── pnpm-workspace.yaml           # Workspace package scope
├── turbo.json                    # Turbo task pipeline
├── eslint.config.js              # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── .prettierignore               # Prettier ignore rules
└── cspell.json                   # CSpell configuration
```

## Module Responsibilities

| Module               | Responsibility                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/workflow`      | Login and registration, app management, workflow editor, test runs, knowledge-base management, API key management, execution logs, monitoring dashboards |
| `apps/api-server`    | Exposes `POST /api/v1/apps/run`, validates API keys, reads published snapshots, invokes the execution engine, and records call history                   |
| `apps/webapp`        | Lightweight runtime page for end users; default port `3001`                                                                                              |
| `packages/ai-engine` | Defines the workflow protocol, execution context, DAG construction, node registry and execution, and RAG foundations                                     |
| `docker`             | Local PostgreSQL and Qdrant infrastructure                                                                                                               |

## Architecture

The project uses a Monorepo with multiple runtime applications and one shared execution core. `apps/workflow` is the product console for orchestration, testing, publishing, and management. `apps/webapp` is a lightweight access entry for published apps. `apps/api-server` is the server API for third-party systems. All three depend on `packages/ai-engine`, so workflow execution rules stay consistent across editing, web access, and external API calls.

```text
Platform user / third-party system
        │
        ├── apps/workflow     # Orchestration, testing, publishing, management
        ├── apps/webapp       # Access published apps
        └── apps/api-server   # API-key-protected external calls
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

Platform test runs, WebApp runs, and external API calls all converge on `packages/ai-engine`. This keeps workflows validated in the editor aligned with behavior after publishing.

### Runtime Layers

| Layer                   | Main location                                                  | Description                                                                                       |
| ----------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Presentation            | `apps/workflow/app`, `apps/workflow/components`, `apps/webapp` | Pages, layouts, forms, canvas, result display, interaction state                                  |
| BFF / Route API         | `apps/workflow/app/api`                                        | Internal platform API for auth, app management, workflow persistence, test runs, knowledge bases  |
| External service API    | `apps/api-server/src`                                          | Third-party integration entry focused on API key auth, published snapshots, and execution records |
| Business services       | `apps/workflow/lib/services`, `apps/api-server/src/modules`    | App, workflow, knowledge-base, document-processing, and usage-stat actions                        |
| Execution engine        | `packages/ai-engine/src`                                       | DAG validation, topological sorting, node execution, context variables, RAG retrieval             |
| Data and infrastructure | `prisma/schema.prisma`, `docker/docker-compose.yml`            | PostgreSQL stores business data, Qdrant stores vector indexes, Ollama provides model capability   |

### Data Boundaries

- `Workflow` stores draft `nodes / edges` for ongoing editing and platform test runs.
- `PublishedApp` stores release snapshots. External API and WebApp executions read snapshots so draft changes do not affect live calls.
- `WorkflowExecution` records platform test runs. `AppExecution` records published-app calls.
- PostgreSQL stores users, apps, workflows, published versions, execution records, knowledge bases, and document metadata. Qdrant stores document chunk vectors, payloads, and retrieval indexes.
- API keys are only used for external calls to published apps. Platform login state is managed by `apps/workflow`.

## Workflow Model

A workflow is a serializable DAG definition. Core types live in [`packages/ai-engine/src/types/workflow.ts`](./packages/ai-engine/src/types/workflow.ts).

```ts
export type NodeKind = 'start' | 'llm' | 'http' | 'condition' | 'end' | 'knowledge'

export interface WorkflowDefinition {
    id: string
    name: string
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
}
```

Built-in nodes:

| Node        | Purpose                                                  |
| ----------- | -------------------------------------------------------- |
| `start`     | Defines workflow input parameters                        |
| `llm`       | Calls an Ollama LLM to generate content                  |
| `http`      | Calls an external HTTP service                           |
| `condition` | Selects a branch based on intent or condition            |
| `knowledge` | Retrieves relevant document chunks from a knowledge base |
| `end`       | Defines final workflow outputs                           |

Node config types are in [`packages/ai-engine/src/types/node.ts`](./packages/ai-engine/src/types/node.ts). Node executors are in [`packages/ai-engine/src/nodes/executors`](./packages/ai-engine/src/nodes/executors).

## Key Execution Flows

### Platform Test Run

```text
User clicks run in the editor
    → components/flow/test-run
    → lib/hooks/use-workflow-runner.ts
    → apps/workflow/app/api/apps/[id]/workflow/run
    → createWorkflowEngine()
    → WorkflowEngine.execute()
    → SSE returns node state, logs, and final result
    → write WorkflowExecution
```

### External API Call

```text
Third-party system calls api-server
    → ApiKeyGuard validates Authorization: Bearer <API_KEY>
    → WorkflowController receives POST /api/v1/apps/run
    → WorkflowService reads PublishedApp snapshot
    → createWorkflowEngine()
    → WorkflowEngine.execute()
    → write AppExecution
    → return sync result or SSE stream
```

### Knowledge-Base Processing

```text
Upload document
    → create Document record
    → chunk text
    → generate embeddings with Ollama
    → write vectors and payloads to Qdrant
    → retrieval tests or Knowledge nodes reuse the same Retriever
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9.x
- Docker and Docker Compose
- Local Ollama service, default `http://localhost:11434`

To use knowledge-base vectorization, prepare the embedding model:

```bash
ollama pull mxbai-embed-large:latest
```

LLM and condition nodes use the model selected in the UI. Pull the required Ollama models before running those nodes.

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Local Infrastructure

```bash
pnpm docker:start
```

This starts:

- PostgreSQL: `localhost:5433`
- Qdrant REST API: `localhost:6333`
- Qdrant gRPC: `localhost:6334`

Stop infrastructure:

```bash
pnpm docker:top
```

The current script name is `docker:top`, but it actually runs `docker compose down`.

### 3. Configure Environment Variables

`apps/workflow/.env`:

```env
DATABASE_URL="postgresql://postgres:xiaoer@localhost:5433/postgres"
```

`apps/workflow/.env.local`:

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
SMTP_FROM_NAME="AI Workflow"
SMTP_FROM_EMAIL="your-email@qq.com"
# EMAIL_OVERRIDE_TO="dev-target@example.com"
```

`apps/api-server/.env`:

```env
DATABASE_URL="postgresql://postgres:xiaoer@localhost:5433/postgres"
PORT="3100"
OLLAMA_BASE_URL="http://localhost:11434"
QDRANT_URL="http://localhost:6333"
```

`apps/webapp/.env`:

```env
DATABASE_URL="postgresql://postgres:xiaoer@localhost:5433/postgres"
```

SMTP is used for registration verification emails. `SMTP_PASSWORD` is usually the provider's authorization token or app-specific password, not the mailbox login password.

### 4. Initialize the Database

On first setup, run migrations and generate Prisma Client for each app:

```bash
(cd apps/workflow && pnpm exec prisma migrate deploy)
(cd apps/workflow && pnpm exec prisma generate)
(cd apps/api-server && pnpm exec prisma generate)
(cd apps/webapp && pnpm exec prisma generate)
```

### 5. Start Development Servers

Terminal 1:

```bash
pnpm dev
```

Turbo starts workspace apps that provide a `dev` script, mainly:

- `workflow`: `http://localhost:3000`
- `webapp`: `http://localhost:3001`

Terminal 2:

```bash
pnpm --filter @ai-workflow/api-server start:dev
```

API service defaults:

- `api-server`: `http://localhost:3100`
- Workflow run endpoint: `POST http://localhost:3100/api/v1/apps/run`

## Common Commands

```bash
# Development
pnpm dev
pnpm --filter @ai-workflow/api-server start:dev

# Build and type check
pnpm build
pnpm typecheck
pnpm --filter @ai-workflow/ai-engine test

# Code quality
pnpm lint
pnpm spellcheck
pnpm commit

# Infrastructure
pnpm docker:start
pnpm docker:top

# Cleanup
pnpm clean
pnpm clean:all
```

## API Call Example

After publishing an app and creating an API key, call it through `api-server`:

```bash
curl -X POST "http://localhost:3100/api/v1/apps/run" \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "question": "Please introduce this product"
    },
    "stream": false
  }'
```

Set `"stream": true` for streaming calls. The server returns SSE events.

## Important Source Entries

| Topic                                      | File                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Workflow types                             | [`packages/ai-engine/src/types/workflow.ts`](./packages/ai-engine/src/types/workflow.ts)                                       |
| Node config types                          | [`packages/ai-engine/src/types/node.ts`](./packages/ai-engine/src/types/node.ts)                                               |
| Execution engine                           | [`packages/ai-engine/src/core/engine.ts`](./packages/ai-engine/src/core/engine.ts)                                             |
| Graph construction and topological sorting | [`packages/ai-engine/src/core/graph-builder.ts`](./packages/ai-engine/src/core/graph-builder.ts)                               |
| Execution context                          | [`packages/ai-engine/src/core/context.ts`](./packages/ai-engine/src/core/context.ts)                                           |
| Node registry                              | [`packages/ai-engine/src/nodes/index.ts`](./packages/ai-engine/src/nodes/index.ts)                                             |
| Node executors                             | [`packages/ai-engine/src/nodes/executors`](./packages/ai-engine/src/nodes/executors)                                           |
| Knowledge retrieval                        | [`packages/ai-engine/src/knowledge`](./packages/ai-engine/src/knowledge)                                                       |
| Workflow editor                            | [`apps/workflow/components/flow/editor`](./apps/workflow/components/flow/editor)                                               |
| Node config forms                          | [`apps/workflow/components/flow/settings/forms`](./apps/workflow/components/flow/settings/forms)                               |
| Test-run hook                              | [`apps/workflow/lib/hooks/use-workflow-runner.ts`](./apps/workflow/lib/hooks/use-workflow-runner.ts)                           |
| Knowledge service                          | [`apps/workflow/lib/services/knowledge-service.ts`](./apps/workflow/lib/services/knowledge-service.ts)                         |
| Document processing                        | [`apps/workflow/lib/services/document-processor.ts`](./apps/workflow/lib/services/document-processor.ts)                       |
| External API controller                    | [`apps/api-server/src/modules/workflow/workflow.controller.ts`](./apps/api-server/src/modules/workflow/workflow.controller.ts) |
| External API service                       | [`apps/api-server/src/modules/workflow/workflow.service.ts`](./apps/api-server/src/modules/workflow/workflow.service.ts)       |

## Data Model

Prisma schemas live under each application's `prisma/schema.prisma`. Core models include:

| Model               | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| `User`              | User and email verification data                                     |
| `App`               | AI app metadata, publish status, active published version            |
| `Workflow`          | Draft workflow version with `nodes / edges` JSON                     |
| `PublishedApp`      | Published app snapshot                                               |
| `WorkflowExecution` | Platform test-run record                                             |
| `AppExecution`      | External API call record                                             |
| `ApiKey`            | Application API key                                                  |
| `KnowledgeBase`     | Knowledge-base configuration                                         |
| `Document`          | Knowledge-base document metadata; vector chunks are stored in Qdrant |

See [`docs/database.md`](./docs/database.md) for complete fields, indexes, relations, and cascading rules.

## Recommended Path for Adding a Node

1. Extend node type and config types in `packages/ai-engine/src/types`.
2. Add config validation in `packages/ai-engine/src/validators`.
3. Implement the node executor in `packages/ai-engine/src/nodes/executors`.
4. Register the executor in `packages/ai-engine/src/nodes/index.ts`.
5. Add the canvas node component in `apps/workflow/components/flow/nodes`.
6. Add the config form in `apps/workflow/components/flow/settings/forms`.

Execution behavior should live in `ai-engine` first, so platform test runs, WebApp runs, and external API calls can reuse it naturally.

## Frontend Engineering

### Application Organization

`apps/workflow` uses the Next.js App Router. Page-level entries live in `app/`; business UI lives in `components/`; reusable request wrappers, contexts, types, and utilities live in `lib/`. Editor-related code is grouped under `components/flow`; knowledge-base code is grouped under `components/knowledge`; app management, API keys, monitoring, and execution logs each have their own component areas.

`apps/webapp` stays lightweight. It only runs published apps and does not own editing, publishing, or knowledge-base management.

### UI and Interaction Conventions

- Components use React 19 and TypeScript. Base UI follows shadcn/ui-style components with Tailwind CSS 4.
- The workflow canvas is powered by `@xyflow/react`. Node display components, node config forms, and the execution test panel are maintained in separate directories.
- Forms prefer `react-hook-form`. Complex text inputs and variable references use Tiptap-related components.
- Icons are unified through `lucide-react` or existing Tabler icons. Application icons are mapped through `apps/workflow/components/app-icon.tsx`; legacy emoji values are only treated as compatibility input.
- Pages and components are split by business domain. Execution rules should not live in UI code; workflow runtime logic should be pushed down into `packages/ai-engine`.

### State and API Access

- Frontend pages wrap requests through `lib/services/*`; page components should not scatter complex `fetch` logic.
- Login state is maintained through `apps/workflow/app/api/auth/*` and `lib/auth.ts`.
- Platform workflow test runs use SSE to return node state, logs, and final results. The related hook is `apps/workflow/lib/hooks/use-workflow-runner.ts`.
- External calls to published apps go through `apps/api-server`; console management and testing go through `apps/workflow/app/api`. They share the database and execution engine, but runtime entries stay separate.

### Quality and Commit Flow

- TypeScript: each workspace provides `typecheck`. The root script builds `ai-engine` first, then runs type checks for `ai-engine`, `workflow`, `webapp`, and `api-server`.
- ESLint: root `eslint.config.js` provides shared rules.
- Prettier: `.prettierrc` defines formatting style; `.prettierignore` excludes build artifacts and files that should not be formatted.
- CSpell: `cspell.json` and `.cspell/custom-words.txt` maintain project vocabulary and reduce false positives.
- Husky + lint-staged: pre-commit checks staged files, spelling, and types.
- Commit command: use `pnpm commit` to create commits through Commitizen and Commitlint.
- Turbo: `turbo.json` manages task dependencies and cache behavior for build and typecheck.

## Backend Engineering

### Service Boundaries

The backend has two entry categories: the main platform BFF and the external API. `apps/workflow/app/api` uses Next.js Route Handlers for login, registration, app management, workflow saving, test runs, knowledge bases, and monitoring. `apps/api-server` uses NestJS to expose the published-app invocation endpoint for third-party systems, focusing on API key authentication, published snapshot reads, execution engine invocation, and external call logging.

Both entries share PostgreSQL, Prisma schemas, and `packages/ai-engine`, but their responsibilities differ: the platform API targets logged-in users and draft data, while `api-server` targets external systems and published snapshots.

### API Design and Authentication

- Platform APIs live under `apps/workflow/app/api`. They use `lib/auth.ts` to get the current user and check resource ownership inside route handlers.
- External APIs live under `apps/api-server/src/modules/workflow`. The entry is `POST /api/v1/apps/run`.
- External calls are authenticated by `ApiKeyGuard` through `Authorization: Bearer <API_KEY>`, and are limited to published apps with valid API keys.
- Platform APIs return unified success/error structures through `lib/api-response.ts`. NestJS uses the global `TransformInterceptor` and `HttpExceptionFilter` to normalize responses and errors.
- Long-running or progress-sensitive execution paths use SSE to return node state, logs, errors, and final results.

### Data Access and Persistence

- Prisma is the primary data access layer. Schemas live under each application's `prisma/schema.prisma`; `apps/workflow/prisma/migrations` is the migration source.
- Business data is stored in PostgreSQL, including users, apps, workflows, published snapshots, API keys, execution records, knowledge bases, and document metadata.
- Vector data is stored in Qdrant, including document chunk vectors, payloads, and retrieval indexes. PostgreSQL only stores knowledge-base configuration, document metadata, and processing status.
- Draft workflows are written to `Workflow`. Publishing copies them into `PublishedApp` snapshots. External calls only read published snapshots so draft changes cannot affect live behavior.
- Platform tests write `WorkflowExecution`; external API calls write `AppExecution` for monitoring, audit, and debugging.

### Configuration and Security

- Database, Qdrant, Ollama, SMTP, JWT secret, and service ports are injected through environment variables. Local examples are listed in Quick Start.
- `.env*` is ignored by `.gitignore`. Do not commit real secrets, SMTP tokens, JWT secrets, or production database URLs.
- API keys are only returned in full at creation time. Later displays use `keyPrefix`; the server validates against the full key.
- Deleting users, apps, workflows, published versions, and knowledge bases relies on Prisma relations and database foreign keys to control cascading boundaries. See [`docs/database.md`](./docs/database.md) for details.

### Backend Quality Guidelines

- New business APIs should include input validation, resource ownership checks, error codes, and execution records when relevant.
- Workflow execution, node behavior, and RAG retrieval should live in `packages/ai-engine` first to avoid duplicating runtime rules in route handlers or controllers.
- NestJS modules follow Controller, Service, DTO, Guard, and Prisma Service layers. Complex logic in platform route handlers should be moved into `lib/services/*`.
- After changing Prisma schemas, add migrations, regenerate Prisma Client, and update [`docs/database.md`](./docs/database.md).
- Before committing, run `pnpm lint`, `pnpm spellcheck`, and `pnpm typecheck`.

## Engineering Standards

- ESLint configuration: [`eslint.config.js`](./eslint.config.js)
- Prettier configuration: [`.prettierrc`](./.prettierrc)
- CSpell configuration: [`cspell.json`](./cspell.json)
- Commitlint configuration: [`commitlint.config.js`](./commitlint.config.js)
- Husky hooks: `.husky/`
- Ignore rules: [`.gitignore`](./.gitignore)

Recommended pre-commit checks:

```bash
pnpm lint
pnpm spellcheck
pnpm typecheck
pnpm commit
```

## Maintenance Notes

- Do not commit `.env*`, `node_modules`, `.next`, `.turbo`, `dist`, `build`, or local database data.
- Changes to workflow execution behavior should be implemented in `packages/ai-engine` first and verified across platform test runs, WebApp runs, and API calls.
- Before production deployment, replace database, SMTP, Ollama, Qdrant, and other external service configuration, and ensure API keys, JWT secrets, and similar sensitive values are injected through environment variables.

## License

UNLICENSED
