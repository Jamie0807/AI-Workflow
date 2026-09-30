# Task 1 focused review package

Base: 2d8b9c4; working tree (no commit)

## package.json diff

diff --git a/apps/workflow/package.json b/apps/workflow/package.json
index 1f3b92d..2898257 100644
--- a/apps/workflow/package.json
+++ b/apps/workflow/package.json
@@ -7,6 +7,7 @@
"build": "next build",
"start": "next start",
"typecheck": "tsc --noEmit",

-        "test:seed": "tsx scripts/test-seed.ts",
           "test:user-settings": "node --test --experimental-strip-types lib/user-settings.test.mjs",
           "evaluate:rag": "../../packages/ai-engine/node_modules/.bin/tsx scripts/evaluate-rag.ts",
           "analyze:rag": "../../packages/ai-engine/node_modules/.bin/tsx scripts/analyze-rag.ts",
    @@ -86,6 +87,7 @@
    "dotenv": "^16.4.5",
    "postcss": "^8.5.6",
    "tailwindcss": "4.1.18",
-        "tsx": "^4.8.1",
           "tw-animate-css": "^1.4.0"
       }
    }
    diff --git a/package.json b/package.json
    index 1c84063..52fdc25 100644
    --- a/package.json
    +++ b/package.json
    @@ -5,6 +5,12 @@
    "main": "index.js",
    "packageManager": "pnpm@9.12.3",
    "scripts": {
-        "test": "pnpm --filter @ai-workflow/ai-engine test && pnpm --filter @ai-workflow/workflow test:user-settings && node --test tests/unit/*.mjs",
-        "test:integration": "playwright test --project=integration",
-        "test:e2e": "playwright test --project=e2e",
-        "test:security": "playwright test --project=security",
-        "test:load": "node tests/load/load-smoke.mjs",
-        "test:prepare": "pnpm --filter @ai-workflow/workflow test:seed",
           "build:watch": "turbo build:watch",
           "build": "turbo build",
           "dev": "turbo dev",
    @@ -47,6 +53,7 @@
    ]
    },
    "devDependencies": {
-        "@playwright/test": "^1.51.1",
         "@types/node": "22.9.0",
         "eslint": "9.39.1",
         "@eslint/js": "9.39.1",

## playwright.config.ts

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

## command contract test

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

## lockfile relevant entries

17- '@eslint/js':
18- specifier: 9.39.1
19- version: 9.39.1
20: '@playwright/test':
21- specifier: ^1.51.1
22- version: 1.63.0
23- '@types/node':
24- specifier: 22.9.0
25- version: 22.9.0
26- commitizen:
27- specifier: 4.3.1
28- version: 4.3.1(@types/node@22.9.0)(typescript@5.9.3)
--
170- version: 0.555.0(react@19.2.0)
171- next:
172- specifier: 16.1.1
173: version: 16.1.1(@babel/core@7.26.0)(@playwright/test@1.63.0)(react-dom@19.2.0(react@19.2.0))(react@19.2.0)
174- pg:
175- specifier: ^8.16.3
176- version: 8.16.3
177- prisma:
178- specifier: ^7.2.0
179- version: 7.2.0(@types/react@19.2.7)(react-dom@19.2.0(react@19.2.0))(react@19.2.0)(typescript@5.9.3)
180- react:
181- specifier: 19.2.0
--
351- version: 0.555.0(react@19.2.0)
352- next:
353- specifier: 16.1.1
354: version: 16.1.1(@babel/core@7.26.0)(@playwright/test@1.63.0)(react-dom@19.2.0(react@19.2.0))(react@19.2.0)
355- next-themes:
356- specifier: ^0.4.6
357- version: 0.4.6(react-dom@19.2.0(react@19.2.0))(react@19.2.0)
358- nodemailer:
359- specifier: ^7.0.12
360- version: 7.0.12
361- pg:
362- specifier: ^8.16.3
--
425- tailwindcss:
426- specifier: 4.1.18
427- version: 4.1.18
428: tsx:
429- specifier: ^4.8.1
430- version: 4.21.0
431- tw-animate-css:
432- specifier: ^1.4.0
433- version: 1.4.0
434-
435- packages/ai-engine:
436- dependencies:
--
450- specifier: ^3.25.76
451- version: 3.25.76
452- devDependencies:
453: tsx:
454- specifier: ^4.19.2
455- version: 4.21.0
456- vitest:
457- specifier: ^4.0.16
458- version: 4.0.16(@types/node@22.19.3)(jiti@2.6.1)(lightningcss@1.30.2)(terser@5.44.1)(tsx@4.21.0)(yaml@2.8.2)
459-
460-packages:
461-
--
2013- resolution: {integrity: sha512-QNqXyfVS2wm9hweSYD2O7F0G06uurj9kZ96TRQE5Y9hU7+tgdZwIkbAKc5Ocy1HxEY2kuDQa6cQ1WRs/O5LFKA==}
2014- engines: {node: ^12.20.0 || ^14.18.0 || >=16.0.0}
2015-
2016: '@playwright/test@1.63.0':
2017- resolution: {integrity: sha512-oxMK4vllB9RK5NQ2l1pq1IfOf2AvnEuj/vYGDj0H2nMtmtZpKtCwt/l00GEO6xjGfpBNAvjovvYdCm50dRQkpQ==}
2018- engines: {node: '>=20'}
2019- hasBin: true
2020-
2021- '@prisma/adapter-pg@7.2.0':
2022- resolution: {integrity: sha512-euIdQ13cRB2wZ3jPsnDnFhINquo1PYFPCg6yVL8b2rp3EdinQHsX9EDdCtRr489D5uhphcRk463OdQAFlsCr0w==}
2023-
2024- '@prisma/client-runtime-utils@7.2.0':
--
5782- hasBin: true
5783- peerDependencies:
5784- '@opentelemetry/api': ^1.1.0
5785: '@playwright/test': ^1.51.1
5786- babel-plugin-react-compiler: '\*'
5787- react: ^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0
5788- react-dom: ^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0
5789- sass: ^1.3.0
5790- peerDependenciesMeta:
5791- '@opentelemetry/api':
5792- optional: true
5793: '@playwright/test':
5794- optional: true
5795- babel-plugin-react-compiler:
5796- optional: true
5797- sass:
5798- optional: true
5799-
5800- node-abort-controller@3.1.1:
5801- resolution: {integrity: sha512-AGK2yQKIjRuqnc6VkX2Xj5d+QW8xZ87pa1UK6yA6ouUyuxfHuMP6umE5QK7UmTeOAymo+Zx1Fxiuw9rVx8taHQ==}
--
6061- pkg-types@2.3.0:
6062- resolution: {integrity: sha512-SIqCzDRg0s9npO5XQ3tNZioRY1uK06lA41ynBC1YmFTmnY6FjUjVt6s4LoADmwoig1qqD0oK8h1p/8mlMx8Oig==}
6063-
6064: playwright-core@1.63.0:
6065- resolution: {integrity: sha512-rYCsBF/M5HjUch52bbtVONEFjv6Xu8sm8h72dNlR5bzIE1fvC/bxgspzkjSfU+MweEMmPM8KJebG6nnyxo5mCg==}
6066- engines: {node: '>=20'}
6067- hasBin: true
6068-
6069: playwright@1.63.0:
6070- resolution: {integrity: sha512-+7ziBLidS4NaNCdt57SUDT+wYmmd5fmiQejUic/kb+YsYSCPyOOE9sebzMjNmQrsnNpDJqd4WHvV/8lfKfUDUg==}
6071- engines: {node: '>=20'}
6072- hasBin: true
6073-
6074- pluralize@8.0.0:
6075- resolution: {integrity: sha512-Nc3IT5yHzflTfbjgqWcCPpo7DaKy4FnpB0l/zCAW0Tc7jxAiuqSxHasntB3D7887LSrA93kDJ9IXovxJYxyLCA==}
6076- engines: {node: '>=4'}
6077-
--
6085- peerDependencies:
6086- jiti: '>=1.21.0'
6087- postcss: '>=8.0.9'
6088: tsx: ^4.8.1
6089- yaml: ^2.4.2
6090- peerDependenciesMeta:
6091- jiti:
6092- optional: true
6093- postcss:
6094- optional: true
6095: tsx:
6096- optional: true
6097- yaml:
6098- optional: true
6099-
6100- postcss@8.4.31:
6101- resolution: {integrity: sha512-PS08Iboia9mts/2ygV3eLpY5ghnUcfLV/EXTOW1E2qYxJKGGBUtNjN76FYHnMs36RmARn41bC0AZmn+rR0OVpQ==}
6102- engines: {node: ^10 || ^12 || >=14}
6103-
--
7096- stylus: '>=0.54.8'
7097- sugarss: ^5.0.0
7098- terser: ^5.16.0
7099: tsx: ^4.8.1
7100- yaml: ^2.4.2
7101- peerDependenciesMeta:
7102- '@types/node':
7103- optional: true
7104- jiti:
7105- optional: true
7106- less:
7107- optional: true
--
7117- optional: true
7118- terser:
7119- optional: true
7120: tsx:
7121- optional: true
7122- yaml:
7123- optional: true
7124-
7125- vitest@4.0.16:
7126- resolution: {integrity: sha512-E4t7DJ9pESL6E3I8nFjPa4xGUd3PmiWDLsDztS2qXSJWfHtbQnwAWylaBvSNY48I3vr8PTqIZlyK8TE3V3CA4Q==}
7127- engines: {node: ^20.0.0 || ^22.0.0 || >=24.0.0}
7128- hasBin: true
--
9065-
9066- '@pkgr/core@0.2.9': {}
9067-
9068: '@playwright/test@1.63.0':
9069- dependencies:
9070- playwright: 1.63.0
9071-
9072- '@prisma/adapter-pg@7.2.0':
9073- dependencies:
9074- '@prisma/driver-adapter-utils': 7.2.0
9075- pg: 8.16.3
9076- postgres-array: 3.0.4
--
13170- react: 19.2.0
13171- react-dom: 19.2.0(react@19.2.0)
13172-
13173: next@16.1.1(@babel/core@7.26.0)(@playwright/test@1.63.0)(react-dom@19.2.0(react@19.2.0))(react@19.2.0):
