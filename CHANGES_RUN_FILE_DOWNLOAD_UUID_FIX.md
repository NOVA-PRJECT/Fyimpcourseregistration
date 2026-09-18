# Changes Run: Fix File Downloads & File Names for Teacher Dashboard (PDF) & HOD Dashboard (Excel)

Date: 2026-09-18

### What Was Requested
- Fix file download issue where the **Teacher Dashboard** attendance sheet was downloaded as a raw UUID string without a `.pdf` extension instead of a PDF file, and could not be opened.
- Fix the same problem for the **HOD Dashboard** Excel exports (attendance statement and student papers roster), which downloaded as a UUID string without an `.xlsx` extension and could not be opened.

### What Was Changed
1. **New Safe Client Download Utility**:
   - `frontend/src/core/utils/downloadFile.ts`: Created `downloadBlob(blob, filename, mimeType)` utility that:
     - Sets the explicit MIME type on the Blob (`application/pdf`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
     - Explicitly appends the temporary `<a>` element to `document.body` before calling `.click()` (guaranteeing that Chromium respects the `download` filename attribute rather than downloading an extension-less blob URL UUID).
     - Defers cleanup and `URL.revokeObjectURL()` by 60 seconds so the browser's background download manager finishes reading the full stream before URL revocation.

2. **Teacher Dashboard Attendance Sheet PDF**:
   - `frontend/src/core/utils/exportPdf.ts`:
     - Replaced `doc.save(fileName)` (which suffered from jsPDF's detached `<a>` element bug) with `doc.output('blob')` and `downloadBlob()`.
     - Sanitized course code in the filename (`(courseCode || 'COURSE').replace(/[^a-zA-Z0-9_-]/g, '_')`) to prevent invalid character fallback.

3. **HOD Dashboard Attendance Statement Export (XLSX)**:
   - `frontend/src/app/dashboard/hod/PeriodMarkingTab.tsx`:
     - Replaced immediate synchronous `window.URL.revokeObjectURL(url)` (which aborted the download stream) with `downloadBlob()`.
     - Enforced `.xlsx` extension on filename fallback.

4. **HOD Student Papers Roster & Director Timetable Excel Exports**:
   - `frontend/src/core/utils/exportExcel.ts`:
     - Replaced `XLSX.writeFile()` with `XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })` converted to an official OpenXML spreadsheet Blob, downloaded via `downloadBlob()`.
   - `frontend/src/app/dashboard/director/timetable/page.tsx`:
     - Replaced `XLSX.writeFile()` with `XLSX.write()` + `downloadBlob()`.

5. **Backend CORS & Service Hardening**:
   - `backend/src/main.ts`: Added `exposedHeaders: ['Content-Disposition']` to CORS settings so frontend clients can inspect the server's filename header.
   - `backend/src/modules/period-attendance/attendance-export.service.ts`: Handled null/undefined `department.code` defensively with fallback before `.replace()`.

### Verification Performed
- Validated that all modified files compile with proper types and no syntax errors.
- Verified that all browser file download entry points now route through `downloadBlob()` with explicit MIME types, DOM attachment, and delayed revocation.
