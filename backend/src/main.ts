import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { AppModule } from './app.module'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser')

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)

  app.use(cookieParser())

  // Ensure API responses are never cached by browsers or proxy layers
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    next()
  })

  const isProd = process.env.NODE_ENV === 'production'
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  const rawOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001']

  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server proxies, mobile clients, and non-browser callers
      if (!origin) return callback(null, true)
      if (!isProd) return callback(null, true)

      try {
        const url = new URL(origin)
        const isVercelDomain = url.hostname.endsWith('.vercel.app')
        const isWhitelisted = rawOrigins.includes(origin) || rawOrigins.includes(url.origin)

        if (isWhitelisted || isVercelDomain) {
          return callback(null, true)
        }
      } catch {
        // invalid URL origin
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Content-Disposition'],
  })

  const port = process.env.PORT || 4000
  await app.listen(port, '0.0.0.0')

  logger.log(`🚀 NestJS Backend running at http://127.0.0.1:${port}`)
  logger.log(`🔒 Supabase database & auth connected`)
}

bootstrap()
