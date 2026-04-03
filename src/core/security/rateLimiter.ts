const attempts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now > record.resetTime) {
    attempts.set(key, { count: 1, resetTime: now + windowMs })
    return true // allowed
  }

  if (record.count >= maxAttempts) {
    return false // blocked
  }

  record.count++
  return true // allowed
}