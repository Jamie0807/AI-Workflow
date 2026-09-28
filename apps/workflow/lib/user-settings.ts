export const USER_SETTINGS_PATH = '/settings'
export const USER_PROFILE_UPDATED_EVENT = 'user-profile-updated'

export function navigateToUserSettings(router: { push: (path: string) => void }) {
    router.push(USER_SETTINGS_PATH)
}

export function validateDisplayName(name: string): { valid: true; value: string } | { valid: false; error: string } {
    const value = name.trim()

    if (!value) {
        return { valid: false, error: '请输入姓名' }
    }

    if (value.length > 50) {
        return { valid: false, error: '姓名不能超过 50 个字符' }
    }

    return { valid: true, value }
}
