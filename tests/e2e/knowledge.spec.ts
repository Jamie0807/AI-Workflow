import { resolve } from 'node:path'

import { expect, test } from '../support/ui-fixtures'

test('creates a knowledge base, uploads a document, and searches its content', async ({ userPage }) => {
    await userPage.goto('/knowledge')
    await userPage.getByTestId('create-knowledge-card').click()
    const dialog = userPage.getByRole('dialog')
    const knowledgeBaseName = `ci-e2e-ui-kb-${Date.now()}`
    await dialog.getByLabel(/知识库名称/).fill(knowledgeBaseName)
    await dialog.getByRole('button', { name: '创建', exact: true }).click()
    await userPage.waitForURL(/\/knowledge\/[^/]+\/documents(?:[/?#]|$)/)

    const fileChooserPromise = userPage.waitForEvent('filechooser')
    await userPage.getByRole('button', { name: '上传文档', exact: true }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(resolve(process.cwd(), 'tests/fixtures/knowledge.txt'))

    const completedStatus = userPage.getByText('已完成', { exact: true })
    const statusLabels = ['已完成', '处理中', '等待中', '失败']
    let lastDocumentStatus = '未观察到状态'
    for (let attempt = 0; attempt < 30 && (await completedStatus.count()) === 0; attempt += 1) {
        for (const label of statusLabels) {
            if ((await userPage.getByText(label, { exact: true }).count()) > 0) {
                lastDocumentStatus = label
                break
            }
        }
        await userPage.getByRole('button', { name: '刷新', exact: true }).click()
        await userPage.waitForTimeout(1_000)
    }
    for (const label of statusLabels) {
        if ((await userPage.getByText(label, { exact: true }).count()) > 0) {
            lastDocumentStatus = label
            break
        }
    }
    expect(
        await completedStatus.count(),
        `Document did not complete within 30 seconds. Last status=${lastDocumentStatus}. ` +
            `Service URLs: workflow=${process.env.WORKFLOW_BASE_URL ?? 'http://127.0.0.1:3000'}, ` +
            `qdrant=${process.env.TEST_QDRANT_URL ?? 'http://127.0.0.1:6335'}, ` +
            `ollama=${process.env.TEST_OLLAMA_URL ?? 'http://127.0.0.1:11434'}\n` +
            `URL=${userPage.url()}\n${await userPage.locator('body').innerText()}`
    ).toBeGreaterThan(0)

    await userPage.getByRole('link', { name: '召回测试', exact: true }).click()
    await userPage.waitForURL(/\/knowledge\/[^/]+\/search(?:[/?#]|$)/)
    await userPage.getByRole('combobox').click()
    await userPage.getByRole('option', { name: '全文检索', exact: true }).click()
    await userPage.getByTestId('knowledge-search-input').fill('OPT-018 deterministic knowledge phrase')
    await userPage.getByTestId('knowledge-search-submit').click()
    await expect(userPage.getByText(/OPT-018 deterministic knowledge phrase/)).toBeVisible({ timeout: 10_000 })
})
