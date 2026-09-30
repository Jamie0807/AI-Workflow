import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    outputDir: 'tests/.artifacts/playwright',
    preserveOutput: 'failures-only',
    maxFailures: process.env.CI ? 1 : 0,
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
        {
            name: 'e2e',
            use: { ...devices['Desktop Chrome'] },
            testMatch: /tests\/e2e\/.+\.spec\.ts/,
            workers: 1,
        },
    ],
})
