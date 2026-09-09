'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from '../student-dashboard.module.css'
import ResourceBanner from '@/component/ResourceBanner'
import { useBfcacheGuard } from '@/core/hooks/useBfcacheGuard'

interface Course {
  id: string
  course_code: string
  title: string
  credits: number
  department_name?: string
}

function CustomSelect({
  options,
  value,
  onChange,
  disabled,
  placeholder = '— Select a paper —',
}: {
  options: Course[]
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedCourse = options.find((c) => c.id === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div ref={containerRef} className={styles.customSelectWrapper}>
      <button
        type="button"
        className={styles.customSelectTrigger}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {selectedCourse ? (
          <div className={styles.triggerContent}>
            <span className={styles.triggerTitle}>{selectedCourse.title}</span>
            <span className={styles.triggerMeta}>
              {selectedCourse.course_code ? `${selectedCourse.course_code} • ` : ''}
              {selectedCourse.department_name || 'General'} • {selectedCourse.credits} cr
            </span>
          </div>
        ) : (
          <span className={styles.placeholderText}>{placeholder}</span>
        )}
        <span className={styles.triggerArrow} />
      </button>

      {isOpen && (
        <div className={styles.customSelectDropdown}>
          {options.length === 0 ? (
            <div className={styles.customOptionNoData}>No options available</div>
          ) : (
            <>
              {placeholder && (
                <div
                  className={`${styles.customOption} ${!value ? styles.selected : ''}`}
                  onClick={() => {
                    onChange('')
                    setIsOpen(false)
                  }}
                >
                  <span className={styles.placeholderOption}>{placeholder}</span>
                </div>
              )}
              {options.map((course) => (
                <div
                  key={course.id}
                  className={`${styles.customOption} ${value === course.id ? styles.selected : ''}`}
                  onClick={() => {
                    onChange(course.id)
                    setIsOpen(false)
                  }}
                >
                  <div className={styles.optionUpper}>{course.title}</div>
                  <div className={styles.optionLower}>
                    <span className={styles.optionDept}>
                      {course.course_code ? `${course.course_code} • ` : ''}
                      {course.department_name || 'General'}
                    </span>
                    <span className={styles.optionCredits}>{course.credits} cr</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface BlueprintSlot {
  slot: number
  rule: string
  name: string
  course?: Course
  options?: Course[]
}

interface PathwaySummary {
  id: string
  name: string
}

interface BlueprintData {
  window_status: 'OPEN' | 'CLOSED'
  windowOpen?: boolean
  deadline: string
  min_credits: number
  max_credits: number
  slots?: BlueprintSlot[]
  pathways?: PathwaySummary[]
  pathway_id?: string
  existingPreferences?: Record<string, { course_id: string; rank: number }[]>
  allocationMetadata?: Record<string, any>
  existingSlots?: Record<string, string | null>
}

interface StudentInfo {
  full_name: string
  current_semester: number
}

interface SlotRankedPreferences {
  rank1: string
  rank2: string
  rank3: string
}

type PageState =
  | 'loading_blueprint'
  | 'closed'
  | 'pathway_picker'
  | 'loading_slots'
  | 'ready'
  | 'submitting'
  | 'submitted'

export default function RegisterPage() {
  useBfcacheGuard()
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>('loading_blueprint')
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null)
  const [resolvedSlots, setResolvedSlots] = useState<BlueprintSlot[]>([])
  const [selectedPathwayId, setSelectedPathwayId] = useState<string | null>(null)

  // Scored model preferences per slot
  const [rankedPreferences, setRankedPreferences] = useState<Record<number, SlotRankedPreferences>>({})
  const [existingSlots, setExistingSlots] = useState<Record<string, string | null>>({})
  const [allocationMetadata, setAllocationMetadata] = useState<Record<string, any>>({})
  const [existingSubmission, setExistingSubmission] = useState<any | null>(null)
  const [windowIsOpen, setWindowIsOpen] = useState<boolean>(true)

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    async function loadBlueprint() {
      try {
        const response = await fetch('/api/registrations/blueprint')
        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? 'Failed to load courses. Please try again.')
          setPageState('closed')
          return
        }

        const rawBp = data.data ?? data
        const isOpen = rawBp.windowOpen !== undefined ? rawBp.windowOpen : rawBp.window_status !== 'CLOSED'
        setWindowIsOpen(isOpen)

        if (data.student) {
          setStudentInfo({
            full_name: data.student.full_name,
            current_semester: data.student.current_semester,
          })
        }

        setBlueprint({
          ...rawBp,
          window_status: isOpen ? 'OPEN' : 'CLOSED',
        })

        if (rawBp.existingRegistration || rawBp.existingSlots) {
          setExistingSubmission(rawBp.existingRegistration || {})
        }

        if (rawBp.existingSlots) {
          setExistingSlots(rawBp.existingSlots)
        }
        if (rawBp.allocationMetadata) {
          setAllocationMetadata(rawBp.allocationMetadata)
        }

        // Hydrate preferences
        const existingPrefs = rawBp.existingPreferences || {}
        const initialPrefs: Record<number, SlotRankedPreferences> = {}
        for (let i = 1; i <= 6; i++) {
          const list = existingPrefs[`slot_${i}`] || []
          initialPrefs[i] = {
            rank1: list.find((p: any) => p.rank === 1)?.course_id || '',
            rank2: list.find((p: any) => p.rank === 2)?.course_id || '',
            rank3: list.find((p: any) => p.rank === 3)?.course_id || '',
          }
        }
        setRankedPreferences(initialPrefs)

        // Single pathway — slots already resolved
        if (rawBp.slots && rawBp.slots.length > 0) {
          setResolvedSlots(rawBp.slots)
          setSelectedPathwayId(rawBp.selectedPathwayId || rawBp.pathway_id || null)
          setPageState('ready')
          return
        }

        // Multiple pathways — show picker
        if (rawBp.pathways && rawBp.pathways.length > 1) {
          if (rawBp.selectedPathwayId) {
            setSelectedPathwayId(rawBp.selectedPathwayId)
          }
          setPageState('pathway_picker')
          return
        }

        if (!isOpen && !rawBp.existingSlots) {
          setPageState('closed')
          return
        }

        setPageState('ready')
      } catch (err) {
        setError('Error loading registration blueprint')
        setPageState('closed')
      }
    }

    loadBlueprint()
  }, [])

  async function selectPathway(pathwayId: string) {
    setSelectedPathwayId(pathwayId)
    setPageState('loading_slots')
    setError('')

    const response = await fetch(
      `/api/registrations/pathway-slots?pathway_id=${encodeURIComponent(pathwayId)}`,
    )
    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Failed to load pathway courses.')
      setPageState('pathway_picker')
      return
    }

    setResolvedSlots(data.data.slots)
    setPageState('ready')
  }

  function handlePreferenceChange(
    slotNumber: number,
    rank: 'rank1' | 'rank2' | 'rank3',
    courseId: string,
  ) {
    setRankedPreferences((prev) => {
      const slotPrefs = { ...(prev[slotNumber] || { rank1: '', rank2: '', rank3: '' }) }
      slotPrefs[rank] = courseId

      // Auto-clear duplicates in other ranks of this slot
      if (courseId) {
        if (rank === 'rank1') {
          if (slotPrefs.rank2 === courseId) slotPrefs.rank2 = ''
          if (slotPrefs.rank3 === courseId) slotPrefs.rank3 = ''
        } else if (rank === 'rank2') {
          if (slotPrefs.rank1 === courseId) slotPrefs.rank1 = ''
          if (slotPrefs.rank3 === courseId) slotPrefs.rank3 = ''
        } else if (rank === 'rank3') {
          if (slotPrefs.rank1 === courseId) slotPrefs.rank1 = ''
          if (slotPrefs.rank2 === courseId) slotPrefs.rank2 = ''
        }
      }

      return {
        ...prev,
        [slotNumber]: slotPrefs,
      }
    })
    setError('')
  }

  function calculateCredits(): number {
    if (!resolvedSlots.length) return 0
    let total = 0
    resolvedSlots.forEach((slot) => {
      const isFixed = slot.rule === 'FIXED' || slot.rule === 'CAMPUS_FIXED'
      if (isFixed && slot.course) {
        total += slot.course.credits
      } else {
        const primaryId = rankedPreferences[slot.slot]?.rank1
        if (primaryId && slot.options) {
          const course = slot.options.find((c) => c.id === primaryId)
          if (course) total += course.credits
        }
      }
    })
    return total
  }

  async function handleSubmit() {
    if (!blueprint || !selectedPathwayId) return

    const preferencesPayload: Record<string, { course_id: string; rank: number }[]> = {}

    for (const slot of resolvedSlots) {
      const isFixed = slot.rule === 'FIXED' || slot.rule === 'CAMPUS_FIXED'
      if (!isFixed) {
        const slotKey = `slot_${slot.slot}`
        const currentPrefs = rankedPreferences[slot.slot] || { rank1: '', rank2: '', rank3: '' }

        if (!currentPrefs.rank1) {
          setError(`Please select at least a 1st choice preference for "${slot.name}"`)
          return
        }

        const choices: { course_id: string; rank: number }[] = []
        choices.push({ course_id: currentPrefs.rank1, rank: 1 })
        if (currentPrefs.rank2 && currentPrefs.rank2 !== currentPrefs.rank1) {
          choices.push({ course_id: currentPrefs.rank2, rank: 2 })
        }
        if (
          currentPrefs.rank3 &&
          currentPrefs.rank3 !== currentPrefs.rank1 &&
          currentPrefs.rank3 !== currentPrefs.rank2
        ) {
          choices.push({ course_id: currentPrefs.rank3, rank: 3 })
        }

        preferencesPayload[slotKey] = choices
      }
    }

    setPageState('submitting')
    setError('')

    const response = await fetch('/api/registrations/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        semester: Number(studentInfo?.current_semester || 1),
        pathway_id: selectedPathwayId,
        preferences: preferencesPayload,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Submission failed. Please try again.')
      setPageState('ready')
      return
    }

    setSuccessMsg(data.message || 'Course preferences successfully submitted!')
    setPageState('submitted')
    setTimeout(() => {
      router.push('/dashboard/student')
    }, 1500)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  function handleChangeTrack() {
    setResolvedSlots([])
    setPageState('pathway_picker')
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

        {/* Closed with no existing registration */}
        {pageState === 'closed' && (
          <div className={styles.closedState}>
            <div className={styles.closedIcon}>🔒</div>
            <p className={styles.closedTitle}>Registration Window is Closed</p>
            <p className={styles.closedSubtitle}>
              {error ||
                'The registration window for this semester is currently closed. Please check back when your Campus Director opens it.'}
            </p>
            {blueprint?.deadline && (
              <div className={styles.closedDeadline}>
                Last deadline was{' '}
                {new Date(blueprint.deadline).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
            <button
              className={styles.closedBackBtn}
              onClick={() => router.push('/dashboard/student')}
            >
              ← Go Back
            </button>
          </div>
        )}

        {/* Pathway Picker Hub */}
        {pageState === 'pathway_picker' && blueprint?.pathways && (
          <div className={styles.trackPickerContainer}>
            <div className={styles.trackHeader}>
              <span className={styles.trackCategoryTag}>
                <span>🎓</span> ACADEMIC PATHWAY SELECTION
              </span>
              <h2 className={styles.trackTitle}>Select Your Academic Track</h2>
              <p className={styles.trackSubtitle}>
                Your department offers {blueprint.pathways.length} specialized course tracks for Semester{' '}
                {studentInfo?.current_semester ?? ''}. Choose your track to configure your paper preferences.
              </p>
            </div>

            <div className={styles.trackGrid}>
              {blueprint.pathways.map((pw, idx) => {
                const isSelected = selectedPathwayId === pw.id
                return (
                  <div
                    key={pw.id}
                    className={`${styles.trackCard} ${isSelected ? styles.trackCardSelected : ''}`}
                    onClick={() => selectPathway(pw.id)}
                  >
                    <div>
                      <div className={styles.trackCardHeader}>
                        <span className={styles.trackNumberBadge}>TRACK {idx + 1}</span>
                        <h3 className={styles.trackCardTitle}>{pw.name}</h3>
                        <span className={styles.trackMetaTag}>
                          Sem {studentInfo?.current_semester ?? ''}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.trackActionButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        selectPathway(pw.id)
                      }}
                    >
                      {isSelected ? 'Continue with Selected Track →' : 'Select Track & Continue →'}
                    </button>
                  </div>
                )
              })}
            </div>

            {error && <div className={styles.errorBanner} style={{ marginTop: '1rem' }}>{error}</div>}
          </div>
        )}

        {/* Loading Pathway Slots */}
        {pageState === 'loading_slots' && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading track courses...</p>
          </div>
        )}

        {/* Ready / Submitting / Submitted */}
        {(pageState === 'ready' || pageState === 'submitting' || pageState === 'submitted') &&
          blueprint &&
          resolvedSlots.length > 0 && (
            <>
              {/* Window Status Banner */}
              <div
                className={`${styles.windowBanner} ${
                  windowIsOpen ? styles.open : styles.closed
                }`}
              >
                <div className={styles.windowDot} />
                {windowIsOpen
                  ? `Registration open — closes ${new Date(blueprint.deadline).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}`
                  : 'Registration window is closed'}
              </div>

              {/* Change Track button (only for multi-pathway) */}
              {blueprint.pathways &&
                blueprint.pathways.length > 1 &&
                windowIsOpen &&
                pageState === 'ready' && (
                  <button
                    type="button"
                    onClick={handleChangeTrack}
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #dde1e7',
                      borderRadius: '0.4rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#002147',
                      cursor: 'pointer',
                      marginBottom: '1rem',
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    ← Change Track
                  </button>
                )}

              {/* Credit Counter */}
              {windowIsOpen && (
                <div className={styles.creditCounter}>
                  <span className={styles.creditLabel}>Estimated Credits (Rank 1 Electives)</span>
                  <span
                    className={`${styles.creditValue} ${
                      totalCredits === 0 ? '' : isValidCredits ? styles.valid : styles.invalid
                    }`}
                  >
                    {totalCredits}
                    <span className={styles.creditRange}>
                      &nbsp;(min {blueprint.min_credits} — max {blueprint.max_credits})
                    </span>
                  </span>
                </div>
              )}

              <p className={styles.sectionTitle}>
                {windowIsOpen ? 'Select Your Ranked Preferences' : 'Course Allocation Status'}
              </p>

              <div className={styles.slotsContainer}>
                {resolvedSlots.map((slot) => {
                  const isFixed = slot.rule === 'FIXED' || slot.rule === 'CAMPUS_FIXED'
                  const slotKey = `slot_${slot.slot}`
                  const existingCourseId = existingSlots[slotKey]
                  const meta = allocationMetadata[slotKey]
                  const isAllocated = !!existingCourseId

                  // Find course metadata if allocated
                  const allocatedCourse = isFixed
                    ? slot.course
                    : slot.options?.find((c) => c.id === existingCourseId)

                  return (
                    <div
                      key={slot.slot}
                      className={`${styles.slotCard} ${styles.active}`}
                    >
                      <div className={styles.slotHeader}>
                        <span className={styles.slotLabel}>{slot.name}</span>
                        {isFixed && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              fontWeight: 600,
                            }}
                          >
                            🔒 Fixed Paper
                          </span>
                        )}
                      </div>

                      {/* Case 1: Fixed Course */}
                      {isFixed && slot.course && (
                        <div className={styles.fixedCourse}>
                          <div>
                            <p className={styles.fixedCourseTitle}>{slot.course.title}</p>
                            <p className={styles.fixedCourseCode}>{slot.course.course_code}</p>
                          </div>
                          <span className={styles.creditPill}>{slot.course.credits} cr</span>
                        </div>
                      )}

                      {/* Case 2: Elective Slot — Post Allocation (Window Closed or Allocated) */}
                      {!isFixed && (!windowIsOpen || isAllocated) && (
                        <div>
                          {isAllocated ? (
                            <div
                              style={{
                                padding: '0.85rem',
                                borderRadius: '8px',
                                background: 'rgba(34, 197, 94, 0.12)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#4ade80',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  ✓ Confirmed Allocation
                                </span>
                                <p
                                  style={{
                                    margin: '0.2rem 0 0',
                                    fontWeight: 600,
                                    color: '#f1f5f9',
                                    fontSize: '0.9rem',
                                  }}
                                >
                                  {allocatedCourse?.title ?? 'Allocated Paper'}
                                </p>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    color: '#94a3b8',
                                  }}
                                >
                                  {allocatedCourse?.course_code ?? ''} •{' '}
                                  {allocatedCourse?.department_name || 'General'}
                                </span>
                              </div>
                              {allocatedCourse?.credits && (
                                <span className={styles.creditPill}>
                                  {allocatedCourse.credits} cr
                                </span>
                              )}
                            </div>
                          ) : (
                            <div
                              style={{
                                padding: '0.85rem',
                                borderRadius: '8px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  fontWeight: 600,
                                  color: '#fbbf24',
                                  fontSize: '0.85rem',
                                }}
                              >
                                ⚠️ Not yet allocated — contact your HOD
                              </p>
                              <p
                                style={{
                                  margin: '0.25rem 0 0',
                                  fontSize: '0.75rem',
                                  color: '#cbd5e1',
                                }}
                              >
                                Your submitted preferences could not be resolved during automated rounds.
                                Please contact your department HOD for manual placement.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Case 3: Elective Slot — Window Open (Student Picking Preferences) */}
                      {!isFixed && windowIsOpen && !isAllocated && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                            Rank up to 3 preferences for this paper. The algorithm allocates round-by-round based on capacity and prerequisites.
                          </p>

                          <div>
                            <label
                              style={{
                                fontSize: '0.72rem',
                                color: '#38bdf8',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                display: 'block',
                                marginBottom: '0.25rem',
                              }}
                            >
                              1st Choice (Primary) *
                            </label>
                            <CustomSelect
                              options={slot.options ?? []}
                              value={rankedPreferences[slot.slot]?.rank1 ?? ''}
                              onChange={(val) => handlePreferenceChange(slot.slot, 'rank1', val)}
                              disabled={pageState === 'submitting'}
                              placeholder="— Select 1st Choice Preference —"
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '0.72rem',
                                color: '#94a3b8',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                display: 'block',
                                marginBottom: '0.25rem',
                              }}
                            >
                              2nd Choice (Backup Round 2)
                            </label>
                            <CustomSelect
                              options={(slot.options ?? []).filter(
                                (c) => c.id !== rankedPreferences[slot.slot]?.rank1,
                              )}
                              value={rankedPreferences[slot.slot]?.rank2 ?? ''}
                              onChange={(val) => handlePreferenceChange(slot.slot, 'rank2', val)}
                              disabled={pageState === 'submitting'}
                              placeholder="— Select 2nd Choice (Optional) —"
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '0.72rem',
                                color: '#94a3b8',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                display: 'block',
                                marginBottom: '0.25rem',
                              }}
                            >
                              3rd Choice (Backup Round 3)
                            </label>
                            <CustomSelect
                              options={(slot.options ?? []).filter(
                                (c) =>
                                  c.id !== rankedPreferences[slot.slot]?.rank1 &&
                                  c.id !== rankedPreferences[slot.slot]?.rank2,
                              )}
                              value={rankedPreferences[slot.slot]?.rank3 ?? ''}
                              onChange={(val) => handlePreferenceChange(slot.slot, 'rank3', val)}
                              disabled={pageState === 'submitting'}
                              placeholder="— Select 3rd Choice (Optional) —"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {error && <div className={styles.errorBanner}>{error}</div>}
              {successMsg && (
                <div className={styles.successModalOverlay} onClick={() => setSuccessMsg('')}>
                  <div className={styles.successModalContent} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.successModalIcon}>✓</div>
                    <p className={styles.successModalText}>{successMsg}</p>
                    <button
                      className={styles.successModalClose}
                      onClick={() => setSuccessMsg('')}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {windowIsOpen && (pageState === 'ready' || pageState === 'submitting') && (
                <button
                  className={styles.submitBtn}
                  onClick={handleSubmit}
                  disabled={pageState === 'submitting' || !isValidCredits}
                >
                  {pageState === 'submitting' ? (
                    <>
                      <span className={styles.smallSpinner} /> Submitting Preferences...
                    </>
                  ) : existingSubmission ? (
                    'Update Preferences →'
                  ) : (
                    'Submit Ranked Preferences →'
                  )}
                </button>
              )}
            </>
          )}
      </div>
    </div>
  )
}
