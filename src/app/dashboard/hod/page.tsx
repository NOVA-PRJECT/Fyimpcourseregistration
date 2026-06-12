'use client'

export const dynamic = 'force-dynamic'

import BlueprintTab from './BlueprintTab'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import styles from './hod-dashboard.module.css'

// ── Types ──
interface HodInfo {
  full_name: string
  department_name: string
}

interface Program {
  _id: string
  name: string
  code: string
  semesters: number
  papers_per_semester: number
  eligibility: string
}

interface Course {
  id: string
  _id: string
  course_code: string
  title: string
  semester: number
  credits: number
  category: string
  tag?: string | null
  program_id: {
    _id: string
    name: string
    code: string
  } | null
}

type Tab = 'programs' | 'courses' | 'blueprint' | 'students'

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  superadmin: '/dashboard/superadmin',
  campus_director: '/dashboard/director',
  hod: '/dashboard/hod',
  teaching_staff: '/dashboard/teacher',
  student: '/dashboard/student',
}

const CATEGORIES = ['DSS', 'DSC', 'DSE', 'VAC', 'SEC', 'MDC', 'MOOC', 'AEC', 'INT', 'FWD', 'RPH', 'CIP']

export default function HodDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [activeTab, setActiveTab] = useState<Tab>('programs')
  const [hodInfo, setHodInfo] = useState<HodInfo | null>(null)
  const [loadingHod, setLoadingHod] = useState(true)

  // ── Programs State ──
  const [programs, setPrograms] = useState<Program[]>([])
  const [loadingPrograms, setLoadingPrograms] = useState(false)
  const [programError, setProgramError] = useState('')
  const [programSuccess, setProgramSuccess] = useState('')

  const [showAddProgram, setShowAddProgram] = useState(false)
  const [editProgram, setEditProgram] = useState<Program | null>(null)
  const [deleteProgram, setDeleteProgram] = useState<Program | null>(null)
  const [savingProgram, setSavingProgram] = useState(false)
  const [deletingProgram, setDeletingProgram] = useState(false)

  // Program form fields
  const [progName, setProgName] = useState('')
  const [progCode, setProgCode] = useState('')
  const [progSemesters, setProgSemesters] = useState(8)
  const [progPapersPerSemester, setProgPapersPerSemester] = useState(4)
  const [progEligibility, setProgEligibility] = useState<string[]>([''])

  // Logout state
  const [loggingOut, setLoggingOut] = useState(false)

  // ── Students State ──
  interface Student {
    id: string
    full_name: string
    current_semester: number
    cap_application_number: string
    roll_number: string | null
    email: string
    program_id: string | null
    program_name: string | null
  }
  const [studentsList, setStudentsList] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentError, setStudentError] = useState('')
  const [studentSuccess, setStudentSuccess] = useState('')
  const [filterStudentSemester, setFilterStudentSemester] = useState(1)

  const [showAddStudent, setShowAddStudent] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null)
  const [savingStudent, setSavingStudent] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState(false)

  // Student form fields
  const [studName, setStudName] = useState('')
  const [studEmail, setStudEmail] = useState('')
  const [studCap, setStudCap] = useState('')
  const [studRoll, setStudRoll] = useState('')
  const [studDob, setStudDob] = useState('')
  const [studSemester, setStudSemester] = useState(1)
  const [studProgramId, setStudProgramId] = useState('')

  // ── Courses State ──
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [courseError, setCourseError] = useState('')
  const [courseSuccess, setCourseSuccess] = useState('')

  // Course filters
  const [filterProgramId, setFilterProgramId] = useState('')
  const [filterSemester, setFilterSemester] = useState('')

  const [showAddCourse, setShowAddCourse] = useState(false)
  const [editCourse, setEditCourse] = useState<Course | null>(null)
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null)
  const [savingCourse, setSavingCourse] = useState(false)
  const [deletingCourse, setDeletingCourse] = useState(false)

  // Course form fields
  const [crsCode, setCrsCode] = useState('')
  const [crsTitle, setCrsTitle] = useState('')
  const [crsSemester, setCrsSemester] = useState(1)
  const [crsCredits, setCrsCredits] = useState(4)
  const [crsCategory, setCrsCategory] = useState('DSC')
  const [crsTag, setCrsTag] = useState('')
  const [crsProgramId, setCrsProgramId] = useState('')

  // ── Auth guard ──
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'hod') {
        router.push(ROLE_DASHBOARD_MAP[session.user.role] ?? '/login')
      }
    }
  }, [status, session, router])

  // Load HOD Info
  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'hod') return

    async function loadHodInfo() {
      try {
        const response = await fetch('/api/hod/info')
        if (response.ok) {
          const data = await response.json()
          setHodInfo({
            full_name: session?.user?.name ?? 'HOD',
            department_name: data.name,
          })
        }
      } catch (err) {
        console.error('Failed to load HOD info', err)
      } finally {
        setLoadingHod(false)
      }
    }
    loadHodInfo()
  }, [status, session])

  // Fetch when active tab changes
  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'hod') return

    if (activeTab === 'programs') {
      fetchPrograms()
    } else if (activeTab === 'courses') {
      fetchPrograms() // To populate course program selectors
      fetchCourses()
    } else if (activeTab === 'students') {
      fetchPrograms()
      fetchStudents()
    }
  }, [activeTab, status, session])

  // Auto-filter courses when filter values change (only when on courses tab)
  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'hod') return
    if (activeTab !== 'courses') return
    fetchCourses()
  }, [filterProgramId, filterSemester])

  // Auto-filter students when semester filter changes (only on students tab)
  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'hod') return
    if (activeTab !== 'students') return
    fetchStudents()
  }, [filterStudentSemester])

  // ══════════════════════════════════════════════════════════════════════════
  // PROGRAM CRUD OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  async function fetchPrograms() {
    setLoadingPrograms(true)
    setProgramError('')
    try {
      const res = await fetch('/api/hod/programs')
      const data = await res.json()
      if (!res.ok) setProgramError(data.error ?? 'Failed to fetch programs')
      else setPrograms(data)
    } catch {
      setProgramError('Failed to fetch programs')
    } finally {
      setLoadingPrograms(false)
    }
  }

  async function handleAddProgram() {
    const eligibilityPoints = progEligibility.map(p => p.trim()).filter(Boolean)
    if (!progName.trim() || !progCode.trim() || !progSemesters || eligibilityPoints.length === 0) {
      setProgramError('All fields are required')
      return
    }
    setSavingProgram(true)
    setProgramError('')
    setProgramSuccess('')
    try {
      const res = await fetch('/api/hod/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: progName.trim(),
          code: progCode.trim(),
          semesters: progSemesters,
          papers_per_semester: progPapersPerSemester,
          eligibility: JSON.stringify(eligibilityPoints)
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setProgramError(data.error ?? 'Failed to add program')
      } else {
        setProgramSuccess('Program added successfully')
        setShowAddProgram(false)
        setProgName('')
        setProgCode('')
        setProgSemesters(8)
        setProgPapersPerSemester(4)
        setProgEligibility([''])
        fetchPrograms()
      }
    } catch {
      setProgramError('Failed to add program')
    } finally {
      setSavingProgram(false)
    }
  }

  async function handleUpdateProgram() {
    if (!editProgram) return
    const eligibilityPoints = progEligibility.map(p => p.trim()).filter(Boolean)
    if (!progName.trim() || !progSemesters || eligibilityPoints.length === 0) {
      setProgramError('All fields are required')
      return
    }
    setSavingProgram(true)
    setProgramError('')
    setProgramSuccess('')
    try {
      const res = await fetch('/api/hod/programs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editProgram._id,
          name: progName.trim(),
          semesters: progSemesters,
          papers_per_semester: progPapersPerSemester,
          eligibility: JSON.stringify(eligibilityPoints)
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setProgramError(data.error ?? 'Failed to update program')
      } else {
        setProgramSuccess('Program updated successfully')
        setEditProgram(null)
        setProgName('')
        setProgCode('')
        setProgSemesters(8)
        setProgPapersPerSemester(4)
        setProgEligibility([''])
        fetchPrograms()
      }
    } catch {
      setProgramError('Failed to update program')
    } finally {
      setSavingProgram(false)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STUDENT CRUD OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  async function fetchStudents() {
    setLoadingStudents(true)
    setStudentError('')
    try {
      const res = await fetch(`/api/hod/students?semester=${filterStudentSemester}`)
      const data = await res.json()
      if (!res.ok) setStudentError(data.error ?? 'Failed to fetch students')
      else setStudentsList(data)
    } catch {
      setStudentError('Failed to fetch students')
    } finally {
      setLoadingStudents(false)
    }
  }

  async function handleAddStudent() {
    if (!studName.trim() || !studCap.trim() || !studDob.trim() || !studProgramId) {
      setStudentError('Name, CAP Number, Date of Birth, and Program are required')
      return
    }
    setSavingStudent(true)
    setStudentError('')
    setStudentSuccess('')
    try {
      const res = await fetch('/api/hod/students/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: studName.trim(),
          cap_application_number: studCap.trim(),
          date_of_birth: studDob.trim(),
          email: studEmail.trim() || undefined,
          program_id: studProgramId,
          current_semester: studSemester,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setStudentError(data.error ?? 'Failed to add student')
      } else {
        setStudentSuccess('Student added successfully')
        setShowAddStudent(false)
        setStudName('')
        setStudCap('')
        setStudDob('')
        setStudEmail('')
        setStudSemester(1)
        setStudProgramId('')
        fetchStudents()
      }
    } catch {
      setStudentError('Failed to add student')
    } finally {
      setSavingStudent(false)
    }
  }

  async function handleUpdateStudent() {
    if (!editStudent) return
    if (!studName.trim()) {
      setStudentError('Name is required')
      return
    }
    setSavingStudent(true)
    setStudentError('')
    setStudentSuccess('')
    try {
      const res = await fetch('/api/hod/students/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: editStudent.id,
          full_name: studName.trim(),
          current_semester: studSemester,
          program_id: studProgramId || null,
          roll_number: studRoll.trim() || null,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setStudentError(data.error ?? 'Failed to update student')
      } else {
        setStudentSuccess('Student updated successfully')
        setEditStudent(null)
        setStudName('')
        setStudCap('')
        setStudDob('')
        setStudEmail('')
        setStudRoll('')
        setStudSemester(1)
        setStudProgramId('')
        fetchStudents()
      }
    } catch {
      setStudentError('Failed to update student')
    } finally {
      setSavingStudent(false)
    }
  }

  async function handleDeleteStudent() {
    if (!deleteStudent) return
    setDeletingStudent(true)
    setStudentError('')
    setStudentSuccess('')
    try {
      const res = await fetch('/api/hod/students/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: deleteStudent.id })
      })
      const data = await res.json()
      if (!res.ok) {
        setStudentError(data.error ?? 'Failed to delete student')
      } else {
        setStudentSuccess('Student deleted successfully')
        setDeleteStudent(null)
        fetchStudents()
      }
    } catch {
      setStudentError('Failed to delete student')
    } finally {
      setDeletingStudent(false)
    }
  }

  async function handleDeleteProgram() {
    if (!deleteProgram) return
    setDeletingProgram(true)
    setProgramError('')
    setProgramSuccess('')
    try {
      const res = await fetch('/api/hod/programs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteProgram._id })
      })
      const data = await res.json()
      if (!res.ok) {
        setProgramError(data.error ?? 'Failed to delete program')
      } else {
        setProgramSuccess('Program deleted successfully')
        setDeleteProgram(null)
        fetchPrograms()
      }
    } catch {
      setProgramError('Failed to delete program')
    } finally {
      setDeletingProgram(false)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COURSE CRUD OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  async function fetchCourses() {
    setLoadingCourses(true)
    setCourseError('')
    try {
      const params = new URLSearchParams()
      if (filterProgramId) params.append('program_id', filterProgramId)
      if (filterSemester) params.append('semester', filterSemester)

      const res = await fetch(`/api/hod/courses?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) setCourseError(data.error ?? 'Failed to fetch courses')
      else setCourses(data)
    } catch {
      setCourseError('Failed to fetch courses')
    } finally {
      setLoadingCourses(false)
    }
  }

  async function handleAddCourse() {
    if (!crsCode.trim() || !crsTitle.trim() || !crsSemester || !crsCredits || !crsCategory || !crsProgramId) {
      setCourseError('All starred fields are required')
      return
    }
    setSavingCourse(true)
    setCourseError('')
    setCourseSuccess('')
    try {
      const res = await fetch('/api/hod/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_code: crsCode.trim(),
          title: crsTitle.trim(),
          semester: Number(crsSemester),
          credits: Number(crsCredits),
          category: crsCategory,
          tag: crsTag.trim() || undefined,
          program_id: crsProgramId,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setCourseError(data.error ?? 'Failed to add course')
      } else {
        setCourseSuccess('Course added successfully')
        setShowAddCourse(false)
        setCrsCode('')
        setCrsTitle('')
        setCrsSemester(1)
        setCrsCredits(4)
        setCrsCategory('DSC')
        setCrsTag('')
        setCrsProgramId('')
        fetchCourses()
      }
    } catch {
      setCourseError('Failed to add course')
    } finally {
      setSavingCourse(false)
    }
  }

  async function handleUpdateCourse() {
    if (!editCourse) return
    if (!crsTitle.trim() || !crsSemester || !crsCredits || !crsCategory || !crsProgramId) {
      setCourseError('All starred fields are required')
      return
    }
    setSavingCourse(true)
    setCourseError('')
    setCourseSuccess('')
    try {
      const res = await fetch('/api/hod/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editCourse.id,
          title: crsTitle.trim(),
          semester: Number(crsSemester),
          credits: Number(crsCredits),
          category: crsCategory,
          tag: crsTag.trim() || undefined,
          program_id: crsProgramId,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setCourseError(data.error ?? 'Failed to update course')
      } else {
        setCourseSuccess('Course updated successfully')
        setEditCourse(null)
        setCrsCode('')
        setCrsTitle('')
        setCrsSemester(1)
        setCrsCredits(4)
        setCrsCategory('DSC')
        setCrsTag('')
        setCrsProgramId('')
        fetchCourses()
      }
    } catch {
      setCourseError('Failed to update course')
    } finally {
      setSavingCourse(false)
    }
  }

  async function handleDeleteCourse() {
    if (!deleteCourse) return
    setDeletingCourse(true)
    setCourseError('')
    setCourseSuccess('')
    try {
      const res = await fetch('/api/hod/courses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: deleteCourse.id })
      })
      const data = await res.json()
      if (!res.ok) {
        setCourseError(data.error ?? 'Failed to delete course')
      } else {
        setCourseSuccess('Course deleted successfully')
        setDeleteCourse(null)
        fetchCourses()
      }
    } catch {
      setCourseError('Failed to delete course')
    } finally {
      setDeletingCourse(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    await signOut({ redirect: false })
    router.push('/login')
  }

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'hod')) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pageWrapper}>

      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.logoSmall}>
            <Image src="/logo.png" alt="KU" width={28} height={28} />
          </div>
          <div>
            <p className={styles.topBarTitle}>FYIMP Portal</p>
            <p className={styles.topBarSubtitle}>HOD Dashboard</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out…' : 'Logout'}
        </button>
      </div>

      {/* HOD Info Card */}
      <div className={styles.infoCard}>
        {loadingHod ? <div style={{ height: '2.5rem' }} /> : (
          <>
            <p className={styles.hodName}>{hodInfo?.full_name ?? 'HOD'}</p>
            <div className={styles.hodDetails}>
              <span className={`${styles.detailBadge} ${styles.roleBadge}`}>HOD</span>
              <span className={styles.detailBadge}>{hodInfo?.department_name}</span>
            </div>
          </>
        )}
      </div>

      {/* Tab Bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'programs' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('programs')}
        >
          🎓 Programs Offered
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'courses' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          📚 Courses list
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'blueprint' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('blueprint')}
        >
          📐 Blueprint Editor
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'students' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('students')}
        >
          🧑‍🎓 Students
        </button>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>

        {/* ══════════════════════════════════════
            TAB 1 — PROGRAMS OFFERED
        ══════════════════════════════════════ */}
        {activeTab === 'programs' && (
          <>
            {programError && <div className={styles.errorBanner}>{programError}</div>}
            {programSuccess && <div className={styles.successBanner}>✓ {programSuccess}</div>}

            <div className={styles.sectionHeader}>
              <p className={styles.sectionTitle}>
                Programs offered by department ({programs.length})
              </p>

              <button
                className={styles.addBtn}
                onClick={() => {
                  setShowAddProgram(true)
                  setProgramError('')
                  setProgramSuccess('')
                  setProgName('')
                  setProgCode('')
                  setProgSemesters(8)
                  setProgPapersPerSemester(4)
                  setProgEligibility([''])
                }}
              >
                + Add Program
              </button>
            </div>

            <div className={styles.tableWrapper}>
              {loadingPrograms ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <p className={styles.loadingText}>Loading programs...</p>
                </div>
              ) : programs.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🎓</div>
                  <p className={styles.emptyTitle}>No programs offered yet</p>
                  <p className={styles.emptySubtitle}>
                    Add your department's first program to get started.
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr>
                      <th>Code</th>
                      <th>Program Name</th>
                      <th>Semesters</th>
                      <th>Papers/Sem</th>
                      <th>Eligibility / Prerequisites</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((program) => (
                      <tr key={program._id} className={styles.tableRow}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{program.code}</td>
                        <td className={styles.nameCell} style={{ fontWeight: '600' }}>{program.name}</td>
                        <td>{program.semesters} sems</td>
                        <td>{program.papers_per_semester ?? 4} papers</td>
                        <td style={{ fontSize: '0.78rem', color: '#9ba1ab', maxWidth: '15rem' }}>
                          {(() => {
                            try {
                              const pts: string[] = JSON.parse(program.eligibility)
                              return <ul style={{ margin: 0, paddingLeft: '1rem' }}>{pts.map((p, i) => <li key={i}>{p}</li>)}</ul>
                            } catch {
                              return program.eligibility
                            }
                          })()}
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.approveBtn}
                              onClick={() => {
                                setEditProgram(program)
                                setProgName(program.name)
                                setProgCode(program.code)
                                setProgSemesters(program.semesters)
                                setProgPapersPerSemester(program.papers_per_semester ?? 4)
                                try {
                                  const pts = JSON.parse(program.eligibility)
                                  setProgEligibility(Array.isArray(pts) ? pts : [program.eligibility])
                                } catch {
                                  setProgEligibility([program.eligibility])
                                }
                                setProgramError('')
                                setProgramSuccess('')
                              }}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.rejectBtn}
                              onClick={() => {
                                setDeleteProgram(program)
                                setProgramError('')
                                setProgramSuccess('')
                              }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 2 — COURSES MANAGEMENT
        ══════════════════════════════════════ */}
        {activeTab === 'courses' && (
          <>
            {courseError && <div className={styles.errorBanner}>{courseError}</div>}
            {courseSuccess && <div className={styles.successBanner}>✓ {courseSuccess}</div>}

            {/* Filters Row — auto-filter on change */}
            <div className={styles.semesterRow}>
              <span className={styles.semesterLabel}>Filter Program:</span>
              <select
                className={styles.semesterSelect}
                value={filterProgramId}
                onChange={e => setFilterProgramId(e.target.value)}
              >
                <option value="">All Programs</option>
                {programs.map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                ))}
              </select>

              <span className={styles.semesterLabel} style={{ marginLeft: '0.5rem' }}>Semester:</span>
              <select
                className={styles.semesterSelect}
                value={filterSemester}
                onChange={e => setFilterSemester(e.target.value)}
              >
                <option value="">All Semesters</option>
                {[1,2,3,4,5,6,7,8,9,10].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>

              {loadingCourses && <span style={{ fontSize: '0.72rem', color: '#9ba1ab' }}>Filtering…</span>}

              <button
                className={styles.addBtn}
                style={{ marginLeft: 'auto' }}
                onClick={() => {
                  setShowAddCourse(true)
                  setCourseError('')
                  setCourseSuccess('')
                  setCrsCode('')
                  setCrsTitle('')
                  setCrsSemester(1)
                  setCrsCredits(4)
                  setCrsCategory('DSC')
                  setCrsTag('')
                  setCrsProgramId(programs[0]?._id ?? '')
                }}
              >
                + Add Course
              </button>
            </div>

            <div className={styles.tableWrapper}>
              {loadingCourses ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <p className={styles.loadingText}>Loading courses...</p>
                </div>
              ) : courses.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📚</div>
                  <p className={styles.emptyTitle}>No courses found</p>
                  <p className={styles.emptySubtitle}>
                    Add your first course or adjust filters to view courses.
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Program</th>
                      <th>Sem</th>
                      <th>Cr</th>
                      <th>Category</th>
                      <th>Tag</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                      <tr key={course.id} className={styles.tableRow}>
                        <td style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 'bold' }}>{course.course_code}</td>
                        <td style={{ fontWeight: '500' }}>{course.title}</td>
                        <td style={{ fontSize: '0.75rem', color: '#9ba1ab' }}>
                          {course.program_id ? `${course.program_id.name} (${course.program_id.code})` : '—'}
                        </td>
                        <td>S{course.semester}</td>
                        <td>{course.credits} cr</td>
                        <td>
                          <span className={styles.codeBadge}>{course.category}</span>
                        </td>
                        <td style={{ fontSize: '0.68rem', color: '#9ba1ab' }}>{course.tag ?? '—'}</td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.approveBtn}
                              onClick={() => {
                                setEditCourse(course)
                                setCrsCode(course.course_code)
                                setCrsTitle(course.title)
                                setCrsSemester(course.semester)
                                setCrsCredits(course.credits)
                                setCrsCategory(course.category)
                                setCrsTag(course.tag ?? '')
                                setCrsProgramId(course.program_id?._id ?? '')
                                setCourseError('')
                                setCourseSuccess('')
                              }}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.rejectBtn}
                              onClick={() => {
                                setDeleteCourse(course)
                                setCourseError('')
                                setCourseSuccess('')
                              }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 3 — BLUEPRINT EDITOR
        ══════════════════════════════════════ */}
        {activeTab === 'blueprint' && <BlueprintTab />}

        {/* ══════════════════════════════════════
            TAB 4 — STUDENTS MANAGEMENT
        ══════════════════════════════════════ */}
        {activeTab === 'students' && (
          <>
            {studentError && <div className={styles.errorBanner}>{studentError}</div>}
            {studentSuccess && <div className={styles.successBanner}>✓ {studentSuccess}</div>}

            <div className={styles.semesterRow}>
              <span className={styles.semesterLabel}>Filter Semester:</span>
              <select
                className={styles.semesterSelect}
                value={filterStudentSemester}
                onChange={e => setFilterStudentSemester(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>

              {loadingStudents && <span style={{ fontSize: '0.72rem', color: '#9ba1ab', marginLeft: '0.5rem' }}>Filtering…</span>}

              <button
                className={styles.addBtn}
                style={{ marginLeft: 'auto' }}
                onClick={() => {
                  setShowAddStudent(true)
                  setStudentError('')
                  setStudentSuccess('')
                  setStudName('')
                  setStudCap('')
                  setStudDob('')
                  setStudEmail('')
                  setStudSemester(filterStudentSemester)
                  setStudProgramId(programs[0]?._id ?? '')
                }}
              >
                + Add Student
              </button>
            </div>

            <div className={styles.tableWrapper}>
              {loadingStudents ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <p className={styles.loadingText}>Loading students...</p>
                </div>
              ) : studentsList.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🧑‍🎓</div>
                  <p className={styles.emptyTitle}>No students found</p>
                  <p className={styles.emptySubtitle}>
                    Add your first student or adjust filters to view students.
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr>
                      <th>CAP App No</th>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Assigned Program</th>
                      <th>Email</th>
                      <th>Semester</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.map((student) => (
                      <tr key={student.id} className={styles.tableRow}>
                        <td style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 'bold' }}>{student.cap_application_number}</td>
                        <td style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>{student.roll_number ?? '—'}</td>
                        <td style={{ fontWeight: '500' }}>{student.full_name}</td>
                        <td style={{ fontSize: '0.78rem', color: '#9ba1ab' }}>
                          {student.program_name ?? '—'}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#9ba1ab' }}>{student.email}</td>
                        <td>S{student.current_semester}</td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.approveBtn}
                              onClick={() => {
                                setEditStudent(student)
                                setStudName(student.full_name)
                                setStudRoll(student.roll_number ?? '')
                                setStudSemester(student.current_semester)
                                setStudProgramId(student.program_id ?? '')
                                setStudentError('')
                                setStudentSuccess('')
                              }}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.rejectBtn}
                              onClick={() => {
                                setDeleteStudent(student)
                                setStudentError('')
                                setStudentSuccess('')
                              }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODALS — PROGRAMS
      ════════════════════════════════════════════════════════════════════ */}

      {/* Add Program Modal */}
      {showAddProgram && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '25rem' }}>
            <h3 className={styles.modalTitle}>Add Program</h3>
            <p className={styles.modalSubtitle}>Create a new program in your department.</p>

            {programError && <div className={styles.errorBanner}>{programError}</div>}

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Program Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. B.Sc. Computer Science"
                  value={progName}
                  onChange={e => setProgName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Program Code *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. BSCCS"
                  value={progCode}
                  onChange={e => setProgCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Number of Semesters *</label>
                <select
                  className={styles.input}
                  value={progSemesters}
                  onChange={e => setProgSemesters(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => (
                    <option key={s} value={s}>{s} Semesters</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Number of Papers to Choose *</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className={styles.input}
                  value={progPapersPerSemester}
                  onChange={e => setProgPapersPerSemester(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Prerequisites / Eligibility *</label>
                {progEligibility.map((point, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#9ba1ab', minWidth: '1rem' }}>•</span>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder={`Prerequisite ${idx + 1}`}
                      value={point}
                      onChange={e => {
                        const updated = [...progEligibility]
                        updated[idx] = e.target.value
                        setProgEligibility(updated)
                      }}
                      style={{ flex: 1 }}
                    />
                    {progEligibility.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setProgEligibility(progEligibility.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: '1rem', padding: '0 0.25rem', lineHeight: 1 }}
                        title="Remove"
                      >×</button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setProgEligibility([...progEligibility, ''])}
                  style={{ alignSelf: 'flex-start', marginTop: '0.25rem', background: 'none', border: '1px dashed #9ba1ab', borderRadius: '0.35rem', padding: '0.25rem 0.65rem', fontSize: '0.72rem', color: '#44474e', cursor: 'pointer' }}
                >
                  + Add point
                </button>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setShowAddProgram(false)}
                disabled={savingProgram}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleAddProgram}
                disabled={savingProgram}
              >
                {savingProgram ? 'Saving...' : 'Add Program →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Program Modal */}
      {editProgram && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '25rem' }}>
            <h3 className={styles.modalTitle}>Edit Program</h3>
            <p className={styles.modalSubtitle}>Edit details for {editProgram.code}.</p>

            {programError && <div className={styles.errorBanner}>{programError}</div>}

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Program Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={progName}
                  onChange={e => setProgName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Program Code</label>
                <input
                  type="text"
                  className={styles.input}
                  value={progCode}
                  disabled
                  style={{ opacity: 0.5 }}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Number of Semesters *</label>
                <select
                  className={styles.input}
                  value={progSemesters}
                  onChange={e => setProgSemesters(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => (
                    <option key={s} value={s}>{s} Semesters</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Number of Papers to Choose *</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className={styles.input}
                  value={progPapersPerSemester}
                  onChange={e => setProgPapersPerSemester(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Prerequisites / Eligibility *</label>
                {progEligibility.map((point, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#9ba1ab', minWidth: '1rem' }}>•</span>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder={`Prerequisite ${idx + 1}`}
                      value={point}
                      onChange={e => {
                        const updated = [...progEligibility]
                        updated[idx] = e.target.value
                        setProgEligibility(updated)
                      }}
                      style={{ flex: 1 }}
                    />
                    {progEligibility.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setProgEligibility(progEligibility.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: '1rem', padding: '0 0.25rem', lineHeight: 1 }}
                        title="Remove"
                      >×</button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setProgEligibility([...progEligibility, ''])}
                  style={{ alignSelf: 'flex-start', marginTop: '0.25rem', background: 'none', border: '1px dashed #9ba1ab', borderRadius: '0.35rem', padding: '0.25rem 0.65rem', fontSize: '0.72rem', color: '#44474e', cursor: 'pointer' }}
                >
                  + Add point
                </button>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setEditProgram(null)}
                disabled={savingProgram}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleUpdateProgram}
                disabled={savingProgram}
              >
                {savingProgram ? 'Saving...' : 'Save Changes →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Program Modal */}
      {deleteProgram && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Delete Program</h3>
            <p className={styles.modalSubtitle}>
              Are you sure you want to permanently delete program <strong>{deleteProgram.name} ({deleteProgram.code})</strong>?
              This will fail if any courses are currently linked to this program. This cannot be undone.
            </p>

            {programError && <div className={styles.errorBanner}>{programError}</div>}

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setDeleteProgram(null)}
                disabled={deletingProgram}
              >
                Cancel
              </button>
              <button
                className={styles.modalDeleteBtn}
                onClick={handleDeleteProgram}
                disabled={deletingProgram}
              >
                {deletingProgram ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODALS — COURSES
      ════════════════════════════════════════════════════════════════════ */}

      {/* Add Course Modal */}
      {showAddCourse && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '25rem' }}>
            <h3 className={styles.modalTitle}>Add Course</h3>
            <p className={styles.modalSubtitle}>Add a new course to your department.</p>

            {courseError && <div className={styles.errorBanner}>{courseError}</div>}

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Course Code *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. KU01DSCMAT101"
                  value={crsCode}
                  onChange={e => setCrsCode(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Title *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Differential Calculus"
                  value={crsTitle}
                  onChange={e => setCrsTitle(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Program *</label>
                <select
                  className={styles.input}
                  value={crsProgramId}
                  onChange={e => setCrsProgramId(e.target.value)}
                >
                  <option value="">— Select Program —</option>
                  {programs.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Semester *</label>
                <select
                  className={styles.input}
                  value={crsSemester}
                  onChange={e => setCrsSemester(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Credits *</label>
                <input
                  type="number"
                  className={styles.input}
                  min={1}
                  max={10}
                  value={crsCredits}
                  onChange={e => setCrsCredits(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Category *</label>
                <select
                  className={styles.input}
                  value={crsCategory}
                  onChange={e => setCrsCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Tag (optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. POOL-A"
                  value={crsTag}
                  onChange={e => setCrsTag(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setShowAddCourse(false)}
                disabled={savingCourse}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleAddCourse}
                disabled={savingCourse}
              >
                {savingCourse ? 'Saving...' : 'Add Course →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editCourse && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '25rem' }}>
            <h3 className={styles.modalTitle}>Edit Course</h3>
            <p className={styles.modalSubtitle}>Edit details for course {editCourse.course_code}.</p>

            {courseError && <div className={styles.errorBanner}>{courseError}</div>}

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Course Code</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editCourse.course_code}
                  disabled
                  style={{ opacity: 0.5 }}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Title *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={crsTitle}
                  onChange={e => setCrsTitle(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Program *</label>
                <select
                  className={styles.input}
                  value={crsProgramId}
                  onChange={e => setCrsProgramId(e.target.value)}
                >
                  <option value="">— Select Program —</option>
                  {programs.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Semester *</label>
                <select
                  className={styles.input}
                  value={crsSemester}
                  onChange={e => setCrsSemester(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Credits *</label>
                <input
                  type="number"
                  className={styles.input}
                  min={1}
                  max={10}
                  value={crsCredits}
                  onChange={e => setCrsCredits(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Category *</label>
                <select
                  className={styles.input}
                  value={crsCategory}
                  onChange={e => setCrsCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Tag (optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={crsTag}
                  onChange={e => setCrsTag(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setEditCourse(null)}
                disabled={savingCourse}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleUpdateCourse}
                disabled={savingCourse}
              >
                {savingCourse ? 'Saving...' : 'Save Changes →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Course Modal */}
      {deleteCourse && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Delete Course</h3>
            <p className={styles.modalSubtitle}>
              Are you sure you want to permanently delete course <strong>{deleteCourse.title} ({deleteCourse.course_code})</strong>?
              This action cannot be undone.
            </p>

            {courseError && <div className={styles.errorBanner}>{courseError}</div>}

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setDeleteCourse(null)}
                disabled={deletingCourse}
              >
                Cancel
              </button>
              <button
                className={styles.modalDeleteBtn}
                onClick={handleDeleteCourse}
                disabled={deletingCourse}
              >
                {deletingCourse ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '25rem' }}>
            <h3 className={styles.modalTitle}>Add Student</h3>
            <p className={styles.modalSubtitle}>Register a new student in your department.</p>

            {studentError && <div className={styles.errorBanner}>{studentError}</div>}

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Full Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Alice John"
                  value={studName}
                  onChange={e => setStudName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>CAP Application Number *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. CAP202612345"
                  value={studCap}
                  onChange={e => setStudCap(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Date of Birth (Password) *</label>
                <input
                  type="date"
                  className={styles.input}
                  value={studDob}
                  onChange={e => setStudDob(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email Address (Optional)</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="e.g. student@email.com"
                  value={studEmail}
                  onChange={e => setStudEmail(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Program *</label>
                <select
                  className={styles.input}
                  value={studProgramId}
                  onChange={e => setStudProgramId(e.target.value)}
                >
                  <option value="">— Select Program —</option>
                  {programs.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Current Semester *</label>
                <select
                  className={styles.input}
                  value={studSemester}
                  onChange={e => setStudSemester(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setShowAddStudent(false)}
                disabled={savingStudent}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleAddStudent}
                disabled={savingStudent}
              >
                {savingStudent ? 'Saving...' : 'Add Student →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudent && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '25rem' }}>
            <h3 className={styles.modalTitle}>Edit Student</h3>
            <p className={styles.modalSubtitle}>Update student profile information.</p>

            {studentError && <div className={styles.errorBanner}>{studentError}</div>}

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Full Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={studName}
                  onChange={e => setStudName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Roll Number</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. ROLL-101"
                  value={studRoll}
                  onChange={e => setStudRoll(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Program *</label>
                <select
                  className={styles.input}
                  value={studProgramId}
                  onChange={e => setStudProgramId(e.target.value)}
                >
                  <option value="">— Select Program —</option>
                  {programs.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Current Semester *</label>
                <select
                  className={styles.input}
                  value={studSemester}
                  onChange={e => setStudSemester(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setEditStudent(null)}
                disabled={savingStudent}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleUpdateStudent}
                disabled={savingStudent}
              >
                {savingStudent ? 'Saving...' : 'Save Changes →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Modal */}
      {deleteStudent && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Delete Student</h3>
            <p className={styles.modalSubtitle}>
              Are you sure you want to permanently delete student <strong>{deleteStudent.full_name}</strong>?
              This will also remove all their course preferences. This action cannot be undone.
            </p>

            {studentError && <div className={styles.errorBanner}>{studentError}</div>}

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setDeleteStudent(null)}
                disabled={deletingStudent}
              >
                Cancel
              </button>
              <button
                className={styles.modalDeleteBtn}
                onClick={handleDeleteStudent}
                disabled={deletingStudent}
              >
                {deletingStudent ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
