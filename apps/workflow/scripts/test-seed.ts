import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

import { PrismaClient } from '../app/generated/prisma/client'
import { hashPassword } from '../lib/password'

const TEST_PREFIX = 'ci-e2e-'
const TEST_DATABASE_URL = 'postgresql://ci:ci@127.0.0.1:5434/ai_workflow_test'
const TEST_USERS = [
    { email: 'ci-e2e-user-a@example.test', password: 'ci-e2e-password-a' },
    { email: 'ci-e2e-user-b@example.test', password: 'ci-e2e-password-b' },
] as const

function assertTestDatabaseUrl(value: string) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Test seed cannot run with NODE_ENV=production')
    }

    const parsed = new URL(value)
    if (
        parsed.protocol !== 'postgresql:' ||
        !['127.0.0.1', 'localhost', '[::1]', '::1'].includes(parsed.hostname) ||
        parsed.username !== 'ci' ||
        parsed.password !== 'ci' ||
        parsed.port !== '5434' ||
        parsed.pathname !== '/ai_workflow_test'
    ) {
        throw new Error('Test seed requires the dedicated local ci database')
    }
}

async function deletePreviousTestData(prisma: PrismaClient) {
    const apps = await prisma.app.findMany({
        where: { name: { startsWith: TEST_PREFIX } },
        select: { id: true },
    })
    const appIds = apps.map(({ id }) => id)

    if (appIds.length > 0) {
        await prisma.app.updateMany({ where: { id: { in: appIds } }, data: { activePublishedId: null } })
        await prisma.appExecution.deleteMany({ where: { publishedApp: { appId: { in: appIds } } } })
        await prisma.workflowExecution.deleteMany({ where: { appId: { in: appIds } } })
        await prisma.apiKey.deleteMany({ where: { appId: { in: appIds } } })
        await prisma.workflow.deleteMany({ where: { appId: { in: appIds } } })
        await prisma.publishedApp.deleteMany({ where: { appId: { in: appIds } } })
        await prisma.app.deleteMany({ where: { id: { in: appIds } } })
    }

    const knowledgeBases = await prisma.knowledgeBase.findMany({
        where: { name: { startsWith: TEST_PREFIX } },
        select: { id: true },
    })
    const knowledgeBaseIds = knowledgeBases.map(({ id }) => id)
    if (knowledgeBaseIds.length > 0) {
        await prisma.document.deleteMany({ where: { knowledgeBaseId: { in: knowledgeBaseIds } } })
        await prisma.knowledgeBase.deleteMany({ where: { id: { in: knowledgeBaseIds } } })
    }

    await prisma.user.deleteMany({
        where: {
            OR: [{ email: { startsWith: TEST_PREFIX } }, { name: { startsWith: TEST_PREFIX } }],
        },
    })
}

async function seed() {
    const connectionString = process.env.DATABASE_URL ?? TEST_DATABASE_URL
    assertTestDatabaseUrl(connectionString)

    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
        await deletePreviousTestData(prisma)

        const passwordHashes = await Promise.all(TEST_USERS.map(({ password }) => hashPassword(password)))
        const users = await Promise.all(
            TEST_USERS.map(({ email }, index) =>
                prisma.user.create({
                    data: {
                        email,
                        password: passwordHashes[index],
                        name: email.split('@')[0],
                        emailVerified: new Date('2026-01-01T00:00:00.000Z'),
                    },
                    select: { id: true, email: true },
                })
            )
        )

        const artifactPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../tests/.artifacts/seed.json')
        await mkdir(dirname(artifactPath), { recursive: true })
        await writeFile(
            artifactPath,
            `${JSON.stringify(
                {
                    users,
                    generatedAt: new Date().toISOString(),
                },
                null,
                2
            )}\n`,
            'utf8'
        )
        process.stdout.write(`Seeded ${users.length} test users; IDs written to ${artifactPath}\n`)
    } finally {
        await prisma.$disconnect()
        await pool.end()
    }
}

seed().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`)
    process.exitCode = 1
})
