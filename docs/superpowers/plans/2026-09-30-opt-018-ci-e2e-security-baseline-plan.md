# OPT-018 CI、E2E 和安全测试基线实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AI Workflow 建立可在本地和 GitHub Actions 重复运行的质量基线，覆盖快速 PR 门禁、真实 PostgreSQL/Qdrant 集成、Playwright 核心 E2E、安全回归和手动/定时负载冒烟。

**Architecture:** 根目录提供统一测试入口；Playwright 作为 HTTP 集成、安全和浏览器 E2E 的统一执行器；真实依赖由测试 Compose 提供，Ollama 由仓库内 fake 服务替代。GitHub Actions 将无外部服务的快速门禁与真实服务测试拆成独立 job，并保留失败诊断产物。

**Tech Stack:** pnpm 9、Turbo、GitHub Actions、Playwright Test、Next.js 16、PostgreSQL、Qdrant、Node.js `.mjs` 测试支持脚本。

## Global Constraints

- 不修改 API Key、SSRF、限流、CORS 和文档处理业务行为；这些修复仍归属 OPT-001～008。
- CI 不访问真实 Ollama、SMTP、生产数据库或仓库中的 `.env` 文件。
- PostgreSQL/Qdrant 集成测试必须连接真实服务，服务不可用时失败，不得静默跳过。
- SSRF、限流和 CORS 尚未具备保护时只能登记为 `fixme`/缺口报告，不能把漏洞行为断言为通过。
- 所有新增测试命令必须在本地和 CI 使用相同入口。
- 不自动创建 Git 提交；每个任务的提交步骤仅作为历史计划模板，不执行。
- Node.js CI 版本固定为项目支持的 Node 22，避免使用本机 Node 24 的特有行为。

---

### Task 1: 统一 workspace 测试命令和 Playwright 依赖

**Files:**

- Modify: `package.json`
- Modify: `apps/workflow/package.json`
- Create: `playwright.config.ts`
- Create: `tests/unit/test-command-contract.mjs`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Produces root commands `test`, `test:integration`, `test:e2e`, `test:security`, `test:load`。
- Produces Playwright projects `integration`, `security`, `e2e`，后续测试文件只通过 project 选择执行层。

- [ ] **Step 1: Write the command contract test**

Create `tests/unit/test-command-contract.mjs` that reads root and Workflow `package.json` and asserts the required script names exist:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readJson(path) {
    return JSON.parse(await readFile(path, 'utf8'))
}

test('root exposes the OPT-018 test entry points', async () => {
    const root = await readJson('package.json')
    for (const name of ['test', 'test:integration', 'test:e2e', 'test:security', 'test:load']) {
        assert.equal(typeof root.scripts[name], 'string', `${name} must be defined`)
    }
})

test('workflow keeps a deterministic seed command', async () => {
    const workflow = await readJson('apps/workflow/package.json')
    assert.equal(typeof workflow.scripts['test:seed'], 'string')
})
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run:

```bash
node --test tests/unit/test-command-contract.mjs
```

Expected: FAIL because the root scripts and `test:seed` do not exist yet.

- [ ] **Step 3: Add the minimum scripts and dependency**

Add `@playwright/test` to root `devDependencies` and use these scripts:

```json
{
    "test": "pnpm --filter @ai-workflow/ai-engine test && pnpm --filter @ai-workflow/workflow test:user-settings && node --test tests/unit/*.mjs",
    "test:integration": "playwright test --project=integration",
    "test:e2e": "playwright test --project=e2e",
    "test:security": "playwright test --project=security",
    "test:load": "node tests/load/load-smoke.mjs",
    "test:prepare": "pnpm --filter @ai-workflow/workflow test:seed"
}
```

Add Workflow’s test script:

```json
{
    "test:seed": "tsx scripts/test-seed.ts"
}
```

Add `tsx` to `apps/workflow` development dependencies, install with `pnpm install`, and keep the lockfile updated by pnpm.

- [ ] **Step 4: Add Playwright project configuration**

