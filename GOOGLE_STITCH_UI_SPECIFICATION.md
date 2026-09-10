# Google Stitch UI Redesign Specification: FYIMP Academic Governance & Course Registration Platform

---

## 1. System Vision, Purpose & Context ("What & Why")

### 1.1 What is the FYIMP Platform?
The **Four-Year Integrated Multidisciplinary Programme (FYIMP) Platform** is an end-to-end academic governance, course registration, algorithmic allocation, attendance tracking, and scheduling system built for higher education institutions (modeled on the University of Calicut and National Education Policy / NEP 2020 guidelines).

### 1.2 Why Does this System Exist? (Problems Solved)
1. **Multidisciplinary Curricular Complexity**: Under NEP 2020, students no longer follow rigid, monolithic degree programs. Instead, every semester involves a flexible matrix of course categories:
   - **Major / Discipline Specific Core (DSC)**: Foundational subjects in the student's primary department.
   - **Minor / Discipline Specific Elective (DSE)**: Secondary area of focus.
   - **Multidisciplinary Courses (MDC)**: Courses taken outside the student's parent faculty/school (e.g., a Computer Science student taking History or Environmental Science).
   - **Ability Enhancement Courses (AEC)**: Language, communication, and critical inquiry.
   - **Skill Enhancement Courses (SEC)**: Practical, vocational, and technical competencies.
   - **Value Addition Courses (VAC)**: Ethics, digital literacy, environmental studies, and constitutional values.
2. **Elective Demand Contention**: High-demand elective papers quickly exceed physical room or lab capacities. The system replaces manual or first-come-first-served chaos with a deterministic, multi-round allocation engine that weighs prerequisite mastery, academic progression, and time-stamped preference rankings.
3. **Institutional Scale & Multi-Campus Governance**: Large universities operate across multiple distinct physical campuses, dozens of academic departments, and hundreds of teaching faculty. The platform unifies administrative authority across 6 distinct access tiers.
4. **Attendance & Academic Continuity**: The platform bridges macro-level campus security (geofenced arrival/departure verification) with micro-level classroom learning (period-by-period attendance marked by assigned course teachers), feeding a cumulative credit ledger that tracks student progression toward graduation eligibility.

---

## 2. User Roles & Access Hierarchy

The system enforces 6 authenticated roles plus an unauthenticated public tier:

| Role Identifier | User Persona | Scope of Authority | Primary Goals |
| :--- | :--- | :--- | :--- |
| **Guest / Public** | Prospective students, parents, accreditors | Public informational pages | Understand institutional framework, review privacy/terms policies, log in. |
| **`student`** | Enrolled undergraduate/postgraduate student | Personal student profile, active semester | Select & rank elective preferences, view allocated courses, monitor attendance, track credit ledger. |
| **`teacher`** | Individual Course Teacher | Specifically assigned courses | Access personalized class rosters, mark period-by-period class attendance. |
| **`teaching_staff`** | General academic faculty | Department/campus educational catalog | View departmental course listings, inspect general student enrollments. |
| **`hod`** | Head of Academic Department | Department-wide students, courses, faculty | Design semester blueprints, configure course prerequisites, assign faculty to courses, manage teachers, upload students. |
| **`campus_director`** | Executive Director of a physical campus | Campus-wide departments, governance, scheduling | Control registration windows, execute algorithmic course allocation, generate & publish timetables, promote cohorts. |
| **`superadmin`** | Central University IT & Registrar Admin | Entire university infrastructure | Provision physical campuses, configure departments, manage institutional faculty directory, audit security logs. |

---

## 3. Comprehensive Screen & Tab Inventory

