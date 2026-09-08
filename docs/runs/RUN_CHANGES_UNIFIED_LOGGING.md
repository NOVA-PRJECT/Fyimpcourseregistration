# Run Changes: Unified Logging & Operations Consolidation

## Summary of Accomplishments

This run merged and consolidated the three separate logging and operational tracking tables:
1. **`audit_logs`** (System audit trail for security and administrative events)
2. **`timetable_generation_jobs`** (Asynchronous AI timetable generation status and progress)
3. **`allocation_runs`** (Course allocation algorithm execution runs)

into a single, high-performance, unified PostgreSQL table: **`system_logs`**.

---

## Changes Detailed by Component

### 1. Database Migration: `system_logs` & Zero-Downtime Views
**File**: `supabase/migrations/20260908_merge_logging_and_job_tables.sql`

- **Created Unified `system_logs` Table**:
  - `id`: UUID Primary Key (`gen_random_uuid()`).
  - `log_type`: Discriminator (`'audit_event'`, `'timetable_job'`, `'allocation_run'`, `'server_error'`).
  - `status`: Unified operational state (`'queued'`, `'running'`, `'completed'`, `'failed'`, `'success'`, `'failure'`).
  - `progress`: Smallint progress percentage (0 - 100) for batch jobs.
  - `error_message` & `error_stack`: Error diagnostics.
  - `campus_id`, `academic_year`, `semester`: Multi-campus and academic period scoping.
  - `user_id` & `user_role`: Actor identification (supports both authenticated actors and system background tasks).
  - `event_type`, `action`, `resource_type`, `resource_id`: Rich audit event identifiers.
  - `ip_address`, `user_agent`, `route`: Network and client diagnostics.
  - `metadata`: Flexible JSONB payload for domain-specific context.
  - `started_at`, `completed_at`, `created_at`, `updated_at`: Comprehensive execution timeline metrics.

- **High-Efficiency Composite Indexes**:
  - `idx_system_logs_type_created`: `(log_type, created_at DESC)`
  - `idx_system_logs_job_lookup`: `(log_type, campus_id, academic_year, semester, created_at DESC)`
  - `idx_system_logs_running_jobs`: Partial index on active jobs (`status IN ('queued', 'running')`)
  - `idx_system_logs_user_id`: Filtered index for actor lookups (`WHERE user_id IS NOT NULL`)
  - `idx_system_logs_audit_events`: `(log_type, event_type, created_at DESC)`
  - `idx_system_logs_metadata_gin`: GIN index on `metadata` JSONB for deep attribute queries.

- **Automated Data Backfill**:
  - Automatically backfills existing rows from `audit_logs` into `system_logs` with `log_type = 'audit_event'`.
  - Automatically backfills existing rows from `timetable_generation_jobs` into `system_logs` with `log_type = 'timetable_job'`.
  - Automatically backfills existing rows from `allocation_runs` into `system_logs` with `log_type = 'allocation_run'`.
  - Renames base tables to `_legacy` backups to prevent data loss.

- **Updatable Compatibility Views with `INSTEAD OF` Triggers**:
  - **`timetable_generation_jobs` VIEW**: Selects, inserts, and updates against `system_logs WHERE log_type = 'timetable_job'`.
  - **`allocation_runs` VIEW**: Selects, inserts, and updates against `system_logs WHERE log_type = 'allocation_run'`.
  - **`audit_logs` VIEW**: Selects and inserts against `system_logs WHERE log_type = 'audit_event'`.
  - Guarantees that any legacy SQL queries, ORM calls, or Supabase REST queries continue to function seamlessly without downtime.

- **Updated RPC Function `apply_course_allocation`**:
  - Updated to mark the completion of the allocation run directly on `system_logs WHERE id = p_run_id AND log_type = 'allocation_run'`.

- **Row-Level Security (RLS)**:
  - Enabled on `system_logs`.
  - Selective update policy: only batch jobs (`timetable_job`, `allocation_run`) can be mutated; `audit_event` entries remain strictly immutable for security compliance.

---

### 2. Backend Logging Services
- **`backend/src/core/logging/audit-logger.service.ts`**:
  - Updated to insert into unified `system_logs` with `log_type: 'audit_event'`.
  - Added seamless fallback to `audit_logs` view/legacy table if `system_logs` is not yet applied in the target database.
- **`backend/src/core/logging/server-logger.service.ts`**:
  - Updated to insert into unified `system_logs` with `log_type: 'server_error'`.
  - Added seamless fallback to `server_error_logs`.

---

## Instructions for Applying to Supabase

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run the migration script located at:
   `supabase/migrations/20260908_merge_logging_and_job_tables.sql`
3. The migration will:
   - Create `system_logs` with all indexes and RLS policies.
   - Migrate all existing records from the 3 tables into `system_logs`.
   - Rename existing tables to `_legacy` backups.
   - Create updatable compatibility views with the exact same names and columns.
