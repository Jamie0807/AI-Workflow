import type { APIRequestContext, APIResponse } from '@playwright/test'

type RequestOptions = NonNullable<Parameters<APIRequestContext['get']>[1]>

export interface AuthenticatedApi {
    readonly context: APIRequestContext
    get(url: string, options?: RequestOptions): Promise<APIResponse>
    post(url: string, options?: RequestOptions): Promise<APIResponse>
    put(url: string, options?: RequestOptions): Promise<APIResponse>
    delete(url: string, options?: RequestOptions): Promise<APIResponse>
}

export interface SeedUser {
    email: string
    password: string
}

export const TEST_USERS = {
    a: { email: 'ci-e2e-user-a@example.test', password: 'ci-e2e-password-a' },
    b: { email: 'ci-e2e-user-b@example.test', password: 'ci-e2e-password-b' },
} as const satisfies Record<'a' | 'b', SeedUser>

function requestOptions(options: RequestOptions | undefined, cookie: string): RequestOptions {
    return {
        ...options,
        headers: {
            ...(options?.headers as Record<string, string> | undefined),
            Cookie: cookie,
        },
    }
}

async function responsePayload(response: APIResponse): Promise<Record<string, unknown>> {
    const payload = (await response.json()) as unknown
    if (!payload || typeof payload !== 'object') throw new Error('API returned a non-object JSON response')
    return payload as Record<string, unknown>
}

async function requireSuccess(response: APIResponse, operation: string): Promise<Record<string, unknown>> {
    const payload = await responsePayload(response)
    if (!response.ok()) {
        throw new Error(`${operation} failed with HTTP ${response.status()}: ${JSON.stringify(payload)}`)
    }
    return payload
}

function dataOf(payload: Record<string, unknown>, operation: string): Record<string, unknown> {
    const data = payload.data
    if (!data || typeof data !== 'object') throw new Error(`${operation} returned no data object`)
    return data as Record<string, unknown>
}

function idOf(payload: Record<string, unknown>, operation: string): string {
    const id = dataOf(payload, operation).id
    if (typeof id !== 'string' || id.length === 0) throw new Error(`${operation} returned no resource id`)
    return id
}

export async function requestAsUser(request: APIRequestContext, email: string, password: string): Promise<AuthenticatedApi> {
    const login = await request.post('/api/auth/login', { data: { email, password } })
    if (!login.ok()) {
        const body = await login.text()
        throw new Error(`Login failed for ${email} with HTTP ${login.status()}: ${body}`)
    }

    const setCookie = login.headers()['set-cookie']
    const authCookie = setCookie?.match(/(?:^|,\s*)auth-token=([^;]+)/)?.[0]
    if (!authCookie) throw new Error(`Login for ${email} did not return an auth-token cookie`)

    return {
        context: request,
        get: (url, options) => request.get(url, requestOptions(options, authCookie)),
        post: (url, options) => request.post(url, requestOptions(options, authCookie)),
        put: (url, options) => request.put(url, requestOptions(options, authCookie)),
        delete: (url, options) => request.delete(url, requestOptions(options, authCookie)),
    }
}

export async function createApp(api: AuthenticatedApi, name: string): Promise<{ id: string; name: string }> {
    const response = await api.post('/api/apps', {
        data: { name, description: 'OPT-018 test app', type: 'workflow', tags: ['ci-e2e'] },
    })
    const payload = await requireSuccess(response, 'create app')
    const data = dataOf(payload, 'create app')
    return { id: idOf(payload, 'create app'), name: String(data.name ?? name) }
}

export async function createKnowledgeBase(api: AuthenticatedApi, name: string): Promise<{ id: string; name: string }> {
    const response = await api.post('/api/knowledge', {
        data: { name, description: 'OPT-018 test knowledge base', icon: '🧪' },
    })
    const payload = await requireSuccess(response, 'create knowledge base')
    const data = dataOf(payload, 'create knowledge base')
    return { id: idOf(payload, 'create knowledge base'), name: String(data.name ?? name) }
}

export async function uploadDocument(api: AuthenticatedApi, knowledgeBaseId: string, name = 'ci-e2e-document.md') {
    const response = await api.post(`/api/knowledge/${knowledgeBaseId}/documents`, {
        multipart: {
            file: {
                name,
                mimeType: 'text/markdown',
                buffer: Buffer.from('# CI E2E\nA deterministic document for OPT-018 integration tests.'),
            },
        },
    })
    const payload = await requireSuccess(response, 'upload document')
    return { id: idOf(payload, 'upload document'), payload }
}

export async function saveWorkflow(api: AuthenticatedApi, appId: string) {
    const response = await api.post(`/api/apps/${appId}/workflow`, {
        data: {
            nodes: [
                { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start', config: { inputs: [] } } },
                { id: 'end', type: 'end', position: { x: 240, y: 0 }, data: { label: 'End', config: { outputs: [] } } },
            ],
            edges: [{ id: 'start-end', source: 'start', target: 'end' }],
        },
    })
    await requireSuccess(response, 'save workflow')
}

export async function publishApp(api: AuthenticatedApi, appId: string): Promise<{ publishedAppId: string }> {
    const response = await api.post(`/api/apps/${appId}/publish`)
    const payload = await requireSuccess(response, 'publish app')
    const publishedAppId = dataOf(payload, 'publish app').publishedAppId
    if (typeof publishedAppId !== 'string') throw new Error('publish app returned no publishedAppId')
    return { publishedAppId }
}

export async function createApiKey(api: AuthenticatedApi, appId: string, name: string) {
    const response = await api.post(`/api/apps/${appId}/api-keys`, { data: { name } })
    const payload = await requireSuccess(response, 'create API key')
    const data = dataOf(payload, 'create API key')
    if (typeof data.id !== 'string' || typeof data.key !== 'string') throw new Error('create API key returned incomplete data')
    return { id: data.id, key: data.key }
}

export async function updateApiKey(api: AuthenticatedApi, appId: string, keyId: string, data: Record<string, unknown>) {
    const response = await api.put(`/api/apps/${appId}/api-keys/${keyId}`, { data })
    await requireSuccess(response, 'update API key')
}

export async function deleteSeedData(api: AuthenticatedApi): Promise<void> {
    const [appsResponse, knowledgeResponse] = await Promise.all([api.get('/api/apps?pageSize=100'), api.get('/api/knowledge?pageSize=100')])
    const appsPayload = await requireSuccess(appsResponse, 'list apps for cleanup')
    const knowledgePayload = await requireSuccess(knowledgeResponse, 'list knowledge bases for cleanup')
    const appItems = (dataOf(appsPayload, 'list apps for cleanup').items ?? []) as Array<{ id?: unknown; name?: unknown }>
    const knowledgeItems = (dataOf(knowledgePayload, 'list knowledge bases for cleanup').items ?? []) as Array<{
        id?: unknown
        name?: unknown
    }>

    await Promise.all(
        appItems
            .filter(item => typeof item.id === 'string' && typeof item.name === 'string' && item.name.startsWith('ci-e2e-'))
            .map(item => api.delete(`/api/apps/${item.id}`))
    )
    await Promise.all(
        knowledgeItems
            .filter(item => typeof item.id === 'string' && typeof item.name === 'string' && item.name.startsWith('ci-e2e-'))
            .map(item => api.delete(`/api/knowledge/${item.id}`))
    )
}