Create `playwright.config.ts` with deterministic defaults:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: false,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: process.env.WORKFLOW_BASE_URL ?? 'http://127.0.0.1:3000',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        ignoreHTTPSErrors: true,
    },
    projects: [
        { name: 'integration', testMatch: /tests\/integration\/.+\.spec\.ts/ },
        { name: 'security', testMatch: /tests\/security\/.+\.spec\.ts/ },
        { name: 'e2e', use: { ...devices['Desktop Chrome'] }, testMatch: /tests\/e2e\/.+\.spec\.ts/ },
    ],
})
```

- [ ] **Step 5: Run the contract and type checks**

Run:

```bash
node --test tests/unit/test-command-contract.mjs
pnpm exec tsc --noEmit --pretty false
```

Expected: both commands pass; no application behavior has changed.

### Task 2: Add deterministic test services, Compose, and database seed

**Files:**

- Create: `docker/docker-compose.test.yml`
- Create: `tests/support/fake-ollama.mjs`
- Create: `tests/unit/fake-ollama.test.mjs`
- Create: `apps/workflow/scripts/test-seed.ts`
- Create: `tests/support/test-env.mjs`
- Modify: `apps/workflow/package.json`

**Interfaces:**

- `fake-ollama.mjs` listens on `OLLAMA_PORT` and serves `/api/tags`, `/api/embeddings`, and `/api/chat`.
- `test-seed.ts` is idempotent and creates two verified users with fixed test-only passwords, then removes data from prior test runs by the `ci-e2e-` name prefix.
- `test-env.mjs` exports `TEST_BASE_URL`, `TEST_DATABASE_URL`, `TEST_QDRANT_URL`, `TEST_OLLAMA_URL` and rejects production-looking values.

- [ ] **Step 1: Write fake Ollama contract tests**

Create `tests/unit/fake-ollama.test.mjs` using Node’s built-in test runner. Start the server on an ephemeral port and assert model listing, stable embedding length, deterministic repeated embeddings, chat output, and 404 for unknown paths.

The first test must assert a stable hash-based vector rather than a random vector:

```js
test('embedding output is deterministic and has the configured dimension', async () => {
    const first = await request('/api/embeddings', { prompt: 'risk level', model: 'test-embedding' })
    const second = await request('/api/embeddings', { prompt: 'risk level', model: 'test-embedding' })
    assert.equal(first.embedding.length, 1024)
    assert.deepEqual(first.embedding, second.embedding)
})
```

- [ ] **Step 2: Run fake Ollama tests to verify they fail**

Run:

```bash
node --test tests/unit/fake-ollama.test.mjs
```

Expected: FAIL because `tests/support/fake-ollama.mjs` is not present.

- [ ] **Step 3: Implement the minimal fake Ollama server**

Use Node’s `http` module and a fixed SHA-256 digest to fill 1024 normalized numbers. Do not import application secrets or call the network. Support an `OLLAMA_FAKE_MODE=error` branch for explicit failure tests.

- [ ] **Step 4: Add the test Compose file**

Use fixed images and test-only credentials:

```yaml
services:
    postgres:
        image: postgres:18
        ports: ['5434:5432']
        environment:
            POSTGRES_USER: ci
            POSTGRES_PASSWORD: ci
            POSTGRES_DB: ai_workflow_test
    qdrant:
        image: qdrant/qdrant:v1.16.2
        ports: ['6335:6333']
```

Add health checks for both services and no persistent host volume. The application test environment uses `postgresql://ci:ci@127.0.0.1:5434/ai_workflow_test` and `http://127.0.0.1:6335`.

- [ ] **Step 5: Add an idempotent Prisma seed**

Implement `test-seed.ts` using the generated Workflow Prisma client and adapter. It must:

1. reject `NODE_ENV=production`;
2. delete prior `ci-e2e-` apps/knowledge bases/users in dependency-safe order;
3. hash fixed test passwords with the existing password helper;
4. create `ci-e2e-user-a@example.test` and `ci-e2e-user-b@example.test` with `emailVerified` set;
5. write IDs to `tests/.artifacts/seed.json` without writing passwords or tokens.

- [ ] **Step 6: Verify services and seed**

Run:

```bash
docker compose -f docker/docker-compose.test.yml up -d --wait
DATABASE_URL=postgresql://ci:ci@127.0.0.1:5434/ai_workflow_test pnpm --filter @ai-workflow/workflow exec prisma migrate deploy
DATABASE_URL=postgresql://ci:ci@127.0.0.1:5434/ai_workflow_test pnpm test:prepare
node --test tests/unit/fake-ollama.test.mjs
```

Expected: both containers become healthy, migrations apply, seed is repeatable, and fake Ollama tests pass.

### Task 3: Build API integration and security regression suites

**Files:**

- Create: `tests/support/api-fixtures.ts`
- Create: `tests/integration/knowledge-storage.spec.ts`
- Create: `tests/security/authz.spec.ts`
- Create: `tests/security/security-gap-report.spec.ts`
- Modify: `playwright.config.ts`

**Interfaces:**

- `api-fixtures.ts` exports `requestAsUser(page, email, password)`, `createApp`, `createKnowledgeBase`, and `deleteSeedData` helpers using Playwright `APIRequestContext`.
- Integration tests target the running Workflow server and real PostgreSQL/Qdrant.
- Security tests fail for regressions in existing auth/resource isolation and emit a machine-readable gap report for unimplemented SSRF/rate-limit/CORS controls.

- [ ] **Step 1: Write the failing integration tests**

Start with tests for:

