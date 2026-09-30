const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1'])

const defaults = {
    baseUrl: 'http://127.0.0.1:3000',
    databaseUrl: 'postgresql://ci:ci@127.0.0.1:5434/ai_workflow_test',
    qdrantUrl: 'http://127.0.0.1:6335',
    ollamaUrl: 'http://127.0.0.1:11434',
}

function rejectProductionMode() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Test environment cannot run with NODE_ENV=production')
    }
}

function safeHttpUrl(name, value) {
    let parsed
    try {
        parsed = new URL(value)
    } catch {
        throw new Error(`${name} must be a valid URL`)
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || !LOCAL_HOSTS.has(parsed.hostname)) {
        throw new Error(`${name} must point to a local test service`)
    }
    if (parsed.username || parsed.password) {
        throw new Error(`${name} must not contain credentials`)
    }
    return parsed.toString().replace(/\/$/, '')
}

function safeDatabaseUrl(value) {
    let parsed
    try {
        parsed = new URL(value)
    } catch {
        throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL')
    }

    if (parsed.protocol !== 'postgresql:' || !LOCAL_HOSTS.has(parsed.hostname)) {
        throw new Error('TEST_DATABASE_URL must point to a local PostgreSQL test service')
    }
    if (parsed.username !== 'ci' || parsed.password !== 'ci' || parsed.port !== '5434' || parsed.pathname !== '/ai_workflow_test') {
        throw new Error('TEST_DATABASE_URL must use the dedicated ci test database')
    }
    return parsed.toString()
}

rejectProductionMode()

export const TEST_BASE_URL = safeHttpUrl('TEST_BASE_URL', process.env.TEST_BASE_URL ?? defaults.baseUrl)
export const TEST_DATABASE_URL = safeDatabaseUrl(process.env.TEST_DATABASE_URL ?? defaults.databaseUrl)
export const TEST_QDRANT_URL = safeHttpUrl('TEST_QDRANT_URL', process.env.TEST_QDRANT_URL ?? defaults.qdrantUrl)
export const TEST_OLLAMA_URL = safeHttpUrl('TEST_OLLAMA_URL', process.env.TEST_OLLAMA_URL ?? defaults.ollamaUrl)

export function assertTestEnvironment() {
    rejectProductionMode()
    return {
        TEST_BASE_URL,
        TEST_DATABASE_URL,
        TEST_QDRANT_URL,
        TEST_OLLAMA_URL,
    }
}
