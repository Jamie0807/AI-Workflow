import net from 'node:net'
import { pathToFileURL } from 'node:url'

const DEFAULT_ATTEMPTS = 60
const DEFAULT_DELAY_MS = 1_000
const REQUEST_TIMEOUT_MS = 2_000

export async function waitForReady(check, options = {}) {
    const attempts = options.attempts ?? DEFAULT_ATTEMPTS
    const delayMs = options.delayMs ?? DEFAULT_DELAY_MS
    const sleep = options.sleep ?? (duration => new Promise(resolve => setTimeout(resolve, duration)))
    if (!Number.isInteger(attempts) || attempts <= 0) throw new Error('attempts must be a positive integer')
    if (!Number.isInteger(delayMs) || delayMs < 0) throw new Error('delayMs must be a non-negative integer')

    let lastError
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            if (await check()) return { attempts: attempt }
        } catch (error) {
            lastError = error
        }
        if (attempt < attempts) await sleep(delayMs)
    }

    const suffix = lastError instanceof Error ? `: ${lastError.message}` : ''
    throw new Error(`service did not become ready after ${attempts} attempts${suffix}`)
}

function tcpReady(host, port) {
    return new Promise(resolve => {
        const socket = net.createConnection({ host, port })
        const finish = ready => {
            socket.destroy()
            resolve(ready)
        }
        socket.setTimeout(REQUEST_TIMEOUT_MS)
        socket.once('connect', () => finish(true))
        socket.once('timeout', () => finish(false))
        socket.once('error', () => finish(false))
    })
}

async function httpReady(url) {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
        await response.body?.cancel()
        return response.status >= 200 && response.status < 500
    } catch {
        return false
    }
}

function asUrl(value, fallback) {
    return (value || fallback).replace(/\/$/, '')
}

export function createServiceChecks(env = process.env) {
    const qdrantUrl = asUrl(env.TEST_QDRANT_URL || env.QDRANT_URL, 'http://127.0.0.1:6335')
    const ollamaUrl = asUrl(env.TEST_OLLAMA_URL || env.OLLAMA_BASE_URL, 'http://127.0.0.1:11434')
    const workflowUrl = asUrl(env.WORKFLOW_BASE_URL, 'http://127.0.0.1:3000')
    const webappUrl = asUrl(env.WEBAPP_BASE_URL, 'http://127.0.0.1:3001')
    const postgresHost = env.TEST_DATABASE_HOST || '127.0.0.1'
    const postgresPort = Number(env.TEST_DATABASE_PORT || 5434)

    return {
        postgres: () => tcpReady(postgresHost, postgresPort),
        qdrant: () => httpReady(`${qdrantUrl}/readyz`),
        ollama: () => httpReady(`${ollamaUrl}/api/tags`),
        workflow: () => httpReady(`${workflowUrl}/account/login`),
        webapp: () => httpReady(`${webappUrl}/`),
    }
}

export async function waitForServices(env = process.env) {
    const checks = createServiceChecks(env)
    const status = Object.fromEntries(Object.keys(checks).map(name => [name, false]))
    const checkAll = async () => {
        await Promise.all(
            Object.entries(checks).map(async ([name, check]) => {
                status[name] = await check()
            })
        )
        return Object.values(status).every(Boolean)
    }

    try {
        return await waitForReady(checkAll, {
            attempts: Number(env.SERVICE_ATTEMPTS || DEFAULT_ATTEMPTS),
            delayMs: Number(env.SERVICE_DELAY_MS || DEFAULT_DELAY_MS),
        })
    } catch (error) {
        const unavailable = Object.entries(status)
            .filter(([, ready]) => !ready)
            .map(([name]) => name)
            .join(', ')
        throw new Error(`${error.message}; unavailable: ${unavailable || 'unknown'}`)
    }
}

const invokedPath = process.argv[1] && pathToFileURL(process.argv[1]).href
if (invokedPath === import.meta.url) {
    waitForServices()
        .then(({ attempts }) => console.log(`services ready after ${attempts} attempt${attempts === 1 ? '' : 's'}`))
        .catch(error => {
            console.error(`service readiness failed: ${error.message}`)
            process.exitCode = 1
        })
}