```
FYIMP Platform
├── Public & Authentication
│   ├── Landing Page
│   ├── Portal Login
│   ├── Password Reset Request
│   ├── Privacy Policy
│   └── Terms of Use
│
├── Student Experience
│   ├── Mandatory Privacy Consent Gate (First-time / Policy Update)
│   ├── Forced Initial Password Change (New Accounts)
│   ├── Student Dashboard (Overview)
│   ├── Course Registration & Elective Ranking Screen
│   ├── Academic Credit Ledger & Transcript Screen
│   └── Campus Geofenced Sign-In Checkpoint
│
├── Teacher Experience (Personalized)
│   ├── Teacher Dashboard (Personalized Course Hub)
│   ├── Course Student Class Roster View
│   └── Period Attendance Marking Screen
│
├── Teaching Staff Experience
│   ├── Department Course Catalog
│   └── General Student Roster Inspection
│
├── Head of Department (HOD) Experience
│   ├── HOD Overview & Analytics
│   ├── Tab 1: Semester Curriculum Blueprint & Pathway Builder
│   ├── Tab 2: Course Catalog & Prerequisite Rules Configuration
│   ├── Tab 3: Faculty Course Assignment & Teacher Roster
│   ├── Tab 4: Student Directory, Single Add & Bulk CSV Ingestion
│   ├── Tab 5: Manual Course Allocation & Seat Resolution
│   ├── Tab 6: Campus Attendance Monitoring
│   └── Tab 7: Period Attendance Submission Auditing
│
├── Campus Director Experience
│   ├── Director Governance Overview
│   ├── Tab 1: Registration Window & Governance Controls
│   ├── Tab 2: 3-Round Algorithmic Course Allocation Engine
│   ├── Tab 3: Timetable Generation, Conflict Resolution & Publishing
│   ├── Tab 4: Student Cohort Semester Promotion
│   └── Tab 5: Department & Campus Roster Export
│
└── SuperAdmin Experience
    ├── Institutional Infrastructure Overview
    ├── Tab 1: Physical Campus Management
    ├── Tab 2: Department Directory Management
    ├── Tab 3: Institutional Faculty & Role Directory
    └── Tab 4: System Audit, Security & Job Execution Logs
```

---

## 4. Screen-by-Screen Data, Content & Interaction Specifications

> **Designer Freedom Note**: The descriptions below define the **data entities, statuses, and actionable interactions** for each screen. You have complete creative freedom over visual composition, typographic scale, color accents, spatial relationships, and interaction metaphors (e.g., modals vs inline drawers, bento cards vs data grids, stepper flows vs unified forms).

---

### 4.1 Public & Authentication Experience

#### 4.1.1 Landing Page
- **Core Purpose**: Introduce the institution's Four-Year Integrated Multidisciplinary Programme and direct visitors to their appropriate portals.
- **Key Content & Information**:
  - Institutional identity: University name, crest/logo, official accreditation notice.
  - Academic framework highlights: Explanation of Major, Minor, Multidisciplinary, Skill, and Value-Addition learning tracks under NEP 2020.
  - Portal access points: Sign-in entry for Students, Faculty, HODs, Directors, and Administrators.
  - Governance links: Direct links to Privacy Policy, Terms of Use, and Academic Regulations.
- **User Actions**:
  - Navigate to login.
  - Explore institutional framework details.
  - View compliance and privacy disclosures.

#### 4.1.2 Portal Login
- **Core Purpose**: Single, secure unified login gateway authenticating all roles (`student`, `teacher`, `teaching_staff`, `hod`, `campus_director`, `superadmin`).
- **Key Content & Information**:
  - Email/Identifier field.
  - Password field with show/hide visibility toggle.
  - Clear error feedback: Specific feedback for invalid credentials, account lockouts, or rate-limiting delays.
  - Link to password recovery flow.
  - Security reassurance badges: TLS encryption notice, session security standards.
- **User Actions**:
  - Submit credentials.
  - Request password reset.
  - View terms and privacy policies.

#### 4.1.3 Password Reset Request
- **Core Purpose**: Self-service recovery for users who have forgotten their authentication credentials.
- **Key Content & Information**:
  - Registered institutional email input.
  - Instructions on password recovery steps.
  - Success state notification indicating email delivery.
- **User Actions**:
  - Submit recovery request.
  - Return to login screen.

#### 4.1.4 Privacy Policy & Terms of Use
- **Core Purpose**: Statutory compliance documents detailing institutional data processing, student rights under digital personal data protection acts, geofence data retention limitations, and portal terms of service.
- **Key Content & Information**:
  - Data Controller details, grievance officer contacts, retention schedules.
  - Categories of data collected: Identity (Name, CAP registration number, institutional email), Academic history (credits, courses, preferences), Operational metadata (GPS arrival timestamps, audit entries).
- **User Actions**:
  - Read full policy text.
  - Print/export terms.
  - Return to portal entry.

