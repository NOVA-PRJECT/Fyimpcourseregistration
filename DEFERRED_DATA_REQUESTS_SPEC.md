# Deferred Feature Specification: "Request My Data" Pathway

> **STATUS: YET TO BUILD (DEFERRED)**  
> This feature was specified in the Privacy & Consent planning phase and is deliberately deferred per user instruction. When ready for implementation, the technical specifications below outline the complete data model, backend API contracts, and UI screens to build.

---

## 1. Overview & Objective
Provide an auditable self-service channel for students and faculty to submit data subject requests (Access, Correction, Deletion) in compliance with privacy regulations, routed to a tracked administrative queue for manual resolution by HODs and superadmins.

---

## 2. Database Schema (PostgreSQL)

```sql
CREATE TABLE IF NOT EXISTS data_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('access', 'correction', 'deletion')),
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'declined')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_requests_user ON data_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_status ON data_requests(status, submitted_at DESC);

-- Row Level Security
ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and submit their own data requests"
    ON data_requests FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and HODs can view and update data requests"
    ON data_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admins WHERE id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM faculty WHERE id = auth.uid() AND role IN ('hod', 'campus_director')
        )
    );
```

---

## 3. Backend Endpoints (NestJS)

### `POST /api/data-requests`
- **Access**: Any authenticated user
- **Payload**:
  ```json
  {
    "request_type": "access" | "correction" | "deletion",
    "details": "Correction needed for attendance in PHY201 week 3."
  }
  ```
- **Behavior**: Validates request type, inserts row with `status: 'pending'`, returns created record.

### `GET /api/data-requests/my`
- **Access**: Authenticated user
- **Behavior**: Returns all data requests submitted by the caller (`user_id = req.user.userId`), sorted by `submitted_at DESC`.

### `GET /api/data-requests`
- **Access**: `hod`, `campus_director`, `superadmin`
- **Behavior**:
  - For `hod`: Scoped to students and faculty belonging to the HOD's department.
  - For `superadmin` / `campus_director`: Scoped to the campus or global across all campuses.
  - Sorted pending first: `ORDER BY CASE WHEN status = 'pending' THEN 0 WHEN status = 'in_progress' THEN 1 ELSE 2 END, submitted_at DESC`.

### `PATCH /api/data-requests/:id`
- **Access**: `hod`, `campus_director`, `superadmin`
- **Payload**:
  ```json
  {
    "status": "in_progress" | "resolved" | "declined",
    "resolution_notes": "Attendance ledger adjusted after verifying teacher roster."
  }
  ```
- **Behavior**: Updates request status, records `resolved_by = req.user.userId` and `resolved_at = now()`.

---

## 4. Frontend Requirements (Next.js)

### User Facing (`/privacy/request-data` or `/dashboard/student/privacy`):
1. Request form with:
   - Type selector: Access, Correction, Deletion.
   - Multiline details textarea.
   - Submit button.
2. History Table:
   - Date submitted, Request Type, Status pill (`pending`, `in_progress`, `resolved`, `declined`).
   - Expansion view displaying admin `resolution_notes`.

### Administrative Queue (`/dashboard/hod/data-requests` and `/dashboard/superadmin/data-requests`):
1. Filterable list with priority badges for pending requests.
2. Modal/Drawer:
   - Requester name, email, department, role.
   - Full request text.
   - Status dropdown selector.
   - Resolution notes input.
   - Save button with audit logging.
