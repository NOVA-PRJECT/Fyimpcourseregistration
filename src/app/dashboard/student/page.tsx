'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import styles from './student-dashboard.module.css'
import StudentPlaceholderSlots from '@/component/StudentPlaceholderSlots';


interface Course {
  id: string
  course_code: string
  title: string
  credits: number
}

interface BlueprintSlot {
  slot: number
  rule: string
  name: string
  course?: Course
  options?: Course[]
}

interface BlueprintData {
  window_status: 'OPEN' | 'CLOSED'
  deadline: string
  min_credits: number
  max_credits: number
  slots: BlueprintSlot[]
}

interface StudentInfo {
  full_name: string
  roll_number: string
  current_semester: number
  department_name: string
}

type DashboardState = 'idle' | 'loading_blueprint' | 'ready' | 'submitting' | 'submitted'

export default function StudentDashboard() {
  const router = useRouter()

  const [dashState, setDashState] = useState<DashboardState>('idle')
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null)
  const [selectedCourses, setSelectedCourses] = useState<Record<number, string>>({})
  const [existingSubmission, setExistingSubmission] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loadingStudent, setLoadingStudent] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Load student info on mount
  useEffect(() => {
    async function loadStudentInfo() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: student } = await supabase
        .from('students')
        .select(`
          full_name,
          roll_number,
          current_semester,
          departments (name)
        `)
        .eq('id', user.id)
        .single()

      if (student) {
        setStudentInfo({
          full_name: student.full_name,
          roll_number: student.roll_number,
          current_semester: student.current_semester,
          department_name: (student.departments as any)?.name ?? 'Unknown',
        })
      }
      setLoadingStudent(false)
    }
    loadStudentInfo()
  }, [])

  // Fetch blueprint when Register button clicked
  async function handleRegisterClick() {
    setDashState('loading_blueprint')
    setError('')
    setSuccessMsg('')

    const response = await fetch('/api/registrations/blueprint')
    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Failed to load courses. Please try again.')
      setDashState('idle')
      return
    }

    setBlueprint(data.data)

    // If existing submission — pre-fill selections
    if (data.existing) {
      const existing = data.existing
      const prefilled: Record<number, string> = {}
      for (let i = 1; i <= 6; i++) {
        const courseId = existing[`slot_${i}_course_id`]
        if (courseId) prefilled[i] = courseId
      }
      setSelectedCourses(prefilled)
      setExistingSubmission(existing)
    }

    setDashState('ready')
  }

  // Calculate total credits dynamically
  function calculateCredits(): number {
    if (!blueprint) return 0
    let total = 0
    blueprint.slots.forEach(slot => {
      if (slot.rule === 'FIXED' && slot.course) {
        total += slot.course.credits
      } else {
        const selectedId = selectedCourses[slot.slot]
        if (selectedId && slot.options) {
          const course = slot.options.find(c => c.id === selectedId)
          if (course) total += course.credits
        }
      }
    })
    return total
  }

  // Handle dropdown change
  function handleCourseSelect(slotNumber: number, courseId: string) {
    setSelectedCourses(prev => ({ ...prev, [slotNumber]: courseId }))
    setError('')
  }

  // Submit courses
  async function handleSubmit() {
    if (!blueprint) return

    const courses: string[] = []
    for (const slot of blueprint.slots) {
      if (slot.rule === 'FIXED' && slot.course) {
        courses.push(slot.course.id)
      } else {
        const selected = selectedCourses[slot.slot]
        if (!selected) {
          setError(`Please select a course for "${slot.name}"`)
          return
        }
        courses.push(selected)
      }
    }

    setDashState('submitting')
    setError('')

    const response = await fetch('/api/registrations/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
  semester: Number(studentInfo?.current_semester),
  courses,
}),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Submission failed. Please try again.')
      setDashState('ready')
      return
    }

    setSuccessMsg(`Courses submitted! Total credits: ${data.total_credits}`)
    setExistingSubmission({})
    setDashState('submitted')
  }

  // Logout
  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const totalCredits = calculateCredits()
  const isValidCredits = blueprint
    ? totalCredits >= blueprint.min_credits && totalCredits <= blueprint.max_credits
    : false

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
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Student Info Card */}
      <div className={styles.infoCard}>
        {loadingStudent ? (
          <div className={styles.studentMeta}>
            <div className={styles.greyedBar} style={{ width: '10rem' }} />
          </div>
        ) : (
          <div className={styles.studentMeta}>
            <p className={styles.studentName}>
              {studentInfo?.full_name ?? 'Student'}
            </p>
            <div className={styles.studentDetails}>
              <span className={`${styles.detailBadge} ${styles.semBadge}`}>
                Semester {studentInfo?.current_semester}
              </span>
              <span className={styles.detailBadge}>
                {studentInfo?.department_name}
              </span>
              <span className={styles.detailBadge}>
                {studentInfo?.roll_number}
              </span>
            </div>
          </div>
        )}

        {(dashState === 'idle' || dashState === 'submitted') && (
          <button
            className={styles.registerBtn}
            onClick={handleRegisterClick}
            disabled={loadingStudent}
          >
            {existingSubmission ? 'Update →' : 'Register →'}
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>

        

        {/* ── IDLE STATE ── */}
       {dashState === 'idle' && <StudentPlaceholderSlots />}

        {/* ── LOADING ── */}
        {dashState === 'loading_blueprint' && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading your courses...</p>
          </div>
        )}

        {/* ── READY / SUBMITTING / SUBMITTED ── */}
        {(dashState === 'ready' || dashState === 'submitting' || dashState === 'submitted') && blueprint && (
          <>
            {/* Window Status */}
            <div className={`${styles.windowBanner} ${blueprint.window_status === 'OPEN' ? styles.open : styles.closed}`}>
              <div className={styles.windowDot} />
              {blueprint.window_status === 'OPEN'
                ? `Registration open — closes ${new Date(blueprint.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'Registration window is closed'}
            </div>

            {/* Read only banner */}
            {dashState === 'submitted' && (
              <div className={styles.readOnlyBanner}>
                ✓ Submitted — click Update to make changes
              </div>
            )}

            {/* Credit Counter */}
            <div className={styles.creditCounter}>
              <span className={styles.creditLabel}>Total Credits</span>
              <span className={`${styles.creditValue} ${totalCredits === 0 ? '' : isValidCredits ? styles.valid : styles.invalid}`}>
                {totalCredits}
                <span className={styles.creditRange}>
                  &nbsp;(min {blueprint.min_credits} — max {blueprint.max_credits})
                </span>
              </span>
            </div>

            <p className={styles.sectionTitle}>Select Your Papers</p>

            {/* Slots */}
            <div className={styles.slotsContainer}>
              {blueprint.slots.map(slot => (
                <div
                  key={slot.slot}
                  className={`${styles.slotCard} ${dashState === 'ready' ? styles.active : ''}`}
                >
                  <div className={styles.slotHeader}>
                    <span className={styles.slotLabel}>{slot.name}</span>
                  </div>

                  {/* Fixed course */}
                  {slot.rule === 'FIXED' && slot.course && (
                    <div className={styles.fixedCourse}>
                      <div>
                        <p className={styles.fixedCourseTitle}>{slot.course.title}</p>
                        <p className={styles.fixedCourseCode}>{slot.course.course_code}</p>
                      </div>
                      <span className={styles.creditPill}>
                        {slot.course.credits} cr
                      </span>
                    </div>
                  )}

                  {/* Elective dropdown */}
                  {slot.rule !== 'FIXED' && slot.options && (
                    <select
                      className={styles.selectInput}
                      value={selectedCourses[slot.slot] ?? ''}
                      onChange={e => handleCourseSelect(slot.slot, e.target.value)}
                      disabled={dashState === 'submitting' || dashState === 'submitted'}
                    >
                      <option value="">— Select a paper —</option>
                      {slot.options.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.title} ({course.credits} cr)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
            {error && <div className={styles.errorBanner}>{error}</div>}
        {successMsg && <div className={styles.successBanner}>✓ {successMsg}</div>}

            {/* Submit Button */}
            {(dashState === 'ready' || dashState === 'submitting') && blueprint.window_status === 'OPEN' && (
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={dashState === 'submitting' || !isValidCredits}
              >
                {dashState === 'submitting' ? (
                  <>
                    <span className={styles.smallSpinner} />
                    Submitting...
                  </>
                ) : existingSubmission ? (
                  'Update Registration →'
                ) : (
                  'Submit Registration →'
                )}
              </button>
            )}
          </>
        )}

      </div>
    </div>
  )
}