---

### 4.2 Student Experience

#### 4.2.1 Mandatory Privacy Consent Gate
- **Core Purpose**: Interstitial blocking screen that requires students to acknowledge and accept data privacy policies prior to accessing any academic records.
- **Key Content & Information**:
  - Summary of data usage: Academic course allocation algorithms, GPS coordinates used exclusively for radius verification during arrival/departure, attendance records shared with academic advisors.
  - Explicit agreement checkboxes.
  - Date and version stamp of the policy document.
- **User Actions**:
  - Review detailed policy text.
  - Accept terms to unlock dashboard access.
  - Decline / Log out.

#### 4.2.2 Forced Initial Password Change
- **Core Purpose**: Security screen enforced whenever a user account is provisioned with a default temporary password (`must_change_password: true`).
- **Key Content & Information**:
  - Current temporary password verification.
  - New password input with live complexity strength meter (minimum 8 characters, uppercase, lowercase, numerical, and symbolic requirement).
  - Confirm new password input.
- **User Actions**:
  - Submit updated password to permanently activate account and redirect to dashboard.

#### 4.2.3 Student Dashboard (Overview)
- **Core Purpose**: Primary student hub presenting current semester status, active registration alerts, enrolled courses, and quick access to core utilities.
- **Key Content & Information**:
  - Student Profile Banner: Full name, CAP Application Number, Parent Campus, Home Department, Current Semester, Academic Year.
  - Registration Window Live Status: Visual countdown / alert showing whether the registration window is currently OPEN (with deadline date/time) or CLOSED.
  - Allocation Outcome Status: Clear badge indicating whether course allocation has been finalized, is in progress, or is pending registration closure.
  - Enrolled Course Cards/List: For the active semester, showing each enrolled course:
    - Course code, course title, credit weighting.
    - Category tag (Major Core, Minor Elective, MDC, AEC, SEC, VAC).
    - Status origin: Fixed Core, Allocated by Algorithm (with assigned preference rank 1, 2, or 3), or Manually Resolved by HOD.
  - Credit Progression Summary: Total credits registered vs total credits required for degree progression.
  - Quick action gateways: "Register / Update Elective Preferences", "View Academic Credit Ledger", "Campus Attendance Sign-In".
- **User Actions**:
  - Launch registration workflow.
  - Access full credit ledger transcript.
  - Navigate to daily campus check-in.

#### 4.2.4 Course Registration & Elective Ranking Screen
- **Core Purpose**: Guided workflow where students review mandatory fixed core subjects and choose/rank their elective papers across available categories.
- **Key Content & Information**:
  - Semester Header & Credit Bounds: Current semester number, minimum credit requirement, maximum credit ceiling, total currently selected credits.
  - Fixed / Core Slots (Read-only / Pre-locked):
    - Course code, title, credits, department.
    - Status badge: "Locked Core Paper".
  - Elective Paper Selection Slots (MDC, DSE, AEC, SEC, VAC):
    - Slot title and category description.
    - 1st Choice (Primary Selection): Searchable/selectable course dropdown or picker.
    - 2nd Choice (Backup Selection for Round 2): Searchable course picker.
    - 3rd Choice (Backup Selection for Round 3): Searchable course picker.
    - Per-option metadata: Course title, code, credits, offering department, seat limit, prerequisite requirement indicators.
    - Conflict Prevention: Dynamic elimination of already-selected courses across ranks within the same slot.
  - Submission State: Date/time stamp of last submission, confirmation notice indicating preferences are frozen upon window closure.
- **User Actions**:
  - Select and rank choices for each elective slot.
  - Clear or adjust selections.
  - Submit final preferences to database with receipt timestamp.

#### 4.2.5 Academic Credit Ledger & Transcript Screen
- **Core Purpose**: Comprehensive, multi-semester academic progression audit showing earned credits, current semester commitments, and deficit analysis.
- **Key Content & Information**:
  - Cumulative Credit Metrics: Total Earned Credits, Current Registered Credits, Pending / Incomplete Credits, Projected Graduation Threshold.
  - Category Breakdown Chart/Grid: Credits accumulated per category (Major Core, Minor, MDC, AEC, SEC, VAC) vs degree qualification quotas.
  - Semester-by-Semester Academic History:
    - Semester number and academic year.
    - Courses completed with grades/status, credits earned, and completion timestamps.
  - Print/Export option for unofficial academic transcript.
