import test from 'node:test'
import assert from 'node:assert/strict'

import { parseLoadConfig, summarizeResults } from './load-smoke.mjs'

test('summarizes request counts, error rate, and nearest-rank latency percentiles', () => {
    const summary = summarizeResults([
        { durationMs: 100, status: 200 },
        { durationMs: 20, status: 500 },
        { durationMs: 300, status: 201 },
        { durationMs: 40, status: 204 },
    ])

    assert.deepEqual(summary, {
        requests: 4,
        successes: 3,
        errors: 1,
        errorRate: 0.25,
        p50Ms: 40,
        p95Ms: 300,
    })
})

test('returns an empty summary without inventing latency values', () => {
    assert.deepEqual(summarizeResults([]), {
        requests: 0,
        successes: 0,
        errors: 0,
        errorRate: 0,
        p50Ms: null,
        p95Ms: null,
    })
})

test('rejects non-positive duration and concurrency values', () => {
    assert.throws(() => parseLoadConfig({ LOAD_DURATION_MS: '0', LOAD_CONCURRENCY: '1' }), /LOAD_DURATION_MS/)
    assert.throws(() => parseLoadConfig({ LOAD_DURATION_MS: '1000', LOAD_CONCURRENCY: '0' }), /LOAD_CONCURRENCY/)
    assert.throws(() => parseLoadConfig({ LOAD_DURATION_MS: '1000', LOAD_CONCURRENCY: 'abc' }), /LOAD_CONCURRENCY/)
})
