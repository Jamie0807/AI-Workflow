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
