import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { AppModule } from './app.module'
import { Logger, ValidationPipe } from '@nestjs/common'
import { envs } from './config'

async function bootstrap() {
  const logger = new Logger('Payments-mx')
  const app = await NestFactory.create(AppModule, { rawBody: true })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: envs.natsServers
    }
  },
    {
      inheritAppConfig: true
    })

  await app.startAllMicroservices()
  await app.listen(process.env.PORT ?? 3000)
  logger.log(`Payments microservice ${envs.port}`)
}
bootstrap()