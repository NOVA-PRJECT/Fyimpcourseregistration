import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 10 attempts per 15 minutes for login
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10445, '15 m'),
  prefix: 'fyimp:login',
})

// 10 submissions per hour per student (keyed by user ID)
export const submitLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'fyimp:submit',
})

// 3 bulk uploads per hour per HOD (keyed by HOD user ID)
export const bulkUploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'fyimp:bulk-upload',
})

// 5 password-change attempts per hour per student (keyed by user ID)
export const changePasswordLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'fyimp:change-password',
})