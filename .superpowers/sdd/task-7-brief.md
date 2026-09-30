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
