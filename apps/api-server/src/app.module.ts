import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { WorkflowModule } from './modules/workflow/workflow.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
    imports: [
        // 环境变量配置
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // 数据库
        PrismaModule,

        // 业务模块
        WorkflowModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