- **User Actions**:
  - Filter history by semester or course category.
  - Generate printable PDF summary.

#### 4.2.6 Campus Geofenced Sign-In Checkpoint
- **Core Purpose**: Self-service student check-in verifying physical presence on campus during morning arrival and evening departure windows.
- **Key Content & Information**:
  - Real-Time Geofence Validator: Device GPS distance from campus center point vs allowable radius (e.g., 500 meters).
  - Checkpoint Indicator: Identifies active session (Morning Arrival vs Evening Departure).
  - Status feedback: Within Campus Radius (Valid) vs Outside Campus Perimeter (Blocked).
  - Daily Sign-in History: Today's recorded morning timestamp and evening timestamp.
- **User Actions**:
  - Request browser/device location permission.
  - Trigger "Sign In to Campus" when within perimeter.

---

### 4.3 Teacher Experience (Personalized Course Teacher)

#### 4.3.1 Teacher Dashboard (Personalized Course Hub)
- **Core Purpose**: Focused, distraction-free environment for individual course teachers showing only papers assigned to them by their HOD.
- **Key Content & Information**:
  - Faculty Profile Banner: Teacher name, institutional email, designated role ("Course Teacher"), department name.
  - Assigned Course Roster:
    - List/cards of specifically assigned courses for the academic year.
    - Course code, course title, semester number, credit weighting.
    - Enrolled student headcount per course.
  - Empty State Guidance: Helpful notice if no courses have been assigned yet by the HOD, advising the teacher to contact their department head.
- **User Actions**:
  - Select an assigned course to view student rosters.
  - Launch period attendance marking for any assigned course.

#### 4.3.2 Course Student Class Roster View
- **Core Purpose**: Detailed breakdown of all students enrolled in a selected course paper.
- **Key Content & Information**:
  - Course Header: Title, code, semester, credit rating.
  - Total Enrolled Students count.
  - Cross-Departmental Cohort Breakdown: Number of students from Computer Science, Mathematics, English, Commerce, etc. (vital for multidisciplinary elective courses).
  - Student Roster Table/Cards: Student full name, CAP Application Number, home department, semester level.
- **User Actions**:
  - Filter students by home department.
  - Search by student name or registration number.
  - Export class roster to PDF or spreadsheet.

#### 4.3.3 Period Attendance Marking Screen
- **Core Purpose**: Rapid classroom attendance marking for a specific timetable period.
- **Key Content & Information**:
  - Session Context: Selected course code/title, date selector, period/slot number selector (Period 1 through Period 6).
  - Student Attendance Grid/List:
    - Student avatar/initials, full name, registration number.
    - Attendance state toggles: Present, Absent, Excused / On Duty.
    - Quick actions: "Mark All Present", "Invert Selection".
  - Submission Status: Indicator showing whether attendance for this specific date/period has already been submitted or is pending submission.
- **User Actions**:
  - Toggle student attendance states.
  - Batch select attendance states.
  - Submit period attendance record to the institutional ledger.

---

### 4.4 Teaching Staff Experience (General Faculty)

#### 4.4.1 Department Course Catalog & General Roster Inspection
- **Core Purpose**: Broad informational view for academic faculty who do not hold specific administrative course assignments, allowing review of departmental curriculum and enrolled student lists.
- **Key Content & Information**:
  - Department overview, list of all courses offered across semesters.
  - Enrollment aggregates per paper.
  - Roster view with search capabilities.
- **User Actions**:
  - Browse semester offerings.
  - Inspect student cohorts.

---

### 4.5 Head of Department (HOD) Experience

#### 4.5.1 HOD Overview & Analytics
- **Core Purpose**: Departmental command center presenting macro metrics on course readiness, faculty allocations, student onboarding, and attendance compliance.
- **Key Content & Information**:
  - Department Profile: Department name, campus location, HOD full name, academic year.
  - Key Performance Metric Cards: Total Active Courses, Total Department Students, Faculty Members, Unassigned Course Papers, Allocation Readiness Score.

