import { pathToFileURL } from 'node:url'

const DEFAULT_LOAD_URL = 'http://127.0.0.1:3000/account/login'
const DEFAULT_DURATION_MS = 10_000
const DEFAULT_CONCURRENCY = 4
const DEFAULT_MAX_ERROR_RATE = 0
const REQUEST_TIMEOUT_MS = 5_000

function parsePositiveInteger(value, name, fallback) {
    const parsed = value === undefined || value === '' ? fallback : Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${name} must be a positive integer`)
    }
    return parsed
}

function parseErrorRate(value, name, fallback) {
    const parsed = value === undefined || value === '' ? fallback : Number(value)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
        throw new Error(`${name} must be a number between 0 and 1`)
    }
    return parsed
}

export function parseLoadConfig(env = process.env) {
    const url = env.LOAD_URL || DEFAULT_LOAD_URL
    try {
        new URL(url)
    } catch {
        throw new Error('LOAD_URL must be a valid URL')
    }

    return {
        url,
        durationMs: parsePositiveInteger(env.LOAD_DURATION_MS, 'LOAD_DURATION_MS', DEFAULT_DURATION_MS),
        concurrency: parsePositiveInteger(env.LOAD_CONCURRENCY, 'LOAD_CONCURRENCY', DEFAULT_CONCURRENCY),
        maxErrorRate: parseErrorRate(env.LOAD_MAX_ERROR_RATE, 'LOAD_MAX_ERROR_RATE', DEFAULT_MAX_ERROR_RATE),
    }
}

function percentile(values, quantile) {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const rank = Math.max(1, Math.ceil(quantile * sorted.length))
    return sorted[rank - 1]
}

export function summarizeResults(results) {
    const durations = results.map(result => result.durationMs)
    const successes = results.filter(result => result.status !== null && result.status >= 200 && result.status < 400).length
    const requests = results.length
    const errors = requests - successes

    return {
        requests,
        successes,
        errors,
        errorRate: requests === 0 ? 0 : errors / requests,
        p50Ms: percentile(durations, 0.5),
        p95Ms: percentile(durations, 0.95),
    }
}

export async function runLoad(config, fetchImpl = fetch) {
    const deadline = Date.now() + config.durationMs
    const results = []

    async function worker() {
        while (Date.now() < deadline) {
            const startedAt = performance.now()
            let status = null
            try {
                const response = await fetchImpl(config.url, {
                    method: 'GET',
                    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                })
                status = response.status
                await response.body?.cancel()
            } catch {
                // The summary only needs to distinguish failed requests; do not expose response data or headers.
            } finally {
                results.push({ durationMs: Math.round(performance.now() - startedAt), status })
            }
        }
    }

    await Promise.all(Array.from({ length: config.concurrency }, worker))
    return summarizeResults(results)
}

export async function main(env = process.env, fetchImpl = fetch) {
    const config = parseLoadConfig(env)
    const summary = await runLoad(config, fetchImpl)

    console.log(
        JSON.stringify({
            url: config.url,
            durationMs: config.durationMs,
            concurrency: config.concurrency,
            maxErrorRate: config.maxErrorRate,
            ...summary,
        })
    )

    if (summary.errorRate > config.maxErrorRate) {
        throw new Error(`error rate ${summary.errorRate} exceeded budget ${config.maxErrorRate}`)
    }

    return summary
}

const invokedPath = process.argv[1] && pathToFileURL(process.argv[1]).href
if (invokedPath === import.meta.url) {
    main().catch(error => {
        console.error(`load smoke failed: ${error.message}`)
        process.exitCode = 1
    })
}
