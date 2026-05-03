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

interface BlueprintSlot {
  slot: number
  rule: string
  name: string
  course?: Course       // FIXED slots
  options?: Course[]    // elective slots
}

interface BlueprintData {
  min_credits: number
  max_credits: number
  slots: BlueprintSlot[]
}

// preferences[slotNumber][rank] = courseId
type SlotPreferences = Record<number, Record<number, string>>

type DashboardState = 'idle' | 'loading_blueprint' | 'ready' | 'submitting' | 'submitted'

export default function StudentDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [dashState, setDashState] = useState<DashboardState>('idle')
  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null)
  // slotPreferences[slotNum][rank 1..N] = courseId
  const [slotPreferences, setSlotPreferences] = useState<SlotPreferences>({})
  const [existingSubmission, setExistingSubmission] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const studentName = session?.user?.name ?? 'Student'
  const studentRole = (session?.user as any)?.role

  async function handleRegisterClick() {
    setDashState('loading_blueprint')
    setError('')
    setSuccessMsg('')

    const res = await fetch('/api/student/blueprint')
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to load courses.')
      setDashState('idle')
      return
    }

    setBlueprint(data.data)

    // Pre-fill from existing submission if any
    if (data.existing) {
      setExistingSubmission(true)
      const prefilled: SlotPreferences = {}
      const existingSlots: any[] = data.existing.slots ?? []
      for (const s of existingSlots) {
        if (s.type === 'ELECTIVE' && s.preferences?.length) {
          prefilled[s.slot] = {}
          for (const p of s.preferences) {
            prefilled[s.slot][p.rank] = p.course_id.toString()
          }
        }
      }
      setSlotPreferences(prefilled)
    } else {
      setSlotPreferences({})
      setExistingSubmission(false)
    }

    setDashState('ready')
  }

  // Set a preference rank for a slot
  function handlePreferenceSelect(slotNum: number, rank: number, courseId: string) {
    setSlotPreferences(prev => {
      const slotPrefs = { ...(prev[slotNum] ?? {}) }

      // If this courseId is already selected at another rank in this slot, clear it
      for (const r of Object.keys(slotPrefs)) {
        if (slotPrefs[Number(r)] === courseId && Number(r) !== rank) {
          delete slotPrefs[Number(r)]
        }
      }

      if (courseId === '') {
        delete slotPrefs[rank]
      } else {
        slotPrefs[rank] = courseId
      }

      return { ...prev, [slotNum]: slotPrefs }
    })
    setError('')
  }

  // Calculate total credits — use preference rank 1 for electives
  function calculateCredits(): number {
    if (!blueprint) return 0
    let total = 0
    for (const slot of blueprint.slots) {
      if (slot.rule === 'FIXED' && slot.course) {
        total += slot.course.credits
      } else if (slot.options) {
        const firstChoice = slotPreferences[slot.slot]?.[1]
        if (firstChoice) {
          const course = slot.options.find(c => c.id === firstChoice)
          if (course) total += course.credits
        }
      }
    }
    return total
  }

  async function handleSubmit() {
    if (!blueprint) return

    // Validate all elective slots have at least rank 1 selected
    for (const slot of blueprint.slots) {
      if (slot.rule !== 'FIXED' && slot.options && slot.options.length > 0) {
        if (!slotPreferences[slot.slot]?.[1]) {
          setError(`Please select at least your first preference for "${slot.name}"`)
          return
        }
      }
    }

    setDashState('submitting')
    setError('')

    // Build slots payload matching Preference model
    const slotsPayload = blueprint.slots.map(slot => {
      if (slot.rule === 'FIXED' && slot.course) {
        return {
          slot: slot.slot,
          type: 'FIXED',
          course_id: slot.course.id,
        }
      }
      const prefs = slotPreferences[slot.slot] ?? {}
      const preferences = Object.entries(prefs)
        .map(([rank, courseId]) => ({ rank: Number(rank), course_id: courseId }))
        .sort((a, b) => a.rank - b.rank)

      return {
        slot: slot.slot,
        type: 'ELECTIVE',
        preferences,
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
  const isValidCredits = blueprint
    ? totalCredits >= blueprint.min_credits && totalCredits <= blueprint.max_credits
    : false

  if (status === 'loading') {
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
              {studentRole ?? 'Student'}
            </span>
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

        {dashState === 'loading_blueprint' && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading your courses...</p>
          </div>
        )}

        {(dashState === 'ready' || dashState === 'submitting' || dashState === 'submitted') && blueprint && (
          <>
            {/* Submitted banner */}
            {dashState === 'submitted' && (
              <div className={styles.readOnlyBanner}>
                ✓ Submitted — click Update to make changes
              </div>
            )}

            {/* Credit Counter */}
            <div className={styles.creditCounter}>
              <span className={styles.creditLabel}>Estimated Credits (1st preference)</span>
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
                <div key={slot.slot} className={`${styles.slotCard} ${dashState === 'ready' ? styles.active : ''}`}>

                  <div className={styles.slotHeader}>
                    <span className={styles.slotLabel}>{slot.name}</span>
                    {slot.rule === 'FIXED' && (
                      <span className={styles.fixedBadge}>Fixed</span>
                    )}
                  </div>

                  {/* FIXED slot */}
                  {slot.rule === 'FIXED' && slot.course && (
                    <div className={styles.fixedCourse}>
                      <div>
                        <p className={styles.fixedCourseTitle}>{slot.course.title}</p>
                        <p className={styles.fixedCourseCode}>{slot.course.course_code}</p>
                      </div>
                      <span className={styles.creditPill}>{slot.course.credits} cr</span>
                    </div>
                  )}

                  {/* ELECTIVE slot — ranked preference sub-slots */}
                  {slot.rule !== 'FIXED' && slot.options && slot.options.length > 0 && (
                    <div className={styles.preferencesContainer}>
                      {slot.options.map((_, idx) => {
                        const rank = idx + 1
                        const selectedId = slotPreferences[slot.slot]?.[rank] ?? ''

                        // Options available for this rank = all options minus ones
                        // already selected at OTHER ranks in this slot
                        const usedIds = Object.entries(slotPreferences[slot.slot] ?? {})
                          .filter(([r]) => Number(r) !== rank)
                          .map(([, id]) => id)

                        const availableOptions = slot.options!.filter(
                          c => !usedIds.includes(c.id) || c.id === selectedId
                        )

                        return (
                          <div key={rank} className={styles.preferenceRow}>
                            <span className={styles.preferenceRank}>
                              {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`}
                            </span>
                            <select
                              className={styles.selectInput}
                              value={selectedId}
                              onChange={e => handlePreferenceSelect(slot.slot, rank, e.target.value)}
                              disabled={dashState === 'submitting' || dashState === 'submitted'}
                            >
                              <option value="">— Preference {rank} —</option>
                              {availableOptions.map(course => (
                                <option key={course.id} value={course.id}>
                                  {course.title} ({course.credits} cr)
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      })}
                      <p className={styles.preferenceHint}>
                        Rank all options — allocation uses your highest available preference
                      </p>
                    </div>
                  )}

                  {slot.rule !== 'FIXED' && (!slot.options || slot.options.length === 0) && (
                    <p className={styles.noCoursesMsg}>No courses available for this slot yet.</p>
                  )}

                </div>
              ))}
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
                  : existingSubmission ? 'Update Preferences →' : 'Submit Preferences →'
                }
              </button>
            )}
          </>
        )}

      </div>
    </div>
  )
}
