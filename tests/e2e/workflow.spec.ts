import { createApiKey, publishApp, requestAsUser, saveWorkflow, TEST_USERS } from '../support/api-fixtures'
import { expect, test } from '../support/ui-fixtures'

const apiServerBaseUrl = process.env.API_SERVER_BASE_URL ?? 'http://127.0.0.1:3100'

test('creates an app in the UI, publishes it, and runs it through the public API', async ({ userPage, request }) => {
    await userPage.goto('/apps')
    await userPage.getByTestId('create-app-card').click()
    const dialog = userPage.getByRole('dialog')
    const appName = `ci-e2e-ui-app-${Date.now()}`
    await dialog.getByLabel(/应用名称/).fill(appName)
    await dialog.getByRole('button', { name: '创建', exact: true }).click()
    await userPage.waitForURL(/\/app\/[^/]+\/workflow(?:[/?#]|$)/)

    const appId = new URL(userPage.url()).pathname.split('/')[2]
    if (!appId) throw new Error(`Could not extract app id from ${userPage.url()}`)

    const api = await requestAsUser(request, TEST_USERS.a.email, TEST_USERS.a.password)
    await saveWorkflow(api, appId)
    await userPage.reload()

    const saveButton = userPage.getByRole('button', { name: '保存', exact: true })
    await expect(saveButton).toBeEnabled()
    await saveButton.click()
    await expect(userPage.getByText(/已保存/)).toBeVisible()

    await userPage.getByTestId('publish-menu-trigger').click()
    await userPage.getByRole('button', { name: '立即发布', exact: true }).click()
    await expect(userPage.getByTestId('publish-menu-trigger')).toContainText('已发布')

    const apiKey = await createApiKey(api, appId, 'ci-e2e-ui-key')
    const response = await request.post(`${apiServerBaseUrl}/api/v1/apps/run`, {
        data: { inputs: {}, stream: false },
        headers: { Authorization: `Bearer ${apiKey.key}` },
    })
    expect(response.ok()).toBe(true)
    const payload = await response.json()
    expect(payload.data.status).toBe('SUCCESS')
    expect(JSON.stringify(payload)).not.toContain('ci-e2e-password')
})
