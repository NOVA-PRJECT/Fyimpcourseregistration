import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name)
  public readonly loginLimiter: Ratelimit
  public readonly emailLoginLimiter: Ratelimit
  public readonly adminCrudLimiter: Ratelimit
  public readonly timetableGenerateLimiter: Ratelimit
  public readonly registrationSubmitLimiter: Ratelimit
  public readonly passwordChangeLimiter: Ratelimit
  public readonly campusSignInLimiter: Ratelimit
  private readonly redis: Redis

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('UPSTASH_REDIS_REST_URL') || process.env.UPSTASH_REDIS_REST_URL
    const token = this.config.get<string>('UPSTASH_REDIS_REST_TOKEN') || process.env.UPSTASH_REDIS_REST_TOKEN

    this.redis = new Redis({
      url: url || 'https://dummy.upstash.io',
      token: token || 'dummy_token',
    })

    this.loginLimiter = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: 'ratelimit:login',
    })

    this.emailLoginLimiter = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: 'ratelimit:email_login',
    })

    this.adminCrudLimiter = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(30, '10 s'),
      prefix: 'ratelimit:admin_crud',
    })

    this.timetableGenerateLimiter = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(3, '60 s'),
      prefix: 'ratelimit:timetable_generate',
    })

    this.registrationSubmitLimiter = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      prefix: 'ratelimit:registration_submit',
    })

    this.passwordChangeLimiter = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: 'ratelimit:password_change',
    })

    this.campusSignInLimiter = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      prefix: 'ratelimit:campus_sign_in',
    })
  }

  /**
   * Safely check rate limit, failing open if Redis is unavailable or unconfigured.
   */
  async checkLimit(
    limiter: Ratelimit,
    identifier: string,
  ): Promise<{ success: boolean; remaining: number; reset: number }> {
    try {
      return await limiter.limit(identifier)
    } catch (err: any) {
      this.logger.warn(`Rate limiter check failed: ${err.message}. Failing open to avoid denial of service.`)
      return { success: true, remaining: 1, reset: Date.now() + 60000 }
    }
  }

  async resetLoginLimits(ip: string, email: string): Promise<void> {
    try {
      const sanitizedEmail = email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_')
      await Promise.all([
        this.redis.del(`ratelimit:login:${ip}`),
        this.redis.del(`ratelimit:email_login:${sanitizedEmail}`),
      ])
    } catch (err: any) {
      this.logger.warn(`Failed to reset login rate limits: ${err.message}`)
    }
  }
}