#### 4.5.2 Tab 1: Semester Curriculum Blueprint & Pathway Builder
- **Core Purpose**: Structuring the academic pathways, credit rules, and course slot definitions for each semester (Semesters 1 through 8).
- **Key Content & Information**:
  - Semester Selector: Quick switching between Semester 1 through Semester 8.
  - Credit Governance Limits: Minimum semester credit boundary, Maximum semester credit ceiling.
  - Pathway Definitions:
    - Pathway ID, Pathway Name, Curriculum Track Description.
    - Slot Configurations within Pathway:
      - Slot index (Slot 1 through Slot 6).
      - Slot Name (e.g., "Major Core Paper", "Multidisciplinary Elective", "Skill Enhancement").
      - Allocation Rule: `FIXED` (Pre-assigned mandatory course) vs `GLOBAL_BASKET` (Student-elected ranking basket) vs `DEPARTMENT_BASKET`.
      - Target Course Code or Course Category Identifier.
- **User Actions**:
  - Switch active semester view.
  - Adjust min/max credit boundaries.
  - Add, edit, or remove curriculum pathways.
  - Add, edit, or reorder slots within a pathway.
  - Save and validate blueprint schema.

#### 4.5.3 Tab 2: Course Catalog & Prerequisite Rules Configuration
- **Core Purpose**: Managing all courses owned by the department and defining scoring rules for prerequisite-based elective allocation.
- **Key Content & Information**:
  - Course Directory:
    - Course Code, Course Title, Semester, Credits, Theory Hours/Week, Practical Hours/Week.
    - Category (Major DSC, Minor DSE, MDC, AEC, SEC, VAC).
    - Seat Capacity Limit (e.g., 40, 60, 120 seats).
    - Allowed Departments Filter: Restricting course eligibility to specific departments or opening university-wide.
  - Prerequisite & Scoring Rule Configuration:
    - Prerequisite Courses required for enrollment.
    - Rule Type: `COMPLETED_COURSE`, `COMPLETED_SEMESTER`, or `MIN_CREDITS`.
    - Weight / Priority Score assigned to students fulfilling the prerequisite (used by allocation engine).
- **User Actions**:
  - Create new course paper.
  - Edit existing course attributes and seat caps.
  - Attach prerequisite scoring rules.
  - Search and filter course catalog.

#### 4.5.4 Tab 3: Faculty Course Assignment & Teacher Roster
- **Core Purpose**: Connecting department faculty to course papers and provisioning individual teacher accounts.
- **Key Content & Information**:
  - Visual Assignment Workspace (Interactive Flow Canvas or Data Matrix):
    - Faculty Nodes / Records: Teacher name, email, role (`teacher` or `teaching_staff`), count of currently assigned courses.
    - Course Nodes / Records: Course code, title, semester, credits, assigned teacher badges.
    - Assignment Connectors: Visual mapping showing which faculty member teaches which paper.
    - HOD Safety Constraint: HOD account is strictly excluded from teacher assignment options (HOD is an administrative supervisor, not an assignable course instructor).
  - Toolbar & Summary Metrics:
    - Total Department Courses, Assigned Courses count, Unassigned Courses count.
    - Filter by Semester, Search faculty/courses.
  - Add Teacher Modal:
    - Full Name input.
    - Institutional Email input.
    - Temporary password field with default generator.
    - Role pre-set to `teacher` (Individual Course Teacher).
  - Department Faculty Roster Management Modal:
    - List of all active department teachers.
    - Assigned course counter per teacher.
    - Action to remove/delete a teacher from the department (safely unassigning active courses and revoking credentials).
  - Mid-Semester Reassignment Modal:
    - Existing assignment details.
    - Replacement teacher selector (excluding HOD).
    - Confirm in-place reassignment for attendance continuity.
- **User Actions**:
  - Connect a teacher to a course paper.
  - Open "+ Add Teacher" modal and provision a new faculty account.
  - Open "Department Teachers" modal to inspect roster and remove instructors.
  - Reassign a course to a different instructor mid-semester.
  - Delete an assignment connection.

