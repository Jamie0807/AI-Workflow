import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/http-exception.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    const logger = new Logger('Bootstrap')

    // 全局路由前缀
    app.setGlobalPrefix('api')

    // CORS 配置
    app.enableCors({
        origin: true,
        credentials: true,
    })

    // 全局验证管道
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // 自动移除非 DTO 中定义的属性
            forbidNonWhitelisted: true, // 如果存在未定义的属性则抛出错误
            transform: true, // 自动转换类型
            transformOptions: {
                enableImplicitConversion: true,
            },
        })
    )

    // 全局异常过滤器
    app.useGlobalFilters(new GlobalExceptionFilter())

    // 全局响应拦截器
    app.useGlobalInterceptors(new TransformInterceptor())

    const port = process.env.PORT ?? 3100
    await app.listen(port)

    logger.log(`🚀 API Server is running on: http://localhost:${port}/api`)
    logger.log(`📚 Workflow API: POST http://localhost:${port}/api/v1/apps/run`)
}

bootstrap()
