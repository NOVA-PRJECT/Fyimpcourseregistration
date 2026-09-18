# Changes Run: File Download Native File System Picker & Data URL Fallback Engine

Date: 2026-09-18

### What Was Requested
- The user reported: "still same issue not gone" regarding the teacher attendance register PDF and HOD Excel exports downloading as raw UUID strings without extensions (e.g., `85896719-4f70-42ca-938d-4e42aa9abc3f`) and failing to open when double-clicked.

### What Was Changed
1. **Upgraded `frontend/src/core/utils/downloadFile.ts` to a Multi-Tiered Download Engine**:
   - **Tier 1 (Native File System Access API - `showSaveFilePicker`)**:
     - Supported natively on modern Chrome, Edge, and Opera on Windows desktop.
     - Directly opens the native Windows "Save As" file dialog with the exact suggested filename (e.g., `Attendance_MATH101_2026-09.pdf`, `Student_Papers_Sem_1.xlsx`) and file type filter pre-selected.
     - Bypasses external download managers (like Internet Download Manager / IDM) and browser URL heuristics completely.
     - Directly writes the binary stream to disk using `FileSystemWritableFileStream`, eliminating truncated or 0-byte downloads.
     - Gracefully ignores `AbortError` if the user clicks "Cancel".
   - **Tier 2 (Base64 Data URL Fallback)**:
     - Converts the binary Blob into a base64 Data URL via `FileReader.readAsDataURL()`.
     - Data URLs have no URL path or UUID segment, preventing Chromium and external download managers from falling back to UUID names.
     - External download managers (IDM) do not intercept Data URLs.
     - Forces the browser to honor `a.download = filename`.
   - **Tier 3 (Clean Anchor Object URL Fallback)**:
     - Stripped `a.rel = 'noopener noreferrer'` from programmatic download anchors, which previously caused Chromium to treat downloads as anonymous/cross-origin and discard the `download` filename.

2. **Caller Upgrades & Proper Await Integration**:
   - `frontend/src/core/utils/exportPdf.ts`: Updated `generateAttendanceSheet` to await `downloadBlob()`.
   - `frontend/src/core/utils/exportExcel.ts`: Made `downloadStudentsExcel` async and awaited `downloadBlob()`.
   - `frontend/src/app/dashboard/hod/PeriodMarkingTab.tsx`: Awaited `downloadBlob()` in `handleExportStatement`.
   - `frontend/src/app/dashboard/hod/page.tsx`: Awaited `downloadStudentsExcel()` in `handleExportExcel`.
   - `frontend/src/app/dashboard/director/timetable/page.tsx`: Awaited `downloadBlob()` in `handleExportExcel`.

### Why This Resolves the Root Cause
- Blob URLs (`blob:http://localhost:3000/<uuid>`) inherently contain an opaque UUID as the URL endpoint. If Chromium ignores the `download` attribute (triggered by `rel="noreferrer"`) or if an external tool (IDM) intercepts the request, the file gets saved as that raw UUID string with no extension.
- By providing the Native File Picker (`showSaveFilePicker`) as the primary path and Base64 Data URL as the secondary path, no UUID URL is ever presented to external download tools or the browser's URL parser.

### Verification Steps
1. Navigate to Teacher Dashboard (`http://localhost:3000/dashboard/teacher`).
2. Click **📄 Download Attendance Sheet (PDF)** and trigger **Download PDF**.
3. Confirm the Windows "Save As" dialog opens with `Attendance_<CourseCode>_<Year-Month>.pdf` pre-filled, or downloads directly with that name and `.pdf` extension.
4. Open the downloaded PDF in Acrobat Reader / Chrome to confirm all student rows, signatures, and headers render properly.
5. In HOD Dashboard (`http://localhost:3000/dashboard/hod`), test **📊 Export Excel** and **Export Statement (XLSX)** to verify `.xlsx` files save and open cleanly in Excel.
