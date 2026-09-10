# Google Stitch UI Redesign: Modular Prompt Handbook

This handbook contains streamlined, clutter-free prompts designed specifically for **Google Stitch**.

Each entry has two distinct parts:
1. **Current System UI Reference (For Your Reference)**: Shows the current frontend file path, existing components, and system context. This stays **outside** the prompt box.
2. **Google Stitch Prompt (Copy-Paste Box)**: The exact, clean prompt to copy into Google Stitch. It contains only essential UI elements, realistic minimal sample data, clear button labels, and strict anti-clutter rules.

---

# Table of Contents
1. [Section 1: Public & Authentication](#section-1-public--authentication)
   - [Screen 1.1: Institutional Landing Page](#screen-11-institutional-landing-page)
   - [Screen 1.2: Multi-Role Sign-In](#screen-12-multi-role-sign-in)
   - [Screen 1.3: Password Recovery](#screen-13-password-recovery)
   - [Screen 1.4: Policy & Legal Reader](#screen-14-policy--legal-reader)
2. [Section 2: Student Experience](#section-2-student-experience)
   - [Screen 2.1: Privacy Consent & Setup](#screen-21-privacy-consent--setup)
   - [Screen 2.2: Student Dashboard](#screen-22-student-dashboard)
   - [Screen 2.3: Course Registration & Elective Ranking](#screen-23-course-registration--elective-ranking)
   - [Screen 2.4: Credit Ledger & Transcript](#screen-24-credit-ledger--transcript)
   - [Screen 2.5: Campus Geofenced Sign-In](#screen-25-campus-geofenced-sign-in)
3. [Section 3: Course Teacher (Personalized)](#section-3-course-teacher-personalized)
   - [Screen 3.1: Teacher Course Hub](#screen-31-teacher-course-hub)
   - [Screen 3.2: Class Roster View](#screen-32-class-roster-view)
   - [Screen 3.3: Period Attendance Marking](#screen-33-period-attendance-marking)
4. [Section 4: Head of Department (HOD)](#section-4-head-of-department-hod)
   - [Screen 4.1: Department Overview](#screen-41-department-overview)
   - [Screen 4.2 (Tab 1): Curriculum Blueprint Builder](#screen-42-tab-1-curriculum-blueprint-builder)
   - [Screen 4.3 (Tab 2): Course Catalog & Rules](#screen-43-tab-2-course-catalog--rules)
   - [Screen 4.4 (Tab 3): Faculty Course Assignment](#screen-44-tab-3-faculty-course-assignment)
   - [Screen 4.5 (Tab 4): Student Directory & Bulk Upload](#screen-45-tab-4-student-directory--bulk-upload)
   - [Screen 4.6 (Tab 5): Manual Course Allocation](#screen-46-tab-5-manual-course-allocation)
   - [Screen 4.7 (Tab 6): Campus Attendance Monitoring](#screen-47-tab-6-campus-attendance-monitoring)
   - [Screen 4.8 (Tab 7): Period Attendance Auditing](#screen-48-tab-7-period-attendance-auditing)
5. [Section 5: Campus Director](#section-5-campus-director)
   - [Screen 5.1: Governance Overview](#screen-51-governance-overview)
   - [Screen 5.2 (Tab 1): Registration Window Controls](#screen-52-tab-1-registration-window-controls)
   - [Screen 5.3 (Tab 2): Course Allocation Engine](#screen-53-tab-2-course-allocation-engine)
   - [Screen 5.4 (Tab 3): Timetable Scheduler & Publishing](#screen-54-tab-3-timetable-scheduler--publishing)
   - [Screen 5.5 (Tab 4): Student Cohort Promotion](#screen-55-tab-4-student-cohort-promotion)
   - [Screen 5.6 (Tab 5): Multi-Department Reports Export](#screen-56-tab-5-multi-department-reports-export)
6. [Section 6: SuperAdmin](#section-6-superadmin)
   - [Screen 6.1: Infrastructure Overview](#screen-61-infrastructure-overview)
   - [Screen 6.2 (Tab 1): Campus Management](#screen-62-tab-1-campus-management)
   - [Screen 6.3 (Tab 2): Department Directory](#screen-63-tab-2-department-directory)
   - [Screen 6.4 (Tab 3): Faculty Directory & Roles](#screen-64-tab-3-faculty-directory--roles)
   - [Screen 6.5 (Tab 4): Security & System Audit Logs](#screen-65-tab-4-security--system-audit-logs)

---

# Section 1: Public & Authentication

### Screen 1.1: Institutional Landing Page

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/page.tsx`
- **Current UI**: University banner with crest, hero text introducing the FYIMP NEP-2020 framework, "Go to Portal Login" button, three feature cards explaining multidisciplinary degrees, and footer links.

```text
Design a modern, prestigious university portal landing page for an academic institution.

Key sections to include:
1. Header:
   - University logo and name: "Apex State University"
   - Accreditation tag: "NAAC A++ Accredited • NEP 2020 Compliant"
   - Button: "Sign In"
2. Hero Section:
   - Headline: "Four-Year Integrated Multidisciplinary Programme"
   - Subheading: "Flexible academic pathways, transparent credit accumulation, and automated course allocation."
   - Primary button: "Enter Student & Faculty Portal"
   - Secondary button: "View Academic Regulations"
3. Feature Overview (Clean cards):
   - Card 1: "Multidisciplinary Pathways" — Major, Minor, Multi-Disciplinary (MDC), and Skill courses.
   - Card 2: "Fair Algorithmic Allocation" — Merit and preference-based elective seat distribution.
   - Card 3: "Digital Credit Ledger" — Real-time progress tracking toward degree completion.
4. Portal Access Shortcuts:
   - Quick links for: "Student Portal", "Faculty & HOD", "Campus Director", "Central Admin".
5. Footer:
   - Links: "Privacy Policy", "Terms of Use", "Help Desk".
   - Institutional copyright line.

Style instructions:
- Clean, uncluttered layout with generous whitespace and high-contrast typography.
- No filler paragraphs, no lorem ipsum, no markdown symbols, and no developer notes.
```

---

### Screen 1.2: Multi-Role Sign-In

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/login/page.tsx`
- **Current UI**: Centered dark card with university logo, identifier input, password input with toggle, "Forgot Password?" link, primary "Sign In" button, and contextual error banners.

```text
Design a secure, modern sign-in page for a university academic portal.

Key elements to include:
1. Header:
   - University crest and title: "Apex State University"
   - Subtitle: "Academic Governance Portal"
2. Sign-In Form:
   - Input field: "University Email or Roll Number" (placeholder: "name@apex.edu.in")
   - Input field: "Password" with a show/hide password icon
   - Checkbox: "Keep me signed in on this device"
   - Link: "Forgot Password?"
   - Primary action button: "Sign In"
3. Security Notice:
   - Subtle trust badge: "Protected by Single Sign-On • 256-bit Encryption"
4. Help & Legal:
   - Contact line: "Need help? Contact campus IT support"
   - Links: "Privacy Policy", "Terms of Service"

Style instructions:
- Minimalist card or split layout with high visual polish.
- Clean input fields with clear focus states.
- Do NOT include long paragraphs, dummy disclaimer essays, or markdown symbols.
```

---

### Screen 1.3: Password Recovery

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/reset-password/page.tsx`
- **Current UI**: Centered recovery card with email input, "Send Reset Link" button, inline success alert, and back to login link.

```text
Design a clean password recovery screen for a university portal.

Key elements to include:
1. Header:
   - University crest icon
   - Title: "Reset Your Password"
   - Brief instruction: "Enter your registered university email to receive a password reset link."
2. Form:
   - Input field: "University Email Address" (placeholder: "student@apex.edu.in")
   - Primary button: "Send Recovery Link"
3. Confirmation State (Subtle notification preview):
   - Success badge: "Reset link sent! Please check your university inbox."
4. Navigation:
   - Link: "Back to Sign In"

Style instructions:
- Clean, focused card interface.
- Minimal text, high clarity, reassuring professional feel.
- No filler paragraphs, no developer labels, and no markdown symbols.
```

---

### Screen 1.4: Policy & Legal Reader

**Current System UI Reference (For Reference Only)**:
- **Files**: `frontend/src/app/privacy-policy/page.tsx`, `frontend/src/app/terms-of-use/page.tsx`
- **Current UI**: Structured policy reader with section index, legal clauses, Grievance Officer details, and back-to-home button.

```text
Design a clean, readable policy and legal documentation viewer for a university.

Key elements to include:
1. Header:
   - Document title: "Data Protection & Privacy Policy"
   - Metadata badge: "Effective: Academic Year 2026-27 • Version 2.4"
   - Button: "Back to Home"
2. Sidebar Navigation (Policy Sections):
   - "1. Information We Collect"
   - "2. Purpose of Processing (Course Allocation & Attendance)"
   - "3. Geofence & Location Privacy (Zero Coordinate Retention)"
   - "4. Student Rights & Data Access"
   - "5. Grievance Redressal Officer"
3. Content Area:
   - Clean typography with structured headings and numbered clauses.
   - Highlight box: "Location Privacy Guarantee: GPS coordinates are verified ephemerally at check-in and are never retained or tracked continuously."
4. Officer Contact Card:
   - Name: "Dr. K. Sharma", Title: "Chief Data Protection Officer", Email: "dpo@apex.edu.in".

Style instructions:
- High-legibility editorial layout with comfortable line spacing.
- Clean document outline, no cluttered badges, and no markdown symbols.
```

---

# Section 2: Student Experience

### Screen 2.1: Privacy Consent & Setup

**Current System UI Reference (For Reference Only)**:
- **Files**: `frontend/src/components/ConsentGate.tsx`, `frontend/src/app/change-password/page.tsx`
- **Current UI**: Modal blocking dashboard on first login, requiring policy acceptance and setting a new personal password.

```text
Design a first-time student onboarding and privacy consent modal screen.

Key elements to include:
1. Welcome Header:
   - Title: "Welcome to Apex Portal"
   - Subtitle: "Complete your initial setup to access your academic dashboard."
2. Step Indicator:
   - Step 1: "Privacy Consent" (Active)
   - Step 2: "Set Secure Password"
3. Consent Section:
   - Clean bullet points:
     - "Academic Record Processing: Used for course registration and transcript generation."
     - "Campus Attendance Verification: Verified via geofenced sign-in twice daily."
     - "Elective Allocation: Processed fairly according to university merit rules."
   - Checkbox: "I have read and agree to the Academic Data Policy and Terms of Use."
4. Password Setup:
   - Input: "New Password"
   - Input: "Confirm Password"
   - Password strength meter: "Strong"
5. Action Button:
   - Primary button: "Accept & Enter Portal"

Style instructions:
- Reassuring, modern modal or centered wizard.
- Clean checkboxes and simple strength meter.
- No legal essay walls, no filler text, and no markdown symbols.
```

---

### Screen 2.2: Student Dashboard

**Current System UI Reference (For Reference Only)**:
- **Files**: `frontend/src/app/dashboard/student/page.tsx`, `StudentDashboardClient.tsx`
- **Current UI**: Student profile header, status banner, active semester credit counter, GPS attendance card, registered course cards, and registration action button.

```text
Design a modern, comprehensive student academic dashboard.

Key elements to include:
1. Student Profile Banner:
   - Student Name: "Aditi Rao"
   - Roll Number: "2026-UG-CS-042" • "B.Tech Computer Science • Semester 3"
   - Badges: "Campus: Main Campus", "Academic Standing: Good"
2. Academic Summary Stats (4 metric cards):
   - Card 1: "Total Credits Earned" — "44 / 160"
   - Card 2: "Current Semester Credits" — "20 Credits Registered"
   - Card 3: "Registration Status" — "Confirmed" (Green badge)
   - Card 4: "Attendance Rate" — "92.4% (Campus) • 88.0% (Classes)"
3. Primary Action Alert:
   - Banner: "Semester 3 Course Registration is OPEN • Deadline: Oct 15, 2026"
   - Button: "View Registration & Preferences"
4. My Enrolled Courses (Clean table or card grid):
   - Row 1: "KU01DSCCSE301" — "Data Structures & Algorithms" • "Major (DSC)" • "4 Credits" • "Prof. A. Nambiar" • Status: "Enrolled"
   - Row 2: "KU01DSCCSE302" — "Database Management Systems" • "Major (DSC)" • "4 Credits" • "Dr. P. Nair" • Status: "Enrolled"
   - Row 3: "KU01MDCPHY201" — "Quantum Mechanics Basics" • "Minor (MDC)" • "3 Credits" • "Dr. V. Menon" • Status: "Allocated (Rank 1)"
   - Row 4: "KU01SECCSE201" — "Full-Stack Web Development" • "Skill (SEC)" • "3 Credits" • "Prof. R. Varma" • Status: "Allocated (Rank 1)"
5. Quick Links:
   - "Download Semester Roster", "View Full Transcript", "Campus Sign-In".

Style instructions:
- Polished, elegant dark or light mode dashboard.
- Clear typographic hierarchy, high-contrast badges, and spacious layout.
- No filler paragraphs, no developer labels, and no markdown symbols.
```

---

### Screen 2.3: Course Registration & Elective Ranking

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/student/register/page.tsx`
- **Current UI**: Multi-slot registration form with fixed courses locked and elective dropdowns providing 1st, 2nd, and 3rd rank choices, plus submit button.

```text
Design a student course registration screen with 3-tier ranked elective preferences.

Key elements to include:
1. Header & Guidance:
   - Title: "Course Registration — Semester 3"
   - Deadline notice: "Registration Closes in 4 Days (Oct 15, 2026, 11:59 PM)"
   - Credit requirement indicator: "Required: 20 Credits • Selected: 20 Credits"
2. Section 1: Fixed Mandatory Courses (Locked cards):
   - Course 1: "Data Structures & Algorithms (KU01DSCCSE301)" • "Major Core" • "4 Credits" • Badge: "Mandatory Core"
   - Course 2: "Database Management Systems (KU01DSCCSE302)" • "Major Core" • "4 Credits" • Badge: "Mandatory Core"
3. Section 2: Elective Selection (3-Tier Ranking Slots):
   - Slot A: "Multidisciplinary Course (MDC) — 3 Credits"
     - Select 1st Choice (Primary): "Introduction to Astronomy (KU01MDCPHY201)"
     - Select 2nd Choice (Backup): "Environmental Economics (KU01MDCECO202)"
     - Select 3rd Choice (Backup): "Psychology of Human Behavior (KU01MDCPSY203)"
   - Slot B: "Skill Enhancement Course (SEC) — 3 Credits"
     - Select 1st Choice: "Full-Stack Web Development (KU01SECCSE201)"
     - Select 2nd Choice: "Cloud Infrastructure Fundamentals (KU01SECCSE202)"
     - Select 3rd Choice: "Data Analysis with Python (KU01SECDAT203)"
4. Submission Area:
   - Summary card: "Total Papers: 5 • Total Credits: 20"
   - Button: "Submit & Lock Registration"
   - Secondary button: "Save Draft"

Style instructions:
- Visual distinction between locked core papers and interactive preference slots.
- Intuitive rank indicators (1st Choice, 2nd Choice, 3rd Choice).
- No filler text, no developer notes, and no markdown symbols.
```

---

### Screen 2.4: Credit Ledger & Transcript

**Current System UI Reference (For Reference Only)**:
- **Files**: `frontend/src/app/dashboard/student/CreditLedgerView.tsx`, `credit-ledger/[studentId]/page.tsx`
- **Current UI**: Progress bar showing earned credits by NEP category (Major, Minor, MDC, AEC, SEC, VAC) and collapsible semester-by-semester course tables.

```text
Design an academic credit ledger and cumulative transcript screen for a student.

Key elements to include:
1. Header:
   - Title: "Academic Credit Ledger & Degree Progress"
   - Student details: "Aditi Rao • Roll: 2026-UG-CS-042 • Current Semester: 3"
   - Action: "Download Official Transcript (PDF)"
2. Degree Progress Summary (Progress bars & metrics):
   - Overall Progress: "44 / 160 Total Credits Completed (27.5%)"
   - Category Breakdown:
     - "Major (DSC)": 24 / 80 credits completed
     - "Minor (DSE)": 8 / 32 credits completed
     - "Multidisciplinary (MDC)": 6 / 12 credits completed
     - "Ability Enhancement (AEC)": 4 / 8 credits completed
     - "Skill Enhancement (SEC)": 2 / 16 credits completed
3. Semester History (Clean accordion or tabs):
   - Semester 1 (Passed • 22 Credits Earned • SGPA: 8.65):
     - Table: Course Code, Course Title, Category, Credits, Grade (A+, A, B+).
   - Semester 2 (Passed • 22 Credits Earned • SGPA: 8.80):
     - Table: Course Code, Course Title, Category, Credits, Grade.
   - Semester 3 (In Progress • 20 Credits Registered):
     - Status badge: "Currently Enrolled"

Style instructions:
- Elegant educational dashboard with sleek progress indicators.
- Clean tabular data with high contrast and legible typography.
- No filler paragraphs, no developer jargon, and no markdown symbols.
```

---

### Screen 2.5: Campus Geofenced Sign-In

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/student/CampusSignInCard.tsx`
- **Current UI**: Card showing morning/evening attendance badges, location status, and "Verify Campus Presence (GPS Sign-In)" button.

```text
Design a campus physical attendance GPS sign-in widget or screen for students.

Key elements to include:
1. Card Header:
   - Title: "Daily Campus Presence Verification"
   - Date: "Wednesday, October 14, 2026"
   - Campus Location: "Main Academic Campus (North Gate Geofence)"
2. Daily Checkpoint Status (2 status indicators):
   - Checkpoint 1: "Morning Arrival (AM)" — Status: "Present • Checked in at 08:42 AM" (Green checkmark)
   - Checkpoint 2: "Evening Departure (PM)" — Status: "Pending (Window opens at 03:30 PM)" (Orange badge)
3. Location Verification Status:
   - Geofence status: "Inside Campus Boundary (Accuracy: ±6 meters)"
   - Privacy guarantee badge: "Zero Coordinate Retention: Location verified ephemerally"
4. Primary Action:
   - Button: "Verify Campus Presence (GPS Sign-In)"
   - Sub-action: "Refresh Location"

Style instructions:
- Clean, high-tech check-in card or screen.
- Clear visual cues for on-time verification.
- No technical error code dumps, no filler text, and no markdown symbols.
```

---

# Section 3: Course Teacher (Personalized)

### Screen 3.1: Teacher Course Hub

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/teacher/page.tsx`
- **Current UI**: Teacher header with assigned course count, cards for each course assigned to this specific teacher, and quick actions to view roster or take attendance.

```text
Design a personalized course management dashboard for a university professor.

Key elements to include:
1. Instructor Header:
   - Professor Name: "Prof. Arvind Nambiar"
   - Designation: "Assistant Professor • Department of Computer Science"
   - Badge: "Role: Course Teacher • 3 Assigned Courses This Semester"
2. Overview Metrics (3 stat cards):
   - Card 1: "Total Students Taught" — "168 Enrolled"
   - Card 2: "Today's Scheduled Lectures" — "2 Classes Today"
   - Card 3: "Average Class Attendance" — "89.2%"
3. My Assigned Courses (Card grid):
   - Course Card 1:
     - Title: "Data Structures & Algorithms" (KU01DSCCSE301)
     - Batch: "B.Tech CS • Semester 3 • Section A"
     - Enrollment: "64 Students" • "Credits: 4"
     - Next Lecture: "Today at 10:00 AM • Room 304"
     - Actions: "View Class Roster", "Mark Attendance"
   - Course Card 2:
     - Title: "Design & Analysis of Algorithms" (KU01DSCCSE501)
     - Batch: "B.Tech CS • Semester 5 • Section B"
     - Enrollment: "58 Students" • "Credits: 4"
     - Actions: "View Class Roster", "Mark Attendance"
   - Course Card 3:
     - Title: "Full-Stack Web Development" (KU01SECCSE201)
     - Batch: "NEP Skill Basket • Semester 3"
     - Enrollment: "46 Students" • "Credits: 3"
     - Actions: "View Class Roster", "Mark Attendance"

Style instructions:
- Clean, focused faculty workspace.
- Clear cards with prominent lecture timings and action buttons.
- No filler paragraphs, no developer labels, and no markdown symbols.
```

---

### Screen 3.2: Class Roster View

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/teacher/page.tsx` (Roster section)
- **Current UI**: Table showing enrolled students for the selected course, roll numbers, attendance percentages, and export button.

```text
Design a student class roster screen for a university teacher.

Key elements to include:
1. Page Header:
   - Course Title: "Data Structures & Algorithms (KU01DSCCSE301)"
   - Batch: "Semester 3 • Section A • 64 Enrolled Students"
   - Action: "Export Roster (Excel / CSV)"
   - Navigation: "Back to My Courses"
2. Search & Filter Bar:
   - Search input: "Search by student name or roll number..."
   - Filter dropdown: "Attendance: All, Below 75%, Above 90%"
3. Student Roster Table:
   - Column 1: "Roll Number" (e.g. 2026-UG-CS-001)
   - Column 2: "Student Name" (e.g. Aarav Patel)
   - Column 3: "Parent Department" (e.g. Computer Science)
   - Column 4: "Classes Attended" (e.g. 22 / 24)
   - Column 5: "Attendance %" (e.g. 91.6% • Green chip)
   - Column 6: "Status" (e.g. Enrolled)
   - Column 7: "Actions" (View Student Profile icon)
4. Footer:
   - Pagination: "Showing 1-15 of 64 students"
   - Summary stat: "3 students currently below mandatory 75% attendance"

Style instructions:
- Professional data table with crisp row borders and clear status chips.
- Clean typography and ample padding.
- No filler text, no developer notes, and no markdown symbols.
```

---

### Screen 3.3: Period Attendance Marking

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/teacher/page.tsx` (Attendance marking mode)
- **Current UI**: Interactive grid where teacher selects date, period (1 to 6), and toggles Present/Absent/Late for each student, followed by submit.

```text
Design an interactive period attendance marking screen for classroom teachers.

Key elements to include:
1. Session Header:
   - Course: "Data Structures & Algorithms (KU01DSCCSE301)"
   - Date selector: "Wednesday, October 14, 2026"
   - Period selector: "Period 2 (10:00 AM - 11:00 AM)"
   - Classroom: "Lecture Hall 304"
2. Quick Action Toolbar:
   - Stat chip: "Total: 64 | Present: 58 | Absent: 6"
   - Button: "Mark All Present"
   - Button: "Clear All"
3. Student Attendance List:
   - Student item:
     - Avatar & Name: "Aarav Patel"
     - Roll Number: "2026-UG-CS-001"
     - Toggle buttons: "Present" (Green), "Absent" (Red), "Late" (Yellow)
   - Show 4-5 sample student rows with toggled states.
4. Submission Bar:
   - Confirmation notice: "Attendance will be locked and synced to university records."
   - Primary button: "Submit & Finalize Attendance"
   - Secondary button: "Save Draft"

Style instructions:
- Fast, tactile attendance marking interface with high tap targets.
- Clear color indicators for Present, Absent, and Late.
- No filler paragraphs, no developer labels, and no markdown symbols.
```

---

# Section 4: Head of Department (HOD)

### Screen 4.1: Department Overview

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/hod/page.tsx`
- **Current UI**: Department profile banner, high-level metrics, 7 departmental tab navigation buttons, and operational alerts.

```text
Design an executive dashboard overview for a university Head of Department (HOD).

Key elements to include:
1. Department Header:
   - Title: "Department of Computer Science & Engineering"
   - HOD: "Dr. Sunita Rao, Head of Department"
   - Campus: "North Campus"
2. Department Metric Cards (4 cards):
   - Card 1: "Enrolled Students" — "348 Active Students"
   - Card 2: "Active Faculty" — "18 Faculty Members"
   - Card 3: "Course Offerings" — "24 Courses This Semester"
   - Card 4: "Unallocated Students" — "0 (100% Seats Resolved)" (Green badge)
3. Navigation Tabs (Clean horizontal tab bar):
   - Tab 1: "Curriculum Blueprint"
   - Tab 2: "Courses & Rules"
   - Tab 3: "Faculty Assignment"
   - Tab 4: "Student Directory"
   - Tab 5: "Manual Allocation"
   - Tab 6: "Campus Attendance"
   - Tab 7: "Period Attendance Audit"
4. Operational Alerts & Recent Activity:
   - Alert: "Registration window closes in 4 days. 312 of 348 students registered."
   - Button: "Review Pending Registrations"

Style instructions:
- Authoritative, clean academic leadership dashboard.
- Spacious layout, clear navigation tabs, and prominent metric cards.
- No filler paragraphs, no developer notes, and no markdown symbols.
```

---

### Screen 4.2 (Tab 1): Curriculum Blueprint Builder

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/hod/BlueprintTab.tsx`
- **Current UI**: Semester selector (Sem 1 to 8), pathway config, slot builder (Slot 1 to 6) assigning slot types (Fixed vs Global Basket), and save button.

```text
Design a curriculum blueprint and pathway builder interface for an academic department.

Key elements to include:
1. Top Controls:
   - Semester selector pills: "Semester 1", "Semester 2", "Semester 3" (Active), "Semester 4", etc.
   - Pathway selector: "Computer Science Standard Pathway (NEP-2020)"
   - Action button: "Save Blueprint Configuration"
2. Semester Pathway Summary:
   - Total Credits: "20 Credits" • "Total Slots: 5" • "Fixed Slots: 2 • Elective Slots: 3"
3. Slot Builder Grid (5 slot cards):
   - Slot 1:
     - Label: "Major Core 1"
     - Type dropdown: "Fixed Course"
     - Assigned Course: "KU01DSCCSE301 — Data Structures & Algorithms (4 Credits)"
   - Slot 2:
     - Label: "Major Core 2"
     - Type dropdown: "Fixed Course"
     - Assigned Course: "KU01DSCCSE302 — Database Systems (4 Credits)"
   - Slot 3:
     - Label: "Multidisciplinary Elective (MDC)"
     - Type dropdown: "Global Elective Basket"
     - Target Basket: "University MDC Basket A (3 Credits)"
   - Slot 4:
     - Label: "Skill Elective (SEC)"
     - Type dropdown: "Global Elective Basket"
     - Target Basket: "Engineering SEC Basket 1 (3 Credits)"
4. Action:
   - Button: "+ Add Academic Slot"

Style instructions:
- Clean curriculum configuration interface.
- Intuitive card or table layout with clear dropdown selectors.
- No filler text, no developer notes, and no markdown symbols.
```

---

### Screen 4.3 (Tab 2): Course Catalog & Rules

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/hod/CoursesTab.tsx`
- **Current UI**: Department course table showing course code, title, credits, seat capacity, prerequisite scoring rules, and "+ Add Course" modal.

```text
Design a course catalog and prerequisite rule management screen for an academic department.

Key elements to include:
1. Toolbar:
   - Search input: "Search department courses..."
   - Filter: "Category: All, Major (DSC), Minor (DSE), MDC, SEC"
   - Primary action: "+ Create New Course"
2. Course Catalog Table:
   - Column 1: "Course Code" (e.g. KU01DSCCSE301)
   - Column 2: "Course Title" (e.g. Data Structures & Algorithms)
   - Column 3: "Type" (e.g. Major DSC)
   - Column 4: "Credits" (e.g. 4 Credits)
   - Column 5: "Seat Limit" (e.g. 70 Seats)
   - Column 6: "Prerequisites" (e.g. Passed KU01DSCCSE101 • Score Boost: +15 pts)
   - Column 7: "Actions" (Edit, Delete icons)
3. Prerequisite Rule Modal Preview (Overlay card):
   - Title: "Configure Course Prerequisites — KU01DSCCSE301"
   - Prerequisite Type dropdown: "Completed Course", "Minimum Credits", "Department Preference"
   - Rule parameter: "Must have passed Programming Fundamentals with Grade C or above"
   - Allocation Merit Priority Weight: "+10 Points in Round 1"
   - Button: "Save Course Rules"

Style instructions:
- Crisp administrative table with clear badge colors for course types.
- Clean modal for editing rules.
- No filler paragraphs, no developer labels, and no markdown symbols.
```

---

### Screen 4.4 (Tab 3): Faculty Course Assignment

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/hod/TeacherAssignmentTab.tsx`
- **Current UI**: Course cards listing assigned teachers, "+ Add Teacher" button to create department faculty, and assignment modals excluding HOD.

```text
Design a faculty course assignment workspace for an academic department.

Key elements to include:
1. Top Bar & Metrics:
   - Metric chip: "18 Active Faculty Members"
   - Metric chip: "24 Courses Assigned • 0 Unassigned"
   - Action button: "+ Add New Teacher"
   - Secondary button: "Manage Department Teachers"
2. Course Assignment Cards (Clean grid):
   - Card 1:
     - Course: "Data Structures & Algorithms (KU01DSCCSE301)"
     - Semester: "Semester 3 • 64 Students"
     - Assigned Faculty: "Prof. Arvind Nambiar" (Course Teacher badge)
     - Action: "Reassign Faculty"
   - Card 2:
     - Course: "Database Management Systems (KU01DSCCSE302)"
     - Semester: "Semester 3 • 62 Students"
     - Assigned Faculty: "Dr. Pooja Nair" (Course Teacher badge)
     - Action: "Reassign Faculty"
   - Card 3:
     - Course: "Operating Systems (KU01DSCCSE401)"
     - Semester: "Semester 4 • 60 Students"
     - Status: "Unassigned" (Orange warning chip)
     - Action: "Assign Faculty"
3. "Add Teacher" Modal (Preview):
   - Fields: Full Name, Institutional Email, Designation (Assistant Professor, Associate Professor), Employee ID.
   - Button: "Create Teacher Account"

Style instructions:
- Modern resource allocation workspace with clear assignment status chips.
- Intuitive cards and clean modal forms.
- No filler text, no developer notes, and no markdown symbols.
```

---

### Screen 4.5 (Tab 4): Student Directory & Bulk Upload

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/hod/BulkUploadTab.tsx`
- **Current UI**: Searchable student table, single student creation form modal, CSV drop-zone for bulk student import, and download template link.

```text
Design a student roster management and bulk CSV import screen for an academic department.

Key elements to include:
1. Header Actions:
   - Search bar: "Search by student name or CAP application number..."
   - Filter dropdown: "Semester: All, Sem 1, Sem 3, Sem 5"
   - Button: "+ Add Single Student"
   - Button: "Bulk CSV Upload"
2. Bulk CSV Import Card:
   - Drop-zone: "Drag and drop CSV file here or Browse"
   - Accepted format note: "Required headers: full_name, cap_application_number, academic_year_joined, current_semester, email"
   - Action link: "Download Sample CSV Template"
   - Button: "Process & Import Students"
3. Department Students Table:
   - Column 1: "CAP Number" (e.g. CAP2026-CS-101)
   - Column 2: "Full Name" (e.g. Divya Krishnan)
   - Column 3: "Semester" (e.g. Semester 3)
   - Column 4: "Batch" (e.g. 2026-2030)
   - Column 5: "Registration Status" (e.g. Submitted • Green chip)
   - Column 6: "Actions" (View Profile, Reset Password)
4. Pagination:
   - "Showing 1-20 of 348 students"

Style instructions:
- Clean administrative directory with intuitive drag-and-drop file upload.
- High-contrast table with clear badge colors.
- No filler paragraphs, no developer labels, and no markdown symbols.
```

---

### Screen 4.6 (Tab 5): Manual Course Allocation

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/hod/ManualAllocationTab.tsx`
- **Current UI**: Filterable list of unallocated student slots following automated rounds, seat capacity counters, and dropdown to manually assign courses.

```text
Design a manual course allocation resolution screen for an academic Head of Department.

Key elements to include:
1. Status Banner:
   - Title: "Post-Allocation Seat Resolution — Semester 3"
   - Status: "Automated Allocation Completed • 6 Students Require Manual Resolution"
2. Filter Bar:
   - Filter: "Category: All, MDC Elective, SEC Skill"
   - Filter: "Status: Unallocated Only"
3. Resolution Table:
   - Column 1: "Student Name & Roll" (e.g. Rahul Verma • 2026-UG-CS-088)
   - Column 2: "Slot" (e.g. Slot 3: Multidisciplinary Elective)
   - Column 3: "Preferences Submitted" (e.g. 1st: Astronomy [Full], 2nd: Economics [Full], 3rd: Psychology [Full])
   - Column 4: "Available Courses with Vacancies" (Dropdown showing courses with open seats, e.g. "Philosophy of Science (4 seats remaining)")
   - Column 5: "Action" (Button: "Confirm Seat Allocation")
4. Batch Action:
   - Button: "Finalize & Publish All Manual Allocations"

Style instructions:
- Focused, clean problem-solving view for administrative seat adjustments.
- High-clarity vacancy indicators and responsive action buttons.
- No filler text, no developer notes, and no markdown symbols.
```

---

### Screen 4.7 (Tab 6): Campus Attendance Monitoring

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/hod/CampusAttendanceTab.tsx`
- **Current UI**: Department student attendance roster showing morning arrival and evening departure sign-in statuses, date picker, and export.

```text
Design a campus physical attendance monitoring dashboard for an academic department.

Key elements to include:
1. Header & Controls:
   - Date selector: "Wednesday, October 14, 2026"
   - Semester filter: "All Semesters, Semester 1, Semester 3"
   - Button: "Export Attendance Report (Excel)"
2. Daily Presence Summary (3 stat cards):
   - Card 1: "Total Expected" — "348 Students"
   - Card 2: "Morning Sign-Ins (AM)" — "326 Present (93.7%)"
   - Card 3: "Evening Sign-Ins (PM)" — "318 Present (91.4%)"
3. Daily Attendance Table:
   - Column 1: "CAP Number" (e.g. CAP2026-CS-012)
   - Column 2: "Student Name" (e.g. Maya Suresh)
   - Column 3: "Semester" (e.g. Semester 3)
   - Column 4: "Morning AM Status" (e.g. "08:45 AM • On Time" — Green chip)
   - Column 5: "Evening PM Status" (e.g. "04:15 PM • On Time" — Green chip)
   - Column 6: "Verification Mode" (e.g. "GPS Geofence")
4. Search & Pagination:
   - Quick search input for student name or ID.

Style instructions:
- Crisp, real-time administrative monitoring view.
- Clear status indicators for on-time, late, or absent sign-ins.
- No filler paragraphs, no developer labels, and no markdown symbols.
```

---

### Screen 4.8 (Tab 7): Period Attendance Auditing

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/hod/PeriodAttendanceAuditTab.tsx`
- **Current UI**: Department course lecture attendance log showing which faculty marked attendance, date, period, and student attendance percentages.

```text
Design a period attendance audit and compliance screen for a Head of Department.

Key elements to include:
1. Header & Controls:
   - Date Range: "Oct 01, 2026 - Oct 14, 2026"
   - Filter: "Faculty: All Teachers, Prof. Nambiar, Dr. Nair"
   - Metric badge: "Attendance Compliance: 98.2% Lectures Marked"
2. Course Lecture Attendance Log (Table):
   - Column 1: "Date & Time" (e.g. Oct 14, 2026 • Period 2: 10:00 AM)
   - Column 2: "Course" (e.g. Data Structures & Algorithms • KU01DSCCSE301)
   - Column 3: "Instructor" (e.g. Prof. Arvind Nambiar)
   - Column 4: "Students Present" (e.g. 58 / 64 Present • 90.6%)
   - Column 5: "Submission Status" (e.g. "Submitted on time" — Green chip)
   - Column 6: "Action" (Button: "View Lecture Sheet")
3. Low Attendance Alert Table (Students below 75% threshold):
   - Table showing students at risk with attendance percentage and warning notices.

Style instructions:
- High-transparency audit view with clear compliance metrics.
- Clean typography and structured tabular display.
- No filler text, no developer notes, and no markdown symbols.
```

---

# Section 5: Campus Director

### Screen 5.1: Governance Overview

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/director/page.tsx`
- **Current UI**: Campus profile banner, campus-wide registration metrics, 5 governance tabs, and registration window status.

```text
Design an executive governance dashboard for a university Campus Director.

Key elements to include:
1. Campus Executive Header:
   - Title: "Campus Academic Governance — North Campus"
   - Director Name: "Dr. K. R. Namboodiri, Campus Director"
   - Status Badge: "Registration Window: OPEN (Closes Oct 15, 2026)" (Green indicator)
2. Campus KPI Cards (4 metrics):
   - Card 1: "Total Enrolled Students" — "1,420 Across 6 Departments"
   - Card 2: "Registration Completion" — "1,280 / 1,420 (90.1%)"
   - Card 3: "Allocated Courses" — "72 Active Course Offerings"
   - Card 4: "Timetable Status" — "Published for Semester 1, 3 & 5"
3. Governance Navigation Tabs (5 tabs):
   - Tab 1: "Registration Window & Credit Settings"
   - Tab 2: "Course Allocation Engine"
   - Tab 3: "Timetable Scheduler"
   - Tab 4: "Cohort Semester Promotion"
   - Tab 5: "Campus Reports & Exports"
4. Departmental Progress Overview (Bar chart or progress list):
   - Computer Science: 92% registered
   - Electronics: 88% registered
   - Mechanical: 91% registered
   - Physics: 89% registered

Style instructions:
- Prestigious, executive leadership interface.
- High visual hierarchy, clean statistics, and prominent governance tabs.
- No filler paragraphs, no developer notes, and no markdown symbols.
```

---

### Screen 5.2 (Tab 1): Registration Window Controls

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/director/page.tsx` (Settings tab)
- **Current UI**: Registration deadline picker, presets (+7, +14, +30 days), min/max credit rules, and instant window open/close buttons.

```text
Design a registration window and credit governance control screen for a Campus Director.

Key elements to include:
1. Window Status Card:
   - Banner: "Registration Window is Currently OPEN" (Green status badge)
   - Current Deadline: "October 15, 2026 at 11:59 PM"
   - Quick Preset Buttons: "+7 Days", "+14 Days", "+30 Days"
   - Action Button: "Update Deadline"
   - Emergency Action: "Close Window Immediately" (Red outline button)
2. Credit Governance Rules:
   - Setting 1: "Minimum Credits Per Semester" (Number input: "18 Credits")
   - Setting 2: "Maximum Credits Per Semester" (Number input: "24 Credits")
   - Setting 3: "Academic Year" (Dropdown: "2026-2027")
   - Setting 4: "Late Submission Policy" (Toggle: "Strict Deadline Enforcement")
3. Save Configuration:
   - Button: "Save Campus Governance Settings"

Style instructions:
- Clean administrative control panel.
- Clear status switches, preset buttons, and numeric input fields.
- No filler paragraphs, no developer labels, and no markdown symbols.
```

---

### Screen 5.3 (Tab 2): Course Allocation Engine

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/director/page.tsx` (Allocation tab)
- **Current UI**: Multi-round allocation trigger button, window-close guard modal, round 1-3 progress diagnostics, and seat distribution charts.

```text
Design an algorithmic course allocation engine screen for a Campus Director.

Key elements to include:
1. Allocation Status Banner:
   - Status: "Ready to Execute Course Allocation Solver"
   - Pre-condition check: "Registration Window Closed • 1,380 Student Preferences Frozen"
   - Primary Action Button: "Run Multi-Round Course Allocation"
2. Multi-Round Solver Pipeline (Step tracker):
   - Step 1: "Direct Allocation" — Under-subscribed papers confirmed automatically (Completed)
   - Step 2: "Round 1 (Rank 1 Choices)" — Merit scoring based on prerequisites and semester (Completed)
   - Step 3: "Round 2 (Rank 2 Backups)" — Remaining seat distribution (Running...)
   - Step 4: "Round 3 (Rank 3 Backups)" — Final automated pass (Pending)
3. Allocation Results Summary (Metric cards):
   - "Total Applicants": 1,380
   - "Allocated to Rank 1": 1,120 (81.2%)
   - "Allocated to Rank 2": 190 (13.8%)
   - "Allocated to Rank 3": 58 (4.2%)
   - "Unallocated Slots": 12 (Pending HOD resolution)
4. Actions:
   - Button: "Publish Allocation Results to Student Dashboards"
   - Button: "Export Allocation Diagnostics (Excel)"

Style instructions:
- High-tech algorithmic dashboard with a visual execution pipeline.
- Clean metrics, progress bars, and clear action buttons.
- No filler paragraphs, no developer notes, and no markdown symbols.
```

---

### Screen 5.4 (Tab 3): Timetable Scheduler & Publishing

**Current System UI Reference (For Reference Only)**:
- **Files**: `frontend/src/app/dashboard/director/timetable/page.tsx`, `director/page.tsx`
- **Current UI**: Timetable solver generator, interactive weekly grid (Monday to Friday, Periods 1 to 6), conflict indicators, and "Publish Timetable" button.

```text
Design an AI master timetable scheduler and publishing screen for a university Campus Director.

Key elements to include:
1. Controls & Status:
   - Academic Term: "Semester 3 • All Departments"
   - Status badge: "Timetable Status: Generated • Ready to Publish"
   - Primary Action: "Publish Master Timetable"
   - Secondary Action: "Re-run Conflict-Free Solver"
2. Master Weekly Timetable Grid:
   - Columns: "Days" (Monday through Friday)
   - Rows: "Periods" (Period 1: 09:00 AM to Period 6: 04:00 PM)
   - Schedule Cells:
     - Cell 1: "Data Structures (KU01DSCCSE301)" • "Room 304" • "Prof. Nambiar" • "CS Batch A"
     - Cell 2: "Database Systems (KU01DSCCSE302)" • "Lab 2" • "Dr. Nair" • "CS Batch B"
     - Cell 3: "Multidisciplinary Astronomy (KU01MDCPHY201)" • "Auditorium 1" • "Cross-Dept"
3. Conflict Detection Panel:
   - Indicator: "0 Faculty Conflicts • 0 Room Collisions • 0 Student Overlaps" (Green check badge)

Style instructions:
- Beautiful, highly legible academic schedule grid.
- Clean color-coded course categories and subtle borders.
- No filler text, no developer labels, and no markdown symbols.
```

---

### Screen 5.5 (Tab 4): Student Cohort Promotion

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/director/page.tsx` (Promotion tab)
- **Current UI**: Academic year promotion engine, semester transition selector (e.g. Sem 1 -> Sem 2), eligibility rules, and promotion execution button.

```text
Design a student cohort semester promotion screen for a Campus Director.

Key elements to include:
1. Promotion Header:
   - Title: "Student Cohort Semester Promotion Engine"
   - Warning badge: "End-of-Term Administrative Operation"
2. Transition Selector:
   - Source Semester: "Semester 1" → Target Semester: "Semester 2"
   - Academic Year: "2026-2027"
3. Eligibility & Credit Verification (Checklist):
   - Rule 1: "Minimum credits completed for progression: 16 Credits"
   - Rule 2: "Attendance requirement satisfied: Above 75%"
   - Summary: "328 Students Eligible for Promotion • 8 Flagged for Academic Review"
4. Action Card:
   - Notice: "Promoting cohort will update student profiles, archive current registrations, and unlock next semester blueprint."
   - Primary Action: "Execute Cohort Promotion" (Protected confirmation button)

Style instructions:
- Serious, high-trust administrative action screen.
- Clear visual transition arrow between semesters.
- No filler paragraphs, no developer notes, and no markdown symbols.
```

---

### Screen 5.6 (Tab 5): Multi-Department Reports Export

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/director/page.tsx` (Reports tab)
- **Current UI**: Export center with buttons for Master Student Roster, Course Allocation Report, Campus Attendance Summary, and Accreditation Dossier.

```text
Design a campus reports and data export hub for a university Campus Director.

Key elements to include:
1. Hub Header:
   - Title: "Campus Reports & Institutional Exports"
   - Subtitle: "Generate NAAC-compliant reports and operational data sheets."
2. Available Reports (Clean grid of report cards):
   - Card 1:
     - Title: "Master Course Allocation Dossier"
     - Description: "Complete student-by-student elective allocation with rank distribution."
     - Format: "Excel (.xlsx) • PDF"
     - Button: "Download Report"
   - Card 2:
     - Title: "Campus Physical Attendance Statement"
     - Description: "Twice-daily morning/evening sign-in logs with verified timestamps."
     - Format: "Excel (.xlsx)"
     - Button: "Download Report"
   - Card 3:
     - Title: "Departmental Credit Progress Roster"
     - Description: "Cumulative student credits earned and degree progression audit."
     - Format: "Excel (.xlsx)"
     - Button: "Download Report"
   - Card 4:
     - Title: "Master Timetable Schedule Matrix"
     - Description: "Full campus lecture and lab room allocations across all departments."
     - Format: "PDF • Print Format"
     - Button: "Export Timetable"

Style instructions:
- Clean, organized download center with clear card containers.
- Prominent download action buttons with format badges.
- No filler paragraphs, no developer labels, and no markdown symbols.
```

---

# Section 6: SuperAdmin

### Screen 6.1: Infrastructure Overview

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/superadmin/page.tsx`
- **Current UI**: System infrastructure metrics (Campuses, Departments, Faculty, System Health), 4 master navigation tabs, and system status indicator.

```text
Design an infrastructure overview dashboard for a university SuperAdmin.

Key elements to include:
1. Master Administration Header:
   - Title: "Apex University Central Administration"
   - SuperAdmin: "System Administrator"
   - System Health Badge: "All Systems Operational • 99.98% Uptime"
2. Infrastructure KPI Cards (4 metrics):
   - Card 1: "Campuses" — "4 Active Campuses"
   - Card 2: "Departments" — "18 Academic Departments"
   - Card 3: "Faculty & Staff" — "240 Verified Faculty"
   - Card 4: "Active Students" — "4,820 Registered Students"
3. Central Administration Tabs (4 tabs):
   - Tab 1: "Campuses"
   - Tab 2: "Departments"
   - Tab 3: "Faculty Directory & Roles"
   - Tab 4: "Security & Audit Logs"
4. Quick System Actions:
   - Button: "+ Provision Campus"
   - Button: "+ Provision Department"
   - Button: "View Security Audit"

Style instructions:
- Sleek, enterprise-grade dark or light administration dashboard.
- Clear numeric metric cards, crisp tabs, and authoritative hierarchy.
- No filler text, no developer notes, and no markdown symbols.
```

---

### Screen 6.2 (Tab 1): Campus Management

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/superadmin/page.tsx` (Campuses tab)
- **Current UI**: Table of physical campuses (code, name, address, geofence radius), edit/delete buttons, and "+ Add Campus" modal.

```text
Design a campus management interface for a university SuperAdmin.

Key elements to include:
1. Toolbar:
   - Search input: "Search campuses..."
   - Primary button: "+ Add New Campus"
2. Campuses Table:
   - Column 1: "Campus Code" (e.g. MANGAT, THALAS, NILESH, PAYYAN)
   - Column 2: "Campus Name" (e.g. Mangattuparamba Main Campus)
   - Column 3: "Location / Address" (e.g. Kannur, Kerala 670567)
   - Column 4: "Geofence Radius" (e.g. 500 meters)
   - Column 5: "Active Departments" (e.g. 6 Departments)
   - Column 6: "Actions" (Edit, Delete icons)
3. "Add Campus" Modal Preview:
   - Form fields: Campus Name, Short Code, Latitude, Longitude, Geofence Radius (meters), Contact Email.
   - Button: "Save Campus"

Style instructions:
- Enterprise table with clean row borders and subtle actions.
- Clean modal form with structured inputs.
- No filler paragraphs, no developer labels, and no markdown symbols.
```

---

### Screen 6.3 (Tab 2): Department Directory

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/superadmin/page.tsx` (Departments tab)
- **Current UI**: Department list showing department code, name, campus assignment, and "+ Add Department" modal.

```text
Design an academic department directory management screen for a SuperAdmin.

Key elements to include:
1. Toolbar:
   - Search bar: "Search departments..."
   - Filter dropdown: "Campus: All Campuses, Main Campus, North Campus"
   - Primary button: "+ Create Department"
2. Departments Table:
   - Column 1: "Department Code" (e.g. CSE, ECE, MECH, PHY, CHEM, MATH)
   - Column 2: "Department Name" (e.g. Computer Science & Engineering)
   - Column 3: "Campus" (e.g. Main Campus)
   - Column 4: "Head of Department (HOD)" (e.g. Dr. Sunita Rao)
   - Column 5: "Faculty Count" (e.g. 18 Faculty)
   - Column 6: "Students" (e.g. 348 Students)
   - Column 7: "Actions" (Edit, Delete icons)
3. Pagination:
   - "Showing 1-10 of 18 departments"

Style instructions:
- High-clarity administrative table.
- Clean search and filter controls.
- No filler text, no developer notes, and no markdown symbols.
```

---

### Screen 6.4 (Tab 3): Faculty Directory & Roles

**Current System UI Reference (For Reference Only)**:
- **File**: `frontend/src/app/dashboard/superadmin/page.tsx` (Faculty tab)
- **Current UI**: Complete institutional faculty table showing name, email, department, role badges (`hod`, `campus_director`, `teacher`, `teaching_staff`), role edit dropdown, and "+ Add Faculty" button.

```text
Design a faculty directory and role assignment screen for a university SuperAdmin.

Key elements to include:
1. Toolbar:
   - Search bar: "Search faculty by name, email, or employee ID..."
   - Role Filter: "All Roles, Campus Director, HOD, Course Teacher, Teaching Staff"
   - Campus Filter: "All Campuses"
   - Primary button: "+ Provision Faculty Account"
2. Faculty Directory Table:
   - Column 1: "Faculty Name" (e.g. Dr. Sunita Rao)
   - Column 2: "Institutional Email" (e.g. s.rao@apex.edu.in)
   - Column 3: "Department & Campus" (e.g. Computer Science • Main Campus)
   - Column 4: "Assigned Role" (Dropdown or colored badge: "HOD", "Campus Director", "Course Teacher", "Teaching Staff")
   - Column 5: "Status" (Active • Green dot)
   - Column 6: "Actions" (Change Role, Reset Password, Deactivate)
3. Role Change Modal Preview:
   - Title: "Modify System Role — Dr. Sunita Rao"
   - Role Selector: "Head of Department (HOD)"
   - Department: "Computer Science & Engineering"
   - Button: "Save Role Permissions"

Style instructions:
- Robust user and role management interface.
- Clear role badges with distinct color codings.
- No filler paragraphs, no developer labels, and no markdown symbols.
```

---

### Screen 6.5 (Tab 4): Security & System Audit Logs

**Current System UI Reference (For Reference Only)**:
- **Files**: `frontend/src/app/dashboard/superadmin/page.tsx` (Logs tab), `frontend/src/app/dashboard/superadmin/logs/page.tsx`
- **Current UI**: Filterable system audit log table showing timestamp, event type, status badge, actor email, and JSON metadata viewer modal.

```text
Design a security audit and system activity log viewer for a university SuperAdmin.

Key elements to include:
1. Log Filters & Search:
   - Search input: "Search by user email, event type, or IP address..."
   - Event Type Filter: "All Events, Auth Logins, Course Allocations, Timetable Jobs, Role Changes"
   - Status Filter: "All, Success, Warning, Error"
   - Action: "Export Audit Log (CSV)"
2. System Audit Table:
   - Column 1: "Timestamp" (e.g. Oct 14, 2026, 10:42:15 AM)
   - Column 2: "Event Type" (e.g. USER_LOGIN_SUCCESS, ALLOCATION_RUN_COMPLETED, ROLE_MODIFIED)
   - Column 3: "Actor / User" (e.g. s.rao@apex.edu.in • HOD)
   - Column 4: "Status" (e.g. SUCCESS — Green badge, FAILED — Red badge)
   - Column 5: "IP Address" (e.g. 192.168.1.42)
   - Column 6: "Details" (Button: "View Event Payload")
3. Event Payload Inspector (Slide-over drawer or modal):
   - Clean JSON/key-value view: Event ID, User ID, Action, Target Entity, Response Time (42ms).

Style instructions:
- Dark or high-contrast modern security log viewer.
- Crisp monospace formatting for timestamps, IPs, and event keys.
- No filler text, no developer notes, and no markdown symbols.
```
