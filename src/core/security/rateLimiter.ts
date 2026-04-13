import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 5 attempts per hour for CAP verification
export const eligibilityLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'fyimp:eligibility',
})

// 10 attempts per 15 minutes for login
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'fyimp:login',
})

// 10 submissions per hour per student (keyed by user ID)
export const submitLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'fyimp:submit',
})

// 10 attempts per day per CAP number (prevents targeted DOB enumeration)
export const capNumberLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 d'),
  prefix: 'fyimp:cap',
})