import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const moduleUrl = new URL('../support/test-env.mjs', import.meta.url).href

function runWithEnvironment(overrides = {}) {
    const environment = { ...process.env, NODE_ENV: 'test', ...overrides }
    for (const key of ['TEST_BASE_URL', 'TEST_DATABASE_URL', 'TEST_QDRANT_URL', 'TEST_OLLAMA_URL']) {
        if (!(key in overrides)) delete environment[key]
    }

    const code = `import(${JSON.stringify(moduleUrl)}).then(({ TEST_BASE_URL }) => console.log(TEST_BASE_URL))`
    return spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        cwd: process.cwd(),
        env: environment,
        encoding: 'utf8',
    })
}

test('test environment defaults to local-only service endpoints', () => {
    const result = runWithEnvironment()

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /127\.0\.0\.1/)
})

test('test environment rejects production mode', () => {
    const result = runWithEnvironment({ NODE_ENV: 'production' })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /NODE_ENV=production/)
})

test('test environment rejects public service endpoints', () => {
    const result = runWithEnvironment({ TEST_BASE_URL: 'https://example.com' })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /local test service/)
})
