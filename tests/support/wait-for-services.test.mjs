import test from 'node:test'
import assert from 'node:assert/strict'

import { waitForReady } from './wait-for-services.mjs'

test('retries until the service becomes ready', async () => {
    const states = [false, false, true]
    let checks = 0

    const result = await waitForReady(
        async () => {
            checks += 1
            return states.shift()
        },
        { attempts: 3, delayMs: 0, sleep: async () => {} }
    )

    assert.deepEqual(result, { attempts: 3 })
    assert.equal(checks, 3)
})

test('fails with a bounded timeout after the configured attempts', async () => {
    await assert.rejects(
        waitForReady(async () => false, { attempts: 2, delayMs: 0, sleep: async () => {} }),
        /did not become ready after 2 attempts/
    )
})
