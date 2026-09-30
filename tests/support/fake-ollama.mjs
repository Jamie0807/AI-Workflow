import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

const DEFAULT_PORT = 11434
const EMBEDDING_DIMENSION = 1024
const MODEL_NAMES = ['test-chat', 'test-embedding']

let activeInstance

function sendJson(response, status, payload) {
    const body = JSON.stringify(payload)
    response.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(body),
    })
    response.end(body)
}

async function readJson(request) {
    const chunks = []
    let length = 0

    for await (const chunk of request) {
        length += chunk.length
        if (length > 1024 * 1024) throw new Error('request body too large')
        chunks.push(chunk)
    }

    if (chunks.length === 0) return {}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function embeddingFor(prompt, model) {
    return Array.from({ length: EMBEDDING_DIMENSION }, (_, index) => {
        const digest = createHash('sha256')
            .update('ai-workflow-fake-ollama')
            .update('\0')
            .update(model)
            .update('\0')
            .update(prompt)
            .update('\0')
            .update(String(index))
            .digest()

        return (digest.readUInt32BE(0) / 0xffffffff) * 2 - 1
    })
}

function createRequestHandler(mode) {
    return async (request, response) => {
        const url = new URL(request.url ?? '/', 'http://127.0.0.1')

        if (mode === 'error' && ['/api/embeddings', '/api/chat', '/api/tags'].includes(url.pathname)) {
            sendJson(response, 503, { error: 'fake ollama error' })
            return
        }

        if (url.pathname === '/api/tags' && request.method === 'GET') {
            sendJson(response, 200, {
                models: MODEL_NAMES.map(name => ({
                    name,
                    model: name,
                    modified_at: '2026-01-01T00:00:00.000Z',
                    size: 0,
                    digest: 'test-only',
                    details: { family: 'fake', parameter_size: 'test' },
                })),
            })
            return
        }

        if (url.pathname === '/api/embeddings' && request.method === 'POST') {
            try {
                const body = await readJson(request)
                const prompt = String(body.prompt ?? body.input ?? '')
                const model = String(body.model ?? 'test-embedding')
                sendJson(response, 200, { embedding: embeddingFor(prompt, model) })
            } catch (error) {
                sendJson(response, 400, { error: error instanceof Error ? error.message : 'invalid request' })
            }
            return
        }

        if (url.pathname === '/api/chat' && request.method === 'POST') {
            try {
                const body = await readJson(request)
                const messages = Array.isArray(body.messages) ? body.messages : []
                const lastUserMessage = [...messages].reverse().find(message => message?.role === 'user')
                const content = String(lastUserMessage?.content ?? '')
                sendJson(response, 200, {
                    model: String(body.model ?? 'test-chat'),
                    created_at: '2026-01-01T00:00:00.000Z',
                    message: { role: 'assistant', content: `test response: ${content}` },
                    done: true,
                })
            } catch (error) {
                sendJson(response, 400, { error: error instanceof Error ? error.message : 'invalid request' })
            }
            return
        }

        sendJson(response, 404, { error: 'not found' })
    }
}

export function createFakeOllamaServer(options = {}) {
    const port = options.port ?? Number(process.env.OLLAMA_PORT ?? DEFAULT_PORT)
    const mode = options.mode ?? process.env.OLLAMA_FAKE_MODE ?? 'normal'
    const server = createServer((request, response) => {
        void createRequestHandler(mode)(request, response).catch(error => {
            sendJson(response, 500, { error: error instanceof Error ? error.message : 'internal error' })
        })
    })

    return {
        server,
        async start() {
            await new Promise((resolve, reject) => {
                server.once('error', reject)
                server.listen(port, '127.0.0.1', resolve)
            })
            const address = server.address()
            if (!address || typeof address === 'string') throw new Error('fake Ollama did not expose a TCP address')
            return { port: address.port, url: `http://127.0.0.1:${address.port}` }
        },
        async stop() {
            if (!server.listening) return
            await new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve())))
        },
    }
}

export async function startFakeOllama(options = {}) {
    if (activeInstance) await stopFakeOllama()
    const instance = createFakeOllamaServer(options)
    const address = await instance.start()
    activeInstance = { ...instance, ...address }
    return activeInstance
}

export async function stopFakeOllama() {
    if (!activeInstance) return
    const instance = activeInstance
    activeInstance = undefined
    await instance.stop()
}

async function runAsCli() {
    const instance = await startFakeOllama()
    console.log(`fake Ollama listening on ${instance.url}`)

    const shutdown = async () => {
        await stopFakeOllama()
        process.exit(0)
    }
    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await runAsCli()
}