#### 4.5.5 Tab 4: Student Directory, Single Add & Bulk CSV Ingestion
- **Core Purpose**: Departmental student roster onboarding and export.
- **Key Content & Information**:
  - Student Directory:
    - CAP Application Number, Student Full Name, Institutional Email, Current Semester, Academic Year Joined.
    - Registration status badge.
  - Single Add Student Form:
    - Full Name, CAP Application Number, Email, Semester, Academic Year.
  - Bulk CSV Upload Workspace:
    - File drop area accepting `.csv` files.
    - Column mapping guide: `Full Name`, `CAP Application Number`, `Email`, `Semester`, `Academic Year`.
    - Batch default password configuration.
    - Ingestion Results Log: Row-by-row status (Success vs Error with specific validation messages).
  - Export Utility:
    - One-click export of enrolled student roster to formatted Excel spreadsheet, filterable by semester.
- **User Actions**:
  - Add a single student manually.
  - Drop a CSV file to execute bulk onboarding.
  - Search and filter students by name, CAP number, or semester.
  - Export filtered cohorts to Excel.

#### 4.5.6 Tab 5: Manual Course Allocation & Seat Resolution
- **Core Purpose**: Handling outlier students who remained unallocated after the automated allocation engine ran (e.g., all 3 ranked electives reached capacity).
- **Key Content & Information**:
  - Unallocated Students Queue:
    - Student Name, CAP Number, Semester, Unfulfilled Slot (e.g., "Slot 2: MDC").
    - Preferences originally submitted (Rank 1, 2, 3).
  - Available Capacity Viewer:
    - Courses in the relevant category that still have vacant seats.
    - Course title, code, total seats, filled seats, remaining vacancies.
  - Resolution Action: HOD assigns the student to an available vacancy.
- **User Actions**:
  - Inspect unallocated student preferences.
  - Select an available course and confirm manual allocation.

#### 4.5.7 Tab 6: Campus Attendance Monitoring
- **Core Purpose**: Department-level oversight of students' daily physical campus sign-ins.
- **Key Content & Information**:
  - Date selector.
  - Summary metrics: Present count, Absent count, Attendance percentage for the department.
  - Roster Table: Student Name, CAP Number, Morning Arrival Timestamp, Evening Departure Timestamp, Status badge (Present Both, Partial, Absent).
- **User Actions**:
  - Filter by date or semester cohort.
  - Search student attendance records.

#### 4.5.8 Tab 7: Period Attendance Submission Auditing
- **Core Purpose**: Administrative tracking ensuring course teachers are diligently submitting period-by-period class attendance.
- **Key Content & Information**:
  - Course paper filter and date range selector.
  - Submission log: Course code, assigned teacher, date, period number, total students present vs total enrolled, timestamp of teacher submission.
- **User Actions**:
  - Review teacher compliance.
  - Export attendance audit log.

---

### 4.6 Campus Director Experience

#### 4.6.1 Director Governance Overview
- **Core Purpose**: High-level administrative view of campus operations, enrollment volume, timetable readiness, and institutional milestones.
- **Key Content & Information**:
  - Campus Identity: Campus name, campus code, director name.
  - Macro Metric Cards: Total Departments, Total Enrolled Students, Total Course Offerings, Overall Registration Progress %, Timetable Publication Status.

#### 4.6.2 Tab 1: Registration Window & Governance Controls
- **Core Purpose**: Setting deadlines, configuring credit policies, and opening/closing the course registration window for the entire campus.
- **Key Content & Information**:
  - Live Window State Banner: Prominent indicator showing whether registration is currently OPEN or CLOSED.
  - Deadline Configuration:
    - Date and time picker for registration deadline.
    - Quick preset shortcuts: `+7 Days`, `+14 Days`, `+30 Days`.
  - Academic Credit Governance:
    - Campus-wide minimum credit threshold per student.
    - Campus-wide maximum credit ceiling per student.
    - Active Academic Year definition (e.g., "2026-27").
  - Emergency Control: "Close Registration Window Immediately" action with safety confirmation.
- **User Actions**:
  - Set and extend registration deadlines.
  - Update credit boundaries and academic year.
  - Open or close the registration window.

