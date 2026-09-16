# Run Summary: Remove Non-Existent `created_at` Column from `campus_settings` (Run 2026-09-16)

## 1. What Was Requested
The user reported the backend error log:
```
[BACKEND] [Nest] 19448  - 16/09/2026, 10:49:14 am   ERROR [RegistrationsService] Failed to query campus settings: column campus_settings.created_at does not exist
```
The user instructed: **"focus on that column not existing"**.

---

## 2. Root Cause Identified
In [`backend/src/modules/registrations/registrations.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/registrations/registrations.service.ts), `campus_settings` queries in `getBlueprint` and `submitCourses` were calling:
```ts
.order('created_at', { ascending: false }).limit(1)
```
The `campus_settings` table schema does not include a `created_at` column (columns are `id`, `campus_id`, `academic_year`, `min_credits`, `max_credits`, `deadline`, and `last_promoted_at`). Additionally, `campus_id` is unique (`UNIQUE REFERENCES campuses(id)`), so ordering is unnecessary and caused PostgreSQL/PostgREST to throw `column campus_settings.created_at does not exist`.

---

## 3. What Was Changed
In [`backend/src/modules/registrations/registrations.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/registrations/registrations.service.ts):
- Removed `.order('created_at', { ascending: false }).limit(1)` from `campus_settings` queries in both `getBlueprint` (around line 248) and `submitCourses` (around line 485).
- Queries now cleanly execute:
  ```ts
  this.supabase.admin
    .from('campus_settings')
    .select('deadline, min_credits, max_credits, academic_year')
    .eq('campus_id', campusId)
    .maybeSingle()
  ```

---

## 4. Verification
- NestJS dev server hot-reloaded the updated file with zero syntax/TypeScript errors.
- Querying `/api/registrations/blueprint` now successfully queries `campus_settings` without database column errors.