```ts
test('creates and lists a knowledge base in PostgreSQL', async ({ request }) => {
    const api = await requestAsUser(request, 'ci-e2e-user-a@example.test')
    const created = await createKnowledgeBase(api, 'ci-e2e-kb')
    const listed = await api.get('/api/knowledge')
    expect((await listed.json()).data.items.some(item => item.id === created.id)).toBe(true)
})

test('rejects a protected endpoint without a session', async ({ request }) => {
    const response = await request.get('/api/knowledge')
    expect(response.status()).toBe(401)
})
```

- [ ] **Step 2: Run integration tests to verify they fail**

Run:

```bash
pnpm exec playwright test --project=integration tests/integration/knowledge-storage.spec.ts
```

Expected: FAIL until the application server, seed, and request fixture are implemented.

- [ ] **Step 3: Implement request fixtures and integration assertions**

Use the login response cookie in a request context. Assert successful CRUD, document ownership relation, and status responses. Poll document processing with a bounded timeout; if fake Ollama/Qdrant is unavailable, fail with the dependency health output rather than skip.

- [ ] **Step 4: Write security regression tests**

Cover these concrete cases:

```ts
test('protected API returns 401 without a session', async ({ request }) => {
    const response = await request.get('/api/apps')
    expect(response.status()).toBe(401)
})

test('user B cannot read user A app or knowledge base', async ({ request }) => {
    const userA = await requestAsUser(request, 'ci-e2e-user-a@example.test')
    const app = await createApp(userA, 'ci-e2e-owned-app')
    const userB = await requestAsUser(request, 'ci-e2e-user-b@example.test')
    expect((await userB.get(`/api/apps/${app.id}`)).status()).toBe(404)
})
```

Add API Key cases through the public API endpoint: missing, random, inactive, and expired keys must be rejected; a valid key must only execute its own published app.

- [ ] **Step 5: Add explicit security gap reporting**

Create `security-gap-report.spec.ts` that writes `tests/.artifacts/security-gaps.json` with entries for SSRF, rate limit, and CORS. Each entry contains an ID, severity, route/component, current status `not_implemented`, and the target assertion to enable after OPT-002/003/008. The test passes only when the report is generated and contains no secret values.

- [ ] **Step 6: Run integration and security suites**

Run:

```bash
WORKFLOW_BASE_URL=http://127.0.0.1:3000 pnpm test:integration
WORKFLOW_BASE_URL=http://127.0.0.1:3000 pnpm test:security
```

Expected: existing authentication/ownership/API-key tests pass; the gap report is generated and lists only the three explicitly deferred controls.

### Task 4: Add Playwright browser smoke flows

**Files:**

- Create: `tests/e2e/auth.spec.ts`
- Create: `tests/e2e/workflow.spec.ts`
- Create: `tests/e2e/knowledge.spec.ts`
- Create: `tests/support/ui-fixtures.ts`
- Modify: `playwright.config.ts`

**Interfaces:**

- `ui-fixtures.ts` exports a logged-in `userPage` fixture and `loginAs(page, email)` helper.
- Tests use roles, labels, accessible names, and stable `data-testid` values only.
- Each test uses the `ci-e2e-` prefix and removes created resources through the API fixture in teardown.

- [ ] **Step 1: Write the login smoke test**

Create a test that opens `/account/login`, fills the seeded user, submits, asserts navigation to the authenticated home page, reloads, and logs out. Use the exact visible field labels already present in the page; if a control lacks an accessible name, add a stable `data-testid` in the smallest UI change.

- [ ] **Step 2: Run the login test to verify it fails**

Run:

```bash
pnpm exec playwright test --project=e2e tests/e2e/auth.spec.ts
```

Expected: FAIL until the application server, seed, and fixture are available.

- [ ] **Step 3: Implement the authenticated fixture and login flow**

Keep credentials in environment variables or the test seed helper; do not hard-code a production credential. Configure failure trace and screenshot collection through `playwright.config.ts`.

- [ ] **Step 4: Add workflow publish/run smoke**

Create an app through the UI, save a minimal Start → End workflow, publish, and invoke the public run endpoint. Assert the execution reaches success and the response does not contain credentials. If the editor cannot expose stable accessible selectors, add `data-testid` to the relevant controls and document why.

- [ ] **Step 5: Add knowledge base smoke**

Create a knowledge base, upload a small `.txt` fixture under `tests/fixtures/knowledge.txt`, poll the document status until `COMPLETED` with a maximum of 30 seconds, run a search, and assert the seeded phrase is present. A timeout must fail with the last document status and service URLs.

- [ ] **Step 6: Run all browser flows**

Run:

```bash
pnpm exec playwright test --project=e2e
```

Expected: auth, workflow, and knowledge smoke flows pass with no console errors or leaked secrets in captured artifacts.

### Task 5: Add configurable load smoke

**Files:**

