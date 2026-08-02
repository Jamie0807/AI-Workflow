import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

import { PrismaClient } from '../generated/prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private pool: Pool

    constructor() {
        const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:xiaoer@localhost:5433/postgres'
        const pool = new Pool({ connectionString })
        const adapter = new PrismaPg(pool)

        super({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        })

        this.pool = pool
    }

    async onModuleInit() {
        await this.$connect()
    }

    async onModuleDestroy() {
        await this.$disconnect()
        await this.pool.end()
    }
}
