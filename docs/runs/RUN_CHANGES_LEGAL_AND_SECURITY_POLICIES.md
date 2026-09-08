# Run Changes: Terms of Use, Privacy Policy & Data Breach Response Plan

**Date**: 2026-09-08  
**Scope**: Adopt official departmental regulatory policies for Terms of Use and Privacy Policy, publish internal developer/admin Data Breach Response Plan, bump policy version to `2026-09-08`, and enforce explicit consent presentation on authentication.

---

## 1. Summary of Changes

### Documentation & Internal Playbook
- **[DATA_BREACH_RESPONSE_PLAN.md](file:///c:/Users/windows/Fyimpcourseregistration/DATA_BREACH_RESPONSE_PLAN.md)**:
  - Created internal developer/admin operational playbook for the FYIMP Management System (Department of Information Technology, Kannur University).
  - Outlined the 5 immediate steps in order:
    1. Contain it first (rotate secrets, take affected endpoint offline).
    2. Assess scope (data involved, affected user count; zero GPS data exposure assurance).
    3. Document timeline and root cause.
    4. Notify internally first (HOD / faculty sponsor), then affected users, then University IT Centre channels.
    5. Fix root cause, re-test (e.g. Strix scan), and confirm resolution.
  - Specified responsible roles (Technical Lead, Faculty/HOD Sponsor, User Communication).

### Legal & Regulatory Pages (Next.js 16 Frontend)
- **[terms-of-use/page.tsx](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/terms-of-use/page.tsx)**:
  - Replaced placeholder content with official 10-section regulatory text for Kannur University FYIMP:
    1. Acceptance of terms.
    2. What this System is — and is not (Crucial notice: System is a coordination aid, not official academic records; official marks/grades governed solely by University systems).
    3. Eligibility (FYIMP students, teaching staff, HODs, campus administrators; no public self-registration).
    4. Account confidentiality and non-transferability.
    5. Acceptable use (strict prohibition of proxy attendance marking and unauthorized data access).
    6. Attendance and academic data accuracy disclaimer.
    7. Availability and no warranty.
    8. Changes to System and Terms.
    9. Department contact information (`itcentre@kannuruniversity.ac.in`).
    10. Governing law of India.
- **[privacy-policy/page.tsx](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/privacy-policy/page.tsx)**:
  - Implemented the complete 13-section Privacy Policy with responsive tables and callouts:
    1. Scope and coordination nature of the system.
    2. Applicable user roles and under-18 student notice.
    3. Data collection table (Identity information, Academic coordination data, Attendance tracking, Account credentials).
    4. **Deliberately NOT collected or stored**:
       - **Zero GPS Storage**: Device location is checked only momentarily in client memory to confirm physical presence within campus boundaries, never written to database or tracked.
       - No marks, grades, SGPA, or CGPA.
       - No health or financial information.
    5. How data is used (solely for FYIMP operational workflows; aggregated AI timetable scheduling notice).
    6. Data residency: Amazon Web Services in **Mumbai (`ap-south-1`), India** via Supabase, Railway backend, and Upstash Redis.
    7. Data retention: practical coordination lifecycle; GPS never retained.
    8. Children's data (guidance for students under 18 and parent awareness).
    9. User rights: access, correction, deletion, and consent withdrawal.
    10. Security measures: role-based access control and TLS.
    11. Grievance officer contact (`itcentre@kannuruniversity.ac.in`).
    12. Policy version updates.
    13. Governing law: Information Technology Act, 2000 and Digital Personal Data Protection (DPDP) Act, 2023.
- **[privacy-policy.module.css](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/privacy-policy/privacy-policy.module.css)**:
  - Added `.tableWrapper` and `.dataTable` styles for responsive, dark-mode-optimized regulatory tables.

### Consent & Authentication Flow
- **[backend/src/modules/consent/consent.constants.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/consent/consent.constants.ts)**:
  - Bumped `CURRENT_POLICY_VERSION = '2026-09-08'`.
- **[consent/page.tsx](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/consent/page.tsx)**:
  - Updated default version state to `2026-09-08`.
  - Re-aligned summary bullet points and GPS disclaimer with the updated policy sections.
- **[login/page.tsx](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/login/page.tsx)**:
  - Removed silent background auto-consent execution during login.
  - Users who have not yet consented to the active policy version (`2026-09-08`) are explicitly redirected to `/consent` to review and agree before gaining access to dashboards.

---

## 2. Verification Results

| Suite | Command | Result |
|---|---|---|
| **Backend Build** | `npm run build --workspace=backend` | Succeeded with 0 errors |
| **Frontend Build** | `npm run build --workspace=frontend` | Succeeded with 0 errors (all 18 routes compiled & optimized) |

---

## 3. Reference Artifacts
- [DATA_BREACH_RESPONSE_PLAN.md](file:///c:/Users/windows/Fyimpcourseregistration/DATA_BREACH_RESPONSE_PLAN.md) — Internal incident response playbook.
- [implementation_plan.md](file:///C:/Users/windows/.gemini/antigravity-ide/brain/59343b79-c52d-4471-8674-2d9034f2870c/implementation_plan.md) — Approved implementation plan.
- [walkthrough.md](file:///C:/Users/windows/.gemini/antigravity-ide/brain/59343b79-c52d-4471-8674-2d9034f2870c/walkthrough.md) — Walkthrough documentation.
