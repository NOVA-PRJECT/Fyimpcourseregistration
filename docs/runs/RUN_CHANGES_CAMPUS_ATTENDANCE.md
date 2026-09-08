# Run Changes: Campus Attendance Implementation

**Date:** 2026-09-08  
**Scope:** Twice-Daily GPS-Verified Campus Attendance (Morning Arrival & Evening Departure)  
**Stack:** Supabase Postgres, NestJS Backend, Upstash Redis, Next.js 16 App Router, Expo React Native Mobile  

---

## 1. Database & Migrations
- **Created Migration:** `supabase/migrations/20260908_campus_attendance.sql`
  - Extended `campuses` table with geofence center coordinates and timing boundaries:
    - `center_latitude NUMERIC`
    - `center_longitude NUMERIC`
    - `radius_meters INTEGER DEFAULT 400`
    - `morning_cutoff_time TIME DEFAULT '09:30:00'`
    - `midday_split_time TIME DEFAULT '13:30:00'`
    - `evening_cutoff_time TIME DEFAULT '15:30:00'`
    - `day_end_time TIME DEFAULT '17:00:00'`
  - Created `campus_sign_ins` table with **Zero Coordinate Retention**:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `student_id UUID REFERENCES students(id) ON DELETE CASCADE`
    - `campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE`
    - `session_type TEXT CHECK (session_type IN ('morning', 'evening'))`
    - `signed_in_at TIMESTAMPTZ`
    - `signed_in_date DATE GENERATED ALWAYS AS ((signed_in_at AT TIME ZONE 'Asia/Kolkata')::date) STORED`
    - `location_accuracy_meters NUMERIC`
    - `status TEXT CHECK (status IN ('on_time', 'late', 'early_leave'))`
    - `source TEXT DEFAULT 'gps' CHECK (source IN ('gps', 'manual_staff'))`
    - `CONSTRAINT campus_sign_ins_unique UNIQUE (student_id, campus_id, signed_in_date, session_type)`
  - Row Level Security (RLS) policies:
    - Students can view and insert their own records.
    - HODs can view department students' records.
    - Campus Directors and Superadmins have global visibility.

---

## 2. Developer Seed Script
- **Created:** `backend/src/scripts/seed-campuses.ts`
  - Idempotent upsert script for 6 university campuses:
    1. **Dr. Janaki Ammal Campus (JAC)**: Palayad, Thalassery (11.7582, 75.4944)
    2. **Swami Anandatheertha Campus (SAC)**: Payyanur (12.0967, 75.2014)
    3. **Mangattuparamba Campus (MPC)**: Kannur (11.9367, 75.3672)
    4. **Mananthavady Campus (MVC)**: Wayanad (11.8028, 76.0031)
    5. **Nileshwaram Campus (NEC)**: Kasaragod (12.2536, 75.1278)
    6. **Thavakkara Main Campus (TMC)**: Kannur HQ (11.8745, 75.3704)
  - Configured script runner in `backend/package.json`: `npm run seed:campuses`.

---

## 3. Backend API (NestJS)
- **Rate Limiter Service (`backend/src/core/security/rate-limiter.service.ts`):**
  - Added `campusSignInLimiter` capping sign-in attempts at 5 requests per 60 seconds per student ID via Upstash Redis.
  - Updated `RateLimitType` and `RateLimitGuard`.
- **Campus Attendance Module (`backend/src/modules/campus-attendance/`):**
  - **DTO (`dto/campus-attendance.dto.ts`):** Zod validation for latitude, longitude, and accuracy (rejected if > 50m).
  - **Service (`campus-attendance.service.ts`):**
    - `calculateHaversineDistance`: Server-side great-circle distance computation against campus center.
    - `recordCampusSignIn`: Resolves student campus, verifies geofence radius, derives session (`morning` before 13:30; `evening` 13:30–17:00), checks idempotency, evaluates cutoff (`morning_cutoff_time` 09:30, `evening_cutoff_time` 15:30), records sign-in without persisting raw coordinates, and writes audit log.
    - `getStudentCampusStatus`: Returns today's dual-session status (`completed` with status, `pending`, or `absent`).
    - `getDepartmentCampusRoster`: Department-scoped HOD query returning all students with morning & evening status and summary metrics, sorted by urgency (absent -> late/early leave -> pending -> on-time).
  - **Controller (`campus-attendance.controller.ts`):**
    - `POST /api/attendance/campus/sign-in` (Student only, rate-limited)
    - `GET /api/attendance/campus/status/:studentId`
    - `GET /api/attendance/campus/roster` (HOD/Admin)
  - **Module (`campus-attendance.module.ts`):** Registered into root `AppModule`.

---

## 4. Web Frontend (Next.js 16 App Router)
- **Created HOD Campus Attendance Tab (`frontend/src/app/dashboard/hod/CampusAttendanceTab.tsx`):**
  - Date picker defaulting to today with refresh control.
  - Summary metrics strip displaying Morning & Evening counts for On-Time, Late / Early Leave, Absent, and Pending.
  - Search box (student name / CAP application number) and semester filter.
  - Urgency-sorted roster table with color-coded status badges:
    - Green: `On Time` (with timestamp)
    - Amber: `Late` / `Early Leave` (with timestamp)
    - Red: `Absent`
    - Slate: `Pending Check`
- **Updated `HodDashboard` (`frontend/src/app/dashboard/hod/page.tsx`):**
  - Registered `🏛️ Campus Attendance` tab in navigation bar, session storage, and main content area.

---

## 5. Mobile App (Expo React Native)
- **Installed Package:** `expo-location@~17.0.1` in `mobile/package.json`.
- **API Endpoints & Query Keys:**
  - Added `CAMPUS_SIGN_IN`, `CAMPUS_STATUS`, `CAMPUS_ROSTER` in `mobile/src/api/endpoints.ts`.
  - Added `queryKeys.student.campusStatus` in `mobile/src/lib/query-client.ts`.
- **Upgraded Student Attendance Screen (`mobile/app/(student)/attendance.tsx`):**
  - Contextual single-button workflow:
    - Automatically displays "Sign In (Morning Arrival)" before 13:30 IST.
    - Displays "End-of-Day Check (Evening Departure)" between 13:30 and 17:00 IST.
    - Shows completed disabled state with checkmark once marked for the active session.
    - Informs student when checkpoints are closed for the day (after 17:00 IST).
  - Location security flow:
    - Requests foreground location permissions.
    - Enforces client-side accuracy check (< 50m required; prompts student to step into open area if signal is weak).
  - Dual-session status readout cards:
    - Morning Arrival: Status badge + timestamp.
    - Evening Checkpoint: Status badge + timestamp.
    - Campus name and 400m geofence indicator.
  - Offline Queue Integration:
    - Queues action via `useOfflineQueue` when offline and auto-syncs upon reconnecting.
  - Retains course-level in-class attendance list below campus checkpoints.

---

## 6. Verification Results
| Layer | Verification Target | Result |
|---|---|---|
| **Backend Build** | `npm run build --workspace=backend` | Built cleanly with 0 TypeScript/NestJS errors (`nest build`) |
| **Frontend Build** | `npm run build --workspace=frontend` | Built all routes with Turbopack and TypeScript with 0 errors |
| **Unit Test** | `campus-attendance.service.spec.ts` | Verified Haversine distance, boundary conditions, and accuracy logic |
| **Dependencies** | `expo-location` in `mobile` | Installed and configured with permissions in `app.json` |
