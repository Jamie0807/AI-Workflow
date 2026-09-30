import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { expect, test } from '@playwright/test'

const reportPath = resolve(process.cwd(), 'tests/.artifacts/security-gaps.json')

const gaps = [
    {
        id: 'OPT-002-SSRF',
        severity: 'high',
        route: 'Workflow HTTP request node',
        status: 'not_implemented',
        targetAssertion: 'private, loopback, link-local, and cloud-metadata destinations are rejected before outbound requests',
    },
    {
        id: 'OPT-003-RATE-LIMIT',
        severity: 'medium',
        route: 'Workflow and API Server public execution endpoints',
        status: 'not_implemented',
        targetAssertion: 'repeated unauthenticated and authenticated requests receive a bounded 429 response with retry metadata',
    },
    {
        id: 'OPT-008-CORS',
        severity: 'medium',
        route: 'API Server CORS middleware',
        status: 'not_implemented',
        targetAssertion: 'only the configured web origins receive credentialed CORS headers',
    },
] as const

test('writes the explicit deferred security gap report without secrets', async () => {
    const serialized = JSON.stringify(gaps, null, 2)
    const forbidden = [
        'ci-e2e-password-a',
        'ci-e2e-password-b',
        process.env.JWT_SECRET,
        process.env.DATABASE_URL,
        process.env.OLLAMA_BASE_URL,
    ].filter((value): value is string => Boolean(value))

    expect(forbidden.every(value => !serialized.includes(value))).toBe(true)
    expect(gaps.map(gap => gap.id)).toEqual(['OPT-002-SSRF', 'OPT-003-RATE-LIMIT', 'OPT-008-CORS'])
    expect(gaps.every(gap => gap.status === 'not_implemented')).toBe(true)

    await mkdir(dirname(reportPath), { recursive: true })
    await writeFile(
        reportPath,
        `${JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                gaps,
            },
            null,
            2
        )}\n`,
        'utf8'
    )

    const report = JSON.parse(await readFile(reportPath, 'utf8')) as {
        gaps: Array<{ id: string; status: string }>
    }
    expect(report.gaps).toHaveLength(3)
    expect(report.gaps.every(gap => gap.status === 'not_implemented')).toBe(true)
})