#### 4.6.3 Tab 2: 3-Round Algorithmic Course Allocation Engine
- **Core Purpose**: Executing and reviewing the multi-round automated seat allocation algorithm that matches student preferences to course capacities.
- **Key Content & Information**:
  - Pre-Flight Status Checks:
    - Registration Window status (must be CLOSED before running allocation to guarantee preference immutability; if open, system prompts with option to "Close Window & Run Allocation").
    - Total submitted student preference count vs total seats offered.
  - Allocation Execution Trigger: "Run Course Allocation Engine" action.
  - Allocation Diagnostics & Progress Reporting:
    - Direct Confirmation Pass: Identifies under-subscribed courses where all applicants are confirmed instantly.
    - Round 1 Execution Summary: Total Rank 1 preferences matched, seats filled, students rolled over.
    - Round 2 Execution Summary: Total Rank 2 backup preferences matched.
    - Round 3 Execution Summary: Total Rank 3 backup preferences matched.
    - Residual Unallocated Cohort count (passed to HODs for manual resolution).
  - Historical Allocation Runs Table: Triggered timestamp, run duration, executed by user, total students processed, allocation success rate %, status (Completed / Failed).
- **User Actions**:
  - Trigger allocation run.
  - Inspect granular round-by-round diagnostic logs.

#### 4.6.4 Tab 3: Timetable Generation, Conflict Resolution & Publishing
- **Core Purpose**: Generating a master weekly timetable across all departments and semesters, resolving room/faculty scheduling clashes, and publishing to students and teachers.
- **Key Content & Information**:
  - Generation Parameter Configuration:
    - Days per week (Monday through Friday/Saturday).
    - Periods per day (Period 1 through Period 6).
    - Break/lunch interval definitions.
  - Solver Engine Trigger: Initiates heuristic/AI timetable solver.
  - Conflict Detection & Resolution Workspace:
    - Conflict list: Identifies overlapping faculty assignments (e.g., Teacher X assigned to two courses at Period 2 on Tuesday) or overlapping student cohort schedules.
    - Conflict details: Course codes involved, affected room/faculty, conflict severity.
    - One-click resolution suggestions or manual slot reassignments.
  - Master Timetable Grid:
    - Interactive matrix displaying Days on one axis and Periods on the other.
    - Filterable by Department, Semester, Room, or Faculty Member.
    - Cell contents: Course code, title, instructor name, assigned room/lab.
  - Publication Control: "Publish Timetable" action (makes the schedule visible to students and teachers on their dashboards).
- **User Actions**:
  - Launch timetable solver.
  - Review and resolve scheduling conflicts.
  - Inspect timetable matrix across filters.
  - Publish or unpublish master schedule.

#### 4.6.5 Tab 4: Student Cohort Semester Promotion
- **Core Purpose**: End-of-term batch promotion advancing eligible students to the next semester (e.g., advancing Semester 1 cohort to Semester 2).
- **Key Content & Information**:
  - Source Semester and Target Semester selectors.
  - Minimum completed credit threshold for promotion eligibility.
  - Cohort preview: List of qualifying students vs students on academic probation/hold.
  - Promotion Execution Trigger with safety confirmation modal.
- **User Actions**:
  - Configure promotion criteria.
  - Execute batch student promotion.

#### 4.6.6 Tab 5: Department & Campus Roster Export
- **Core Purpose**: Generating campus-wide consolidated reports for university accreditors, examination controllers, and academic councils.
- **Key Content & Information**:
  - Report type selector: Course Enrollment Rosters, Attendance Summary Statements, Credit Ledger Transcripts.
  - Format options: Excel spreadsheet, print-ready PDF.
- **User Actions**:
  - Generate and download campus reports.

---

### 4.7 SuperAdmin Experience

#### 4.7.1 Institutional Infrastructure Overview
- **Core Purpose**: Central university IT dashboard monitoring system health, campus distribution, and audit activity across the entire institution.
- **Key Content & Information**:
  - Institutional Aggregates: Total Campuses, Total Academic Departments, Total Registered Faculty, Total Active Student Body, System Logs Generated in last 24h.

#### 4.7.2 Tab 1: Physical Campus Management
- **Core Purpose**: Provisioning and managing university campuses.
- **Key Content & Information**:
  - Campus Directory: Campus Name, Campus Code (e.g., `MANGAT`, `THALAS`, `PAYYAN`), Geographic location coordinates (used for attendance geofencing), Active Status.
  - Add Campus Form:
    - Name, unique Code, Latitude, Longitude, Allowable Attendance Radius (meters).
  - Delete Campus Safety Flow: Cascading check that prevents deletion if active departments or students exist, or initiates cascade with multi-step confirmation.
