import { expect, loginAs, test } from '../support/ui-fixtures'

test('logs in, survives a reload, and logs out', async ({ page }) => {
    await loginAs(page)

    await expect(page).toHaveURL(/\/apps(?:[/?#]|$)/)
    await page.reload()
    await expect(page.getByRole('link', { name: /工作室/ })).toBeVisible()

    await page.getByTestId('user-menu-trigger').click()
    await page.getByTestId('logout-button').click()
    await expect(page).toHaveURL(/\/account\/login(?:[/?#]|$)/)
})
