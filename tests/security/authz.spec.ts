import { expect, test } from '@playwright/test'

import {
    createApiKey,
    createApp,
    createKnowledgeBase,
    deleteSeedData,
    publishApp,
    requestAsUser,
    saveWorkflow,
    TEST_USERS,
} from '../support/api-fixtures'

const apiServerBaseUrl = process.env.API_SERVER_BASE_URL ?? 'http://127.0.0.1:3100'

test.describe('Workflow authentication and authorization regressions', () => {
    test('protected APIs return 401 without a session', async ({ request }) => {
        const [apps, knowledge] = await Promise.all([request.get('/api/apps'), request.get('/api/knowledge')])

        expect(apps.status()).toBe(401)
        expect(knowledge.status()).toBe(401)
    })

    test('user B cannot read or modify user A resources', async ({ request }) => {
        const userA = await requestAsUser(request, TEST_USERS.a.email, TEST_USERS.a.password)
        const userB = await requestAsUser(request, TEST_USERS.b.email, TEST_USERS.b.password)
        const app = await createApp(userA, `ci-e2e-owned-app-${Date.now()}`)
        const knowledgeBase = await createKnowledgeBase(userA, `ci-e2e-owned-kb-${Date.now()}`)

        try {
            expect((await userB.get(`/api/apps/${app.id}`)).status()).toBe(404)
            expect((await userB.put(`/api/apps/${app.id}`, { data: { name: 'ci-e2e-stolen-app' } })).status()).toBe(404)
            expect((await userB.delete(`/api/apps/${app.id}`)).ok()).toBe(false)
            expect((await userB.get(`/api/knowledge/${knowledgeBase.id}`)).status()).toBe(404)
            expect((await userB.put(`/api/knowledge/${knowledgeBase.id}`, { data: { name: 'ci-e2e-stolen-kb' } })).status()).toBe(404)
            expect((await userB.delete(`/api/knowledge/${knowledgeBase.id}`)).ok()).toBe(false)
        } finally {
            await deleteSeedData(userA)
        }
    })

    test('API Server rejects missing, random, inactive, and expired API keys', async ({ request }) => {
        const userA = await requestAsUser(request, TEST_USERS.a.email, TEST_USERS.a.password)
        const app = await createApp(userA, `ci-e2e-key-app-${Date.now()}`)

        try {
            await saveWorkflow(userA, app.id)
            await publishApp(userA, app.id)
            const apiKey = await createApiKey(userA, app.id, 'ci-e2e-authz-key')
            const runUrl = `${apiServerBaseUrl}/api/v1/apps/run`
            const body = { inputs: {}, stream: false }

            expect((await request.post(runUrl, { data: body })).status()).toBe(401)
            expect((await request.post(runUrl, { data: body, headers: { Authorization: 'Bearer ci-e2e-random-key' } })).status()).toBe(401)

            await userA.put(`/api/apps/${app.id}/api-keys/${apiKey.id}`, { data: { isActive: false } })
            const inactive = await request.post(runUrl, { data: body, headers: { Authorization: `Bearer ${apiKey.key}` } })
            expect(inactive.ok()).toBe(false)

            await userA.put(`/api/apps/${app.id}/api-keys/${apiKey.id}`, {
                data: { isActive: true, expiresAt: '2020-01-01T00:00:00.000Z' },
            })
            const expired = await request.post(runUrl, { data: body, headers: { Authorization: `Bearer ${apiKey.key}` } })
            expect(expired.ok()).toBe(false)

            await userA.put(`/api/apps/${app.id}/api-keys/${apiKey.id}`, { data: { expiresAt: null } })
            const valid = await request.post(runUrl, { data: body, headers: { Authorization: `Bearer ${apiKey.key}` } })
            expect(valid.ok()).toBe(true)
            const validBody = (await valid.json()) as { data?: { status?: string; executionId?: string } }
            expect(validBody.data?.status, JSON.stringify(validBody)).toBe('SUCCESS')
            expect(validBody.data?.executionId).toMatch(/^exec_[a-f0-9]+$/)
        } finally {
            await deleteSeedData(userA)
        }
    })
})
