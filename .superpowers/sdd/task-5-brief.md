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
