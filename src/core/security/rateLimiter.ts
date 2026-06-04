import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const hasRedisConfig = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedisConfig ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
}) : null;

const createLimiter = (limit: number, window: `${number} s` | `${number} m` | `${number} h` | `${number} d`, prefix: string) => {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix,
    });
  }
  // Dummy limiter that always passes when Redis isn't configured
  return {
    limit: async () => ({ success: true, pending: Promise.resolve() }),
  } as any;
};

// 5 attempts per hour for CAP verification
export const eligibilityLimiter = createLimiter(5, '1 h', 'fyimp:eligibility');

// 10 attempts per 15 minutes for login
export const loginLimiter = createLimiter(10, '15 m', 'fyimp:login');

// 10 submissions per hour per student (keyed by user ID)
export const submitLimiter = createLimiter(10, '1 h', 'fyimp:submit');

// 10 attempts per day per CAP number (prevents targeted DOB enumeration)
export const capNumberLimiter = createLimiter(10, '1 d', 'fyimp:cap');