- **User Actions**:
  - Create new university campus.
  - Edit campus attributes and geofence parameters.
  - Delete campus.

#### 4.7.3 Tab 2: Department Directory Management
- **Core Purpose**: Managing university academic departments and their campus affiliations.
- **Key Content & Information**:
  - Department Directory: Department Name, Department Code (e.g., `CSE`, `MAT`, `ENG`, `PHY`), Associated Campus, Head of Department Name.
  - Add Department Form: Name, Code, Campus selector.
- **User Actions**:
  - Create department.
  - Edit department metadata.
  - Remove department.

#### 4.7.4 Tab 3: Institutional Faculty & Role Directory
- **Core Purpose**: Global user governance provisioning directors, HODs, and faculty.
- **Key Content & Information**:
  - Faculty Directory: Full Name, Email, Department, Campus, Assigned Role badge (`superadmin`, `campus_director`, `hod`, `teaching_staff`, `teacher`).
  - Add Faculty / Change Role Workspace:
    - Full Name, Email, Password, Campus, Department.
    - Role Assignment selector (`campus_director`, `hod`, `teaching_staff`, `teacher`).
  - Revoke Credentials / Remove Faculty action.
- **User Actions**:
  - Provision faculty accounts.
  - Promote or adjust user role.
  - Deactivate or delete accounts.

#### 4.7.5 Tab 4: System Audit, Security & Job Execution Logs
- **Core Purpose**: Centralized security, audit, and operational event log viewer for compliance and threat detection.
- **Key Content & Information**:
  - Real-Time Audit Log Table:
    - Event Timestamp (formatted date/time).
    - Event Type badge (e.g., `user_login`, `teacher_assigned`, `allocation_run`, `timetable_generation`, `security_policy_change`).
    - Originating User: Name, role, user ID.
    - Action Description & Resource ID.
    - Execution Status badge (`success`, `failed`, `warning`).
    - Client IP Address.
  - Filter Toolbar: Search by keyword, filter by event category, filter by status, date range selector.
  - Log Detail Inspection Modal: Full JSON metadata payload viewer, error stack traces, execution parameters.
- **User Actions**:
  - Filter and search audit events.
  - Click log row to open detailed metadata modal.
  - Export audit logs for compliance review.

---

## 5. Cross-Cutting UI States & Feedback Standards

To ensure a seamless and modern user experience across all devices and roles, Google Stitch should account for the following recurring states:

1. **Skeleton Loading Screens**: Avoid generic blank white screens or spinner-only pages. Use animated shimmer skeleton placeholders that mimic the target page layout (table skeletons, card skeletons, header skeletons) while asynchronous data loads.
2. **Empty States**: Whenever a list, table, or catalog has zero records (e.g., teacher with 0 assigned courses, queue with 0 unallocated students), display an informative illustration or icon, a clear explanatory heading, and an actionable next step or guidance note.
3. **Notification Banners & Toasts**: Non-blocking, contextual toast alerts for operations:
   - Success (green accent) with affirmative messaging.
   - Error (red accent) extracting user-friendly error messages (e.g., "Invalid email or password" rather than "HTTP 400 Bad Request").
   - Warning (amber accent) for irreversible or high-impact actions (e.g., closing registration windows, running allocation).
4. **Validation Feedback**: Real-time inline field validation on forms (password complexity, email formatting, credit sum calculations) before submission.
5. **Responsive Adaptability**: Seamless transition from wide-screen desktop workspaces (complex data matrices, flow canvas workspaces) to mobile touch viewports (collapsible accordions, cards, bottom sheets).

---

## 6. Summary Checklist for Google Stitch

Use this specification to generate a cohesive, state-of-the-art UI design system and screen portfolio:
- [ ] **Cohesive Design Language**: Unified typography, harmonious palette, crisp iconography, and modern spatial hierarchy suited for an elite academic institution.
- [ ] **7 Major User Spaces**: Public/Auth, Student, Course Teacher, Teaching Staff, HOD, Campus Director, SuperAdmin.
- [ ] **All 20+ Sub-Screens & Tabs**: Every view, tab, modal, and drawer documented above.
- [ ] **Full Creative Freedom**: You decide the visual structure, layout balance, navigation paradigms, and micro-interactions.
