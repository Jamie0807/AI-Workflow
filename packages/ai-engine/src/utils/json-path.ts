function stripJsonFence(value: string): string {
    const trimmed = value.trim()
    const match = trimmed.match(/^```(?:json)?\n([\s\S]*?)\n```$/i)

    return match ? match[1] : value
}

function tokenizeJsonPath(path: string): string[] | undefined {
    if (path.length === 0) {
        return []
    }

    const tokens: string[] = []
    let index = 0

    const pushToken = (token: string | undefined): boolean => {
        if (!token) {
            return false
        }

        tokens.push(token)
        return true
    }

    while (index < path.length) {
        const char = path[index]

        if (char === '.') {
            return undefined
        }

        if (char === '[') {
            const closeIndex = path.indexOf(']', index + 1)

            if (closeIndex === -1) {
                return undefined
            }

            const token = path.slice(index + 1, closeIndex)

            if (!/^\d+$/.test(token)) {
                return undefined
            }

            if (!pushToken(token)) {
                return undefined
            }

            index = closeIndex + 1

            if (index < path.length) {
                if (path[index] === '.') {
                    index += 1

                    if (index >= path.length || path[index] === '.' || path[index] === '[' || path[index] === ']') {
                        return undefined
                    }
                } else if (path[index] !== '[') {
                    return undefined
                }
            }

            continue
        }

        let end = index

        while (end < path.length && path[end] !== '.' && path[end] !== '[' && path[end] !== ']') {
            end += 1
        }

        const token = path.slice(index, end)

        if (!pushToken(token)) {
            return undefined
        }

        index = end

        if (index < path.length) {
            const separator = path[index]

            if (separator === '.') {
                index += 1

                if (index >= path.length || path[index] === '.' || path[index] === '[' || path[index] === ']') {
                    return undefined
                }

                continue
            }

            if (separator !== '[') {
                return undefined
            }
        }
    }

    return tokens
}

export function parseJsonValue(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value
    }

    try {
        return JSON.parse(stripJsonFence(value))
    } catch {
        return undefined
    }
}

export function resolveJsonPath(value: unknown, path: string): { found: boolean; value: unknown } {
    const rootValue = parseJsonValue(value)

    if (path.length === 0) {
        return { found: rootValue !== undefined, value: rootValue }
    }

    const tokens = tokenizeJsonPath(path)

    if (!tokens || tokens.length === 0) {
        return { found: false, value: undefined }
    }

    let current: unknown = rootValue

    for (const token of tokens) {
        if (current === null || (typeof current !== 'object' && typeof current !== 'function')) {
            return { found: false, value: undefined }
        }

        if (!Object.prototype.hasOwnProperty.call(current, token)) {
            return { found: false, value: undefined }
        }

        current = (current as Record<string, unknown>)[token]
    }

    return { found: true, value: current }
}
