/**
 * Structured server-side error logging helper.
 * Outputs formatted JSON logs containing path, error message, stack trace, timestamp, and optional context.
 */
export function logServerError(path: string, error: any, context?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    path,
    message: error instanceof Error ? error.message : String(error),
    error: error && typeof error === 'object' ? { ...error } : error,
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  }
  console.error(JSON.stringify(logEntry))
}
