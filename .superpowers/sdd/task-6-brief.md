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
