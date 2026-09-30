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
