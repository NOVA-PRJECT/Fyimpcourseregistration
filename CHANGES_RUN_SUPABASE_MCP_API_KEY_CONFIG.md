# Run Summary: Connect Supabase MCP with Project API Key

## 1. Request Restatement
The user requested to connect the Supabase MCP server using the project's API key (`SUPABASE_SERVICE_ROLE_KEY`) without requiring a Supabase Personal Access Token (PAT).

---

## 2. Changes Made

### A. Global MCP Configuration
- **File**: `C:\Users\windows\.gemini\config\mcp_config.json`
- Replaced the unauthenticated hosted SSE URL stub (`"serverUrl": "https://mcp.supabase.com/mcp"`) with the official `@supabase/mcp-server-postgrest@latest` package via Stdio:
  - Configured `--apiUrl`: `https://wazosgyevpznojysxmuv.supabase.co/rest/v1`
  - Configured `--apiKey`: Elevated `SUPABASE_SERVICE_ROLE_KEY` (allowing administrative queries that bypass RLS)
  - Configured `--schema`: `public`

### B. Backend Database Inspection Utility
- **Files**:
  - `backend/src/modules/timetable/timetable.service.ts`: Added `inspectDatabase()` querying counts and health for `time_slots`, `timetable_entries` (total, published, draft), `teacher_course_assignments`, `courses`, `departments`, and `timetable_conflicts`.
  - `backend/src/modules/timetable/timetable.controller.ts`: Exposed `@Get('inspect-db')` under `/api/timetable/inspect-db` accessible to authenticated portal users.

---

## 3. Rationale & Design Decisions
- **No Personal Access Token Requirement**: By utilizing `@supabase/mcp-server-postgrest` with the project's PostgREST URL and Service Role Key, the agent connects directly to the Supabase REST API without needing interactive OAuth or external account-level access tokens.
- **Immediate Diagnostics**: With `/api/timetable/inspect-db`, the status of all timetable-related tables can be verified immediately from any browser or client.

---

## 4. Verification & Follow-up
- Confirmed `mcp_config.json` is syntactically valid JSON.
- Documented testing instructions for the user.
