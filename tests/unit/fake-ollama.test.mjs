import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'

let fakeOllama
let baseUrl

before(async () => {
    fakeOllama = await import('../support/fake-ollama.mjs')
    const started = await fakeOllama.startFakeOllama({ port: 0 })
    baseUrl = started.url
})

after(async () => {
    await fakeOllama.stopFakeOllama()
})

async function request(path, body, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        ...options,
    })

    const payload = await response.json()
    return { response, payload }
}

test('embedding output is deterministic and has the configured dimension', async () => {
    const first = await request('/api/embeddings', { prompt: 'risk level', model: 'test-embedding' })
    const second = await request('/api/embeddings', { prompt: 'risk level', model: 'test-embedding' })

    assert.equal(first.response.status, 200)
    assert.equal(first.payload.embedding.length, 1024)
    assert.deepEqual(first.payload.embedding, second.payload.embedding)
    assert.ok(first.payload.embedding.every(value => value >= -1 && value <= 1))
})

test('model listing exposes the test chat and embedding models', async () => {
    const { response, payload } = await request('/api/tags')

    assert.equal(response.status, 200)
    assert.deepEqual(
        payload.models.map(model => model.name),
        ['test-chat', 'test-embedding']
    )
})

test('chat returns a deterministic assistant message', async () => {
    const { response, payload } = await request('/api/chat', {
        model: 'test-chat',
        messages: [{ role: 'user', content: 'Say hello' }],
        stream: false,
    })

    assert.equal(response.status, 200)
    assert.equal(payload.done, true)
    assert.equal(payload.message.role, 'assistant')
    assert.match(payload.message.content, /Say hello/)
})

test('unknown paths return not found', async () => {
    const { response, payload } = await request('/api/unknown')

    assert.equal(response.status, 404)
    assert.equal(payload.error, 'not found')
})

test('error mode returns a dependency failure response', async () => {
    const errorServer = fakeOllama.createFakeOllamaServer({ port: 0, mode: 'error' })
    const { url } = await errorServer.start()

    try {
        const response = await fetch(`${url}/api/embeddings`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ prompt: 'risk level', model: 'test-embedding' }),
        })
        const payload = await response.json()

        assert.equal(response.status, 503)
        assert.equal(payload.error, 'fake ollama error')
    } finally {
        await errorServer.stop()
    }
})
