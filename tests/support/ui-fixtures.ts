import { type Page, test as base } from '@playwright/test'

import { deleteSeedData, requestAsUser, TEST_USERS } from './api-fixtures'

export async function loginAs(page: Page, email: string = TEST_USERS.a.email): Promise<void> {
    const user = email === TEST_USERS.b.email ? TEST_USERS.b : TEST_USERS.a

    await page.goto('/account/login')
    await page.getByLabel('邮箱').fill(email)
    await page.getByLabel('密码').fill(user.password)
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await page.waitForURL(/\/apps(?:[/?#]|$)/)
}

type UiFixtures = {
    userPage: Page
}

export const test = base.extend<UiFixtures>({
    userPage: async ({ page, request }, use) => {
        const consoleErrors: string[] = []
        page.on('console', message => {
            if (message.type() === 'error') consoleErrors.push(`console.error: ${message.text()}`)
        })
        page.on('pageerror', error => consoleErrors.push(`pageerror: ${error.message}`))

        let testError: unknown
        try {
            await loginAs(page)
            await use(page)
        } catch (error) {
            testError = error
        }

        let cleanupError: unknown
        try {
            const api = await requestAsUser(request, TEST_USERS.a.email, TEST_USERS.a.password)
            await deleteSeedData(api)
        } catch (error) {
            cleanupError = error
        }

        if (testError) throw testError
        if (cleanupError) throw cleanupError
        if (consoleErrors.length > 0) throw new Error(`Browser errors detected:\n${consoleErrors.slice(-10).join('\n')}`)
    },
})

export { expect } from '@playwright/test'
