# Testing baseline

OPT-018 keeps the local commands and CI entry points identical. CI uses Node 22, a test-only PostgreSQL/Qdrant Compose file, and the repository fake Ollama service. It never reads `.env` files or contacts a real Ollama instance, SMTP service, or production database.

## Local prerequisites

- Node.js 22 and pnpm 9.12.3.
- Docker with Compose v2.
- Test services started with `docker compose -f docker/docker-compose.test.yml up -d --wait`.
- A Workflow server on `http://127.0.0.1:3000`, an API server on `http://127.0.0.1:3101` for security/E2E, and the fake Ollama server on `http://127.0.0.1:11435` when running locally.

Prepare the database and deterministic users before integration, security, or E2E tests:

```bash
DATABASE_URL=postgresql://ci:ci@127.0.0.1:5434/ai_workflow_test \
  pnpm --filter @ai-workflow/workflow exec prisma migrate deploy
DATABASE_URL=postgresql://ci:ci@127.0.0.1:5434/ai_workflow_test \
  NODE_ENV=test pnpm test:prepare
```

The relevant test-only environment variable names are `NODE_ENV`, `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `QDRANT_URL`, `TEST_QDRANT_URL`, `OLLAMA_BASE_URL`, `TEST_OLLAMA_URL`, `WORKFLOW_BASE_URL`, and `API_SERVER_BASE_URL`. Use only the values from the test Compose setup; never point these commands at production resources.

## Commands

```bash
pnpm test
WORKFLOW_BASE_URL=http://127.0.0.1:3000 pnpm test:integration
WORKFLOW_BASE_URL=http://127.0.0.1:3000 API_SERVER_BASE_URL=http://127.0.0.1:3101 pnpm test:security
WORKFLOW_BASE_URL=http://127.0.0.1:3000 API_SERVER_BASE_URL=http://127.0.0.1:3101 pnpm test:e2e
LOAD_URL=http://127.0.0.1:3000/account/login LOAD_DURATION_MS=5000 LOAD_CONCURRENCY=4 pnpm test:load
```

`node tests/support/wait-for-services.mjs` performs bounded readiness checks for PostgreSQL, Qdrant, fake Ollama, Workflow, and WebApp. If a service does not become ready, the command exits nonzero.

## Artifacts and deferred controls

Playwright writes traces, screenshots, videos, and reports under `tests/.artifacts/playwright`, `test-results`, and `playwright-report`. The seed manifest and security gap report are under `tests/.artifacts`; they contain IDs and statuses only, never passwords or tokens. CI uploads these paths and container logs on every test job, including failures.

The security suite deliberately reports these controls as deferred until their dedicated OPT work lands:

- OPT-002 SSRF protection.
- OPT-003 rate limiting.
- OPT-008 CORS policy.

The gap report is a visible baseline, not a passing assertion that those protections already exist.
