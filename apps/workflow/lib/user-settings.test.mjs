import assert from 'node:assert/strict'
import { test } from 'node:test'

import { navigateToUserSettings, validateDisplayName } from './user-settings.ts'

test('selecting settings navigates to the app settings route', () => {
    let navigatedPath
    navigateToUserSettings({ push: path => (navigatedPath = path) })

    assert.equal(navigatedPath, '/settings')
})

test('display names are trimmed before saving', () => {
    assert.deepEqual(validateDisplayName('  Jamie  '), { valid: true, value: 'Jamie' })
})

test('blank display names are rejected', () => {
    assert.deepEqual(validateDisplayName('   '), { valid: false, error: '请输入姓名' })
})

test('display names longer than 50 characters are rejected', () => {
    assert.deepEqual(validateDisplayName('a'.repeat(51)), { valid: false, error: '姓名不能超过 50 个字符' })
})
