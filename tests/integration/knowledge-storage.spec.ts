import { expect, test } from '@playwright/test'

import { createKnowledgeBase, deleteSeedData, requestAsUser, TEST_USERS, uploadDocument } from '../support/api-fixtures'

test.describe('Workflow knowledge storage API', () => {
    test('rejects a protected endpoint without a session', async ({ request }) => {
        const response = await request.get('/api/knowledge')

        expect(response.status()).toBe(401)
    })

    test('creates, lists, updates, and deletes a knowledge base in PostgreSQL', async ({ request }) => {
        const api = await requestAsUser(request, TEST_USERS.a.email, TEST_USERS.a.password)
        const name = `ci-e2e-kb-${Date.now()}`

        try {
            const created = await createKnowledgeBase(api, name)
            const listed = await api.get('/api/knowledge')
            expect(listed.ok()).toBe(true)
            const listedBody = (await listed.json()) as { data: { items: Array<{ id: string }> } }
            expect(listedBody.data.items.some(item => item.id === created.id)).toBe(true)

            const updated = await api.put(`/api/knowledge/${created.id}`, {
                data: { description: 'updated by OPT-018 integration test', topK: 3 },
            })
            expect(updated.ok()).toBe(true)
            const updatedBody = (await updated.json()) as { data: { description: string; topK: number } }
            expect(updatedBody.data.description).toBe('updated by OPT-018 integration test')
            expect(updatedBody.data.topK).toBe(3)

            const detail = await api.get(`/api/knowledge/${created.id}`)
            expect(detail.status()).toBe(200)
            expect(((await detail.json()) as { data: { id: string } }).data.id).toBe(created.id)

            const deleted = await api.delete(`/api/knowledge/${created.id}`)
            expect(deleted.status()).toBe(200)
            expect((await api.get(`/api/knowledge/${created.id}`)).status()).toBe(404)
        } finally {
            await deleteSeedData(api)
        }
    })

    test('stores a document under its knowledge base and reports bounded processing status', async ({ request }) => {
        const api = await requestAsUser(request, TEST_USERS.a.email, TEST_USERS.a.password)
        const knowledgeBase = await createKnowledgeBase(api, `ci-e2e-doc-kb-${Date.now()}`)

        try {
            const document = await uploadDocument(api, knowledgeBase.id)
            let finalStatus = 'PENDING'
            let latestBody: { data?: { status?: string; errorMessage?: string | null } } = {}

            for (let attempt = 0; attempt < 20; attempt += 1) {
                const response = await api.get(`/api/knowledge/${knowledgeBase.id}/documents/${document.id}`)
                expect(response.status()).toBe(200)
                latestBody = (await response.json()) as typeof latestBody
                finalStatus = latestBody.data?.status ?? 'UNKNOWN'
                if (finalStatus === 'COMPLETED' || finalStatus === 'ERROR') break
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            expect(finalStatus, `document processing failed: ${latestBody.data?.errorMessage ?? 'timeout'}`).toBe('COMPLETED')

            const listed = await api.get(`/api/knowledge/${knowledgeBase.id}/documents`)
            expect(listed.status()).toBe(200)
            const listedBody = (await listed.json()) as { data: { items: Array<{ id: string }> } }
            expect(listedBody.data.items.some(item => item.id === document.id)).toBe(true)
        } finally {
            await deleteSeedData(api)
        }
    })
})
