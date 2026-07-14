import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 10 attempts per 15 minutes for login (IP based)
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'fyimp:login',
})

// 5 attempts per 15 minutes per email for login
export const emailLoginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'fyimp:login-email',
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

// 60 administrative CRUD actions per minute per admin/HOD (keyed by user ID)
export const adminCrudLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'fyimp:admin-crud',
})

// 5 password-reset attempts per hour per IP (keyed by IP/email)
export const resetPasswordLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'fyimp:reset-password',
})