# Run Changes: Full Codebase Security Hardening & Remediation

## Summary
Completed a comprehensive security audit and remediation across the NestJS backend, Next.js frontend, database migrations, and rate-limiting infrastructure for the FYIMP Course Registration system.

---

### Files Modified & Created

#### 1. Database Migrations
- **Created [supabase/migrations/20260903_security_and_schema_fixes.sql](file:///c:/Users/windows/Fyimpcourseregistration/supabase/migrations/20260903_security_and_schema_fixes.sql)**:
  - Added missing database stored procedures:
    - `delete_campus_cascade(p_campus_id UUID)`
    - `delete_department_cascade(p_dept_id UUID)`
    - `promote_campus_students(p_campus_id UUID)`
  - Added `updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()` column to `timetable_generation_jobs`.
  - Added performance and threat detection indexes on `audit_logs(event_type, created_at DESC)` and `audit_logs(user_id)`.

#### 2. Core Security & Logging
- **Modified [backend/src/core/logging/audit-logger.service.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/core/logging/audit-logger.service.ts)**:
  - Resolved UUID insertion failure on failed logins (`userId: 'unknown'`).
  - Added UUID regex validation: invalid/unknown IDs now set `user_id = null` and preserve the attempted username/identifier inside `metadata.attempted_identifier`, preventing silent dropping of brute-force audit logs.
- **Modified [backend/src/core/security/rate-limiter.service.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/core/security/rate-limiter.service.ts)**:
  - Added `checkLimit()` helper with fail-open fallback to prevent denial-of-service lockout if Redis connectivity is interrupted.
  - Added dedicated sliding window rate limiters for `registrationSubmitLimiter` (5 req / 60s) and `passwordChangeLimiter` (5 req / 15m).
- **Created [backend/src/core/security/rate-limit.decorator.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/core/security/rate-limit.decorator.ts) & [backend/src/core/security/rate-limit.guard.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/core/security/rate-limit.guard.ts)**:
  - Implemented `@RateLimit()` decorator and `RateLimitGuard` supporting route-level throttling by authenticated user ID or client IP.
- **Modified [backend/src/core/security/security.module.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/core/security/security.module.ts)**:
  - Exported `RateLimitGuard` globally.

#### 3. Authentication & Access Control
- **Modified [backend/src/core/auth/guards/auth.guard.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/core/auth/guards/auth.guard.ts)**:
  - Enforced backend API protection for `must_change_password`: accounts with default passwords attempting to access courses, registrations, or administrative endpoints without changing their password are now blocked with `403 Forbidden` (`must_change_password: true`).
- **Modified [backend/src/main.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/main.ts)**:
  - Hardened CORS configuration to restrict `localhost` and `127.0.0.1` origins in production environments.

#### 4. Controller & Service Hardening
- **Modified [backend/src/modules/auth/auth.service.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/auth/auth.service.ts)**:
  - Used resilient `checkLimit()` for login rate limiting.
- **Modified [backend/src/modules/student/student.controller.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/student/student.controller.ts)**:
  - Applied `@RateLimit('password_change')` and `RateLimitGuard` to `POST /api/student/change-password`.
- **Modified [backend/src/modules/registrations/registrations.controller.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/registrations/registrations.controller.ts)**:
  - Applied `@RateLimit('registration')` and `RateLimitGuard` to `POST /api/registrations/submit`.
- **Modified [backend/src/modules/registrations/registrations.service.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/registrations/registrations.service.ts)**:
  - Corrected upsert `onConflict` parameter from `student_id,semester` to `student_id,semester,academic_year` to match the PostgreSQL composite unique constraint.
- **Modified [backend/src/modules/timetable/timetable.controller.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/timetable/timetable.controller.ts)**:
  - Applied `@RateLimit('timetable')` and `RateLimitGuard` to `POST /api/timetable/generate` to prevent AI quota exhaustion and DoS.
- **Modified [backend/src/modules/timetable/timetable.service.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/timetable/timetable.service.ts)**:
  - Enforced Zod schema validation on constraints payload before disk persistence.
- **Modified [backend/src/modules/timetable/solver/ai-generator.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/timetable/solver/ai-generator.ts)**:
  - Removed `NEXT_PUBLIC_GEMINI_API_KEY` fallback to prevent key leakage in client bundles.
  - Converted Gemini API key authentication from URL query parameters (`?key=...`) to `x-goog-api-key` request header.
- **Modified [backend/src/modules/timetable/solver/job.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/timetable/solver/job.ts)**:
  - Added resilient fallback on job progress reporting queries.

#### 5. Frontend Middleware Hardening
- **Modified [frontend/middleware.ts](file:///c:/Users/windows/Fyimpcourseregistration/frontend/middleware.ts)**:
  - Implemented token claim extraction from `auth_token` JWT: role and expiration are validated directly from the signed JWT payload rather than trusting unsigned `user_role` cookie.
  - Prevents role spoofing and unauthorized dashboard access via developer tools cookie tampering.

---

### Verification Results
- **Backend Build (`nest build`)**: Successfully compiled with 0 TypeScript errors.
- **Frontend Build (`next build`)**: Successfully compiled all pages, SSR routes, and proxy middleware with 0 errors.

---

## Run: Geolocation Self-Origin Permission

### File Modified
- **Modified [frontend/next.config.ts](file:///c:/Users/windows/Fyimpcourseregistration/frontend/next.config.ts)**:
  - Changed `Permissions-Policy` header from `geolocation=()` → `geolocation=(self)`.
  - **Before**: Browser Geolocation API completely blocked for all contexts (page + iframes).
  - **After**: Browser Geolocation API allowed for same-origin pages only; still blocked inside embedded iframes.
