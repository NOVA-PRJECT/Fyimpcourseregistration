'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import styles from './student-dashboard.module.css'
import StudentPlaceholderSlots from '@/component/StudentPlaceholderSlots'
import ResourceBanner from '@/component/ResourceBanner'

interface Course {
  id: string
  course_code: string
  title: string
  credits: number
}

type DashboardState = 'idle' | 'loading_courses' | 'ready' | 'submitting' | 'submitted'

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  superadmin: '/dashboard/superadmin',
  campus_director: '/dashboard/director',
  hod: '/dashboard/hod',
  teaching_staff: '/dashboard/teacher',
  student: '/dashboard/student',
}

interface StudentInfo {
  department_name: string
  semester: number
  roll_number: string | null
  program_id: string | null
  program_name: string | null
  papers_per_semester: number
}

export default function StudentDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [dashState, setDashState] = useState<DashboardState>('idle')
  const [papersPerSemester, setPapersPerSemester] = useState(4)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourses, setSelectedCourses] = useState<Record<number, string>>({})
  const [existingSubmission, setExistingSubmission] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  // Student info card state
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'student') {
        router.push(ROLE_DASHBOARD_MAP[session.user.role] ?? '/login')
      } else {
        // Fetch student info
        fetch('/api/student/info')
          .then(r => r.json())
          .then(d => { if (d.department_name) setStudentInfo(d) })
          .catch(() => {})
      }
    }
  }, [status, session, router])

  const studentName = session?.user?.name ?? 'Student'

  async function handleRegisterClick() {
    setDashState('loading_courses')
    setError('')
    setSuccessMsg('')

    const res = await fetch('/api/student/blueprint')
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to load courses.')
      setDashState('idle')
      return
    }

    setPapersPerSemester(data.papers_per_semester ?? 4)
    setCourses(data.courses ?? [])

    // Pre-fill from existing submission if any
    if (data.existing) {
      setExistingSubmission(true)
      const prefilled: Record<number, string> = {}
      const existingSlots: any[] = data.existing.slots ?? []
      for (const s of existingSlots) {
        if (s.preferences && s.preferences.length > 0) {
          prefilled[s.slot] = s.preferences[0].course_id.toString()
        }
      }
      setSelectedCourses(prefilled)
    } else {
      setSelectedCourses({})
      setExistingSubmission(false)
    }

    setDashState('ready')
  }

  function handleCourseSelect(slotNum: number, courseId: string) {
    setSelectedCourses(prev => {
      const updated = { ...prev }
      if (courseId === '') {
        delete updated[slotNum]
      } else {
        updated[slotNum] = courseId
      }
      return updated
    })
    setError('')
  }

  function calculateCredits(): number {
    let total = 0
    for (const [_, courseId] of Object.entries(selectedCourses)) {
      const course = courses.find(c => c.id === courseId)
      if (course) total += course.credits
    }
    return total
  }

  async function handleSubmit() {
    // Validate that all slots are selected
    for (let slot = 1; slot <= papersPerSemester; slot++) {
      if (!selectedCourses[slot]) {
        setError(`Please select a course for Paper ${slot}`)
        return
      }
    }

    setDashState('submitting')
    setError('')

    const slotsPayload = Array.from({ length: papersPerSemester }, (_, i) => {
      const slot = i + 1
      const courseId = selectedCourses[slot]
      return {
        slot,
        type: 'ELECTIVE',
        preferences: [
          { rank: 1, course_id: courseId }
        ]
      }
    })

    const res = await fetch('/api/student/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots: slotsPayload }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Submission failed.')
      setDashState('ready')
      return
    }

    setSuccessMsg('Preferences submitted successfully!')
    setExistingSubmission(true)
    setDashState('submitted')
  }

  async function handleLogout() {
    setLoggingOut(true)
    await signOut({ redirect: false })
    router.push('/login')
  }

  const totalCredits = calculateCredits()

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'student')) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
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
            <p className={styles.topBarSubtitle}>Student Dashboard</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      {/* Student Info Card */}
      <div className={styles.infoCard}>
        <div className={styles.studentMeta}>
          <p className={styles.studentName}>{studentName}</p>
          <div className={styles.studentDetails}>
            <span className={`${styles.detailBadge} ${styles.semBadge}`}>
              Student
            </span>
            {studentInfo ? (
              <>
                <span className={styles.detailBadge}>{studentInfo.department_name}</span>
                {studentInfo.program_name && (
                  <span className={styles.detailBadge}>{studentInfo.program_name}</span>
                )}
                <span className={styles.detailBadge}>Semester {studentInfo.semester}</span>
                {studentInfo.roll_number && (
                  <span className={styles.detailBadge} style={{ fontFamily: 'monospace' }}>
                    {studentInfo.roll_number}
                  </span>
                )}
              </>
            ) : null}
          </div>
        </div>

        {(dashState === 'idle' || dashState === 'submitted') && (
          <button className={styles.registerBtn} onClick={handleRegisterClick}>
            {existingSubmission ? 'Update →' : 'Register →'}
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>

        <ResourceBanner />

        {dashState === 'idle' && error && (
          <div className={styles.errorBanner}>{error}</div>
        )}

        {dashState === 'idle' && <StudentPlaceholderSlots />}

        {dashState === 'loading_courses' && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading your courses...</p>
          </div>
        )}

        {(dashState === 'ready' || dashState === 'submitting' || dashState === 'submitted') && (
          <>
            {/* Submitted banner */}
            {dashState === 'submitted' && (
              <div className={styles.readOnlyBanner}>
                ✓ Submitted — click Update to make changes
              </div>
            )}

            {/* Credit Counter */}
            <div className={styles.creditCounter}>
              <span className={styles.creditLabel}>Total Credits Selected</span>
              <span className={`${styles.creditValue} ${styles.valid}`}>
                {totalCredits} cr
              </span>
            </div>

            <p className={styles.sectionTitle}>Select Your Papers</p>

            <div className={styles.slotsContainer}>
              {Array.from({ length: papersPerSemester }, (_, i) => {
                const slotNum = i + 1
                const selectedId = selectedCourses[slotNum] ?? ''
                const usedIds = Object.entries(selectedCourses)
                  .filter(([s]) => Number(s) !== slotNum)
                  .map(([, id]) => id)
                const availableOptions = courses.filter(
                  c => !usedIds.includes(c.id) || c.id === selectedId
                )

                return (
                  <div key={slotNum} className={`${styles.slotCard} ${dashState === 'ready' ? styles.active : ''}`}>
                    <div className={styles.slotHeader}>
                      <span className={styles.slotLabel}>Paper {slotNum}</span>
                    </div>
                    <div className={styles.preferencesContainer}>
                      <div className={styles.preferenceRow}>
                        <select
                          className={styles.selectInput}
                          value={selectedId}
                          onChange={e => handleCourseSelect(slotNum, e.target.value)}
                          disabled={dashState === 'submitting' || dashState === 'submitted'}
                        >
                          <option value="">— Choose Course —</option>
                          {availableOptions.map(course => (
                            <option key={course.id} value={course.id}>
                              {course.title} ({course.course_code} - {course.credits} cr)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}
            {successMsg && <div className={styles.successBanner}>✓ {successMsg}</div>}

            {(dashState === 'ready' || dashState === 'submitting') && (
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={dashState === 'submitting'}
              >
                {dashState === 'submitting'
                  ? <><span className={styles.smallSpinner} /> Submitting...</>
                  : existingSubmission ? 'Update Selection →' : 'Submit Selection →'
                }
              </button>
            )}
          </>
        )}

      </div>
    </div>
  )
}
