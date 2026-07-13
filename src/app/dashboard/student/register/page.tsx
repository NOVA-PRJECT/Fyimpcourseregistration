'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from '../student-dashboard.module.css'
import ResourceBanner from '@/component/ResourceBanner'

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
  current_semester: number
}

type PageState = 'loading_blueprint' | 'closed' | 'ready' | 'submitting' | 'submitted'

export default function RegisterPage() {
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>('loading_blueprint')
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null)
  const [selectedCourses, setSelectedCourses] = useState<Record<number, string>>({})
  const [existingSubmission, setExistingSubmission] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)


  useEffect(() => {
    async function loadBlueprint() {
      // Load blueprint
      const response = await fetch('/api/registrations/blueprint')
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Failed to load courses. Please try again.')
        setPageState('closed')
        return
      }

      if (data.student) {
        setStudentInfo({ full_name: data.student.full_name, current_semester: data.student.current_semester })
      }

      setBlueprint(data.data)

      if (data.data.window_status === 'CLOSED') {
        setPageState('closed')
        return
      }

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

      setPageState('ready')
    }

    loadBlueprint()
  }, [])

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

  function handleCourseSelect(slotNumber: number, courseId: string) {
    setSelectedCourses(prev => ({ ...prev, [slotNumber]: courseId }))
    setError('')
  }

  async function handleSubmit() {
    if (!blueprint || !studentInfo) return

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

    setPageState('submitting')
    setError('')

    const response = await fetch('/api/registrations/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        semester: Number(studentInfo.current_semester),
        courses,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Submission failed. Please try again.')
      setPageState('ready')
      return
    }

    setSuccessMsg(`Courses submitted! Total credits: ${data.total_credits}`)
    setExistingSubmission({})
    setPageState('submitted')
    setTimeout(() => setSuccessMsg(''), 1000)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
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
            <p className={styles.topBarSubtitle}>
              {studentInfo?.full_name
                ? `${studentInfo.full_name} — Sem ${studentInfo.current_semester}`
                : 'Course Registration'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={styles.logoutBtn}
            onClick={() => router.push('/dashboard/student')}
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            ← Back
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>

      <div className={styles.mainContent}>

        <ResourceBanner />

        {/* Loading Blueprint */}
        {pageState === 'loading_blueprint' && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading your courses...</p>
          </div>
        )}

        {/* Closed */}
        {pageState === 'closed' && (
          <div className={styles.closedState}>
            <div className={styles.closedIcon}>🔒</div>
            <p className={styles.closedTitle}>Registration Window is Closed</p>
            <p className={styles.closedSubtitle}>
              {error || 'The registration window for this semester is currently closed. Please check back when your Campus Director opens it.'}
            </p>
            {blueprint?.deadline && (
              <div className={styles.closedDeadline}>
                Last deadline was{' '}
                {new Date(blueprint.deadline).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            )}
            <button className={styles.closedBackBtn} onClick={() => router.push('/dashboard/student')}>
              ← Go Back
            </button>
          </div>
        )}

        {/* Ready / Submitting / Submitted */}
        {(pageState === 'ready' || pageState === 'submitting' || pageState === 'submitted') && blueprint && (
          <>
            {/* Window Status Banner */}
            <div className={`${styles.windowBanner} ${blueprint.window_status === 'OPEN' ? styles.open : styles.closed}`}>
              <div className={styles.windowDot} />
              {blueprint.window_status === 'OPEN'
                ? `Registration open — closes ${new Date(blueprint.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'Registration window is closed'}
            </div>

            {pageState === 'submitted' && (
              <div className={styles.readOnlyBanner}>
                ✓ Submitted — click Update to make changes
              </div>
            )}

            {/* Credit Counter */}
            <div className={styles.creditCounter}>
              <span className={styles.creditLabel}>Total Credits</span>
              <span className={`${styles.creditValue} ${
                totalCredits === 0 ? '' : isValidCredits ? styles.valid : styles.invalid
              }`}>
                {totalCredits}
                <span className={styles.creditRange}>
                  &nbsp;(min {blueprint.min_credits} — max {blueprint.max_credits})
                </span>
              </span>
            </div>

            <p className={styles.sectionTitle}>Select Your Papers</p>

            <div className={styles.slotsContainer}>
              {blueprint.slots.map(slot => (
                <div
                  key={slot.slot}
                  className={`${styles.slotCard} ${pageState === 'ready' ? styles.active : ''}`}
                >
                  <div className={styles.slotHeader}>
                    <span className={styles.slotLabel}>{slot.name}</span>
                  </div>

                  {slot.rule === 'FIXED' && slot.course && (
                    <div className={styles.fixedCourse}>
                      <div>
                        <p className={styles.fixedCourseTitle}>{slot.course.title}</p>
                        <p className={styles.fixedCourseCode}>{slot.course.course_code}</p>
                      </div>
                      <span className={styles.creditPill}>{slot.course.credits} cr</span>
                    </div>
                  )}

                  {slot.rule !== 'FIXED' && slot.options && (
                    <select
                      className={styles.selectInput}
                      value={selectedCourses[slot.slot] ?? ''}
                      onChange={e => handleCourseSelect(slot.slot, e.target.value)}
                      disabled={pageState === 'submitting' || pageState === 'submitted'}
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
            {successMsg && (
              <div className={styles.successModalOverlay} onClick={() => setSuccessMsg('')}>
                <div className={styles.successModalContent} onClick={e => e.stopPropagation()}>
                  <div className={styles.successModalIcon}>✓</div>
                  <p className={styles.successModalText}>{successMsg}</p>
                  <button className={styles.successModalClose} onClick={() => setSuccessMsg('')}>✕</button>
                </div>
              </div>
            )}

            {(pageState === 'ready' || pageState === 'submitting') && blueprint.window_status === 'OPEN' && (
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={pageState === 'submitting' || !isValidCredits}
              >
                {pageState === 'submitting' ? (
                  <><span className={styles.smallSpinner} /> Submitting...</>
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