- Create: `tests/load/load-smoke.mjs`
- Create: `tests/load/load-smoke.test.mjs`
- Create: `tests/load/README.md`
- Modify: `package.json`

**Interfaces:**

- `node tests/load/load-smoke.mjs` accepts `LOAD_URL`, `LOAD_DURATION_MS`, `LOAD_CONCURRENCY`, and `LOAD_MAX_ERROR_RATE`.
- It reports request count, success/error count, p50/p95 latency, and exits nonzero when the configured error-rate budget is exceeded.

- [ ] **Step 1: Write the load harness contract test**

Test the pure summary function with synthetic durations and status codes before implementing the HTTP loop. It must calculate p50/p95 deterministically and reject invalid concurrency/duration values.

- [ ] **Step 2: Run the contract test to verify it fails**

Run:

```bash
node --test tests/load/load-smoke.test.mjs
```

Expected: FAIL because the summary module does not exist.

- [ ] **Step 3: Implement the bounded native-fetch harness**

Use only Node’s built-in `fetch`, `AbortSignal.timeout`, and a fixed worker pool. Default to `GET ${LOAD_URL}` and never print response bodies, cookies, or authorization headers.

- [ ] **Step 4: Verify local load smoke**

Run:

```bash
LOAD_URL=http://127.0.0.1:3000/account/login LOAD_DURATION_MS=5000 LOAD_CONCURRENCY=4 pnpm test:load
```

Expected: a summary with p50/p95 and a zero or below-budget error rate.

### Task 6: Add GitHub Actions workflow and diagnostics

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/load-smoke.yml`
- Create: `tests/support/wait-for-services.mjs`
- Create: `tests/support/wait-for-services.test.mjs`
- Create: `docs/testing.md`

**Interfaces:**

- `wait-for-services.mjs` waits for PostgreSQL, Qdrant, fake Ollama, Workflow, and WebApp with bounded retries and nonzero exit on timeout.
- `ci.yml` has `quality`, `integration`, `security`, and `e2e` jobs; PRs run all blocking jobs.
- `load-smoke.yml` is `workflow_dispatch` plus a scheduled job and uploads its summary.

- [ ] **Step 1: Write service-waiter tests**

Test the waiter’s retry/timeout decision function with a successful sequence and a timeout sequence before connecting it to sockets.

- [ ] **Step 2: Run waiter tests to verify they fail**

Run:

```bash
node --test tests/support/wait-for-services.test.mjs
```

Expected: FAIL because the waiter module does not exist.

- [ ] **Step 3: Implement the workflow jobs**

Use `actions/checkout`, `pnpm/action-setup`, `actions/setup-node` with Node 22, `pnpm install --frozen-lockfile`, and the project commands. Start test Compose before integration/security/E2E, run Prisma migration and seed, and set test-only environment variables at job scope. Do not expose `.env` contents in logs.

- [ ] **Step 4: Add artifact upload and cleanup**

Use `if: always()` to upload `playwright-report`, `test-results`, `tests/.artifacts`, and container logs. Always run `docker compose -f docker/docker-compose.test.yml down -v` in a cleanup step.

- [ ] **Step 5: Document local commands and CI boundaries**

`docs/testing.md` must include the exact commands for unit, integration, security, E2E, and load runs; required local services; test-only environment variables by name; artifact locations; and the three deferred security controls.

- [ ] **Step 6: Validate workflow syntax and local parity**

Run:

```bash
pnpm test
pnpm exec playwright test --list
pnpm spellcheck
pnpm lint
pnpm typecheck
pnpm build
git diff --check
```

Expected: root unit commands, Playwright discovery, spellcheck, lint, typecheck and build pass; the workflow only references commands that exist locally.

### Task 7: Update OPT-018 status and perform final verification

**Files:**

- Modify: `docs/project-optimization-checklist.md`
- Modify: `docs/superpowers/specs/2026-09-30-opt-018-ci-e2e-security-baseline-design.md`

- [ ] **Step 1: Record evidence before changing status**

Collect the final job names, test counts, E2E flow names, service versions, and known `fixme` controls from CI/local output. Do not mark OPT-018 complete if a blocking suite was skipped or if a service failed to start.

- [ ] **Step 2: Update the checklist accurately**

Mark only the completed sub-items. Keep OPT-002/003/008 as pending if their underlying protections remain unimplemented. Add the exact local command and CI workflow path as evidence.

- [ ] **Step 3: Run the final verification matrix**

Run:

```bash
pnpm test
pnpm test:integration
pnpm test:security
pnpm test:e2e
pnpm spellcheck
pnpm lint
pnpm typecheck
pnpm build
git diff --check
git status --short --branch
```

Expected: all blocking commands exit 0; security gap report contains only the explicitly deferred controls; the final status lists every uncommitted file and no generated secrets.
