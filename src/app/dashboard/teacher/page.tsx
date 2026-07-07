'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import styles from './teacher-dashboard.module.css'

interface Course {
  id: string
  course_code: string
  title: string
}

interface Student {
  id: string
  full_name: string
  roll_number: string
  department: string
  department_code: string
}

interface RosterData {
  course: { id: string; title: string; course_code: string }
  total_students: number
  department_breakdown: Record<string, number>
  students: Student[]
  attendance?: Record<string, Record<string, string>>
  month?: number
  year?: number
}

type TabMode = 'roster' | 'attendance'

export default function TeacherDashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [loadingTeacher, setLoadingTeacher] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [loading, setLoading] = useState(false)
  const [rosterData, setRosterData] = useState<RosterData | null>(null)
  const [error, setError] = useState('')
  const [tabMode, setTabMode] = useState<TabMode>('roster')

  // Attendance state
  const [attMonth, setAttMonth] = useState(() => new Date().getMonth() + 1)
  const [attYear, setAttYear] = useState(() => new Date().getFullYear())
  const [attData, setAttData] = useState<Record<string, Record<string, string>>>({})
  const [loadingAtt, setLoadingAtt] = useState(false)
  const [savingAtt, setSavingAtt] = useState(false)
  const [attSuccess, setAttSuccess] = useState('')
  const [attError, setAttError] = useState('')
  // pendingAttendance: { [date]: { [student_id]: status } }
  const [pendingAttendance, setPendingAttendance] = useState<Record<string, Record<string, string>>>({})

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: faculty } = await supabase
        .from('faculty')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (faculty) setTeacherName(faculty.full_name)

      const { data: courseList } = await supabase
        .from('courses')
        .select('id, course_code, title')
        .order('title')

      if (courseList) setCourses(courseList)
      setLoadingTeacher(false)
    }
    loadData()
  }, [])

  async function handleFetch() {
    if (!selectedCourseId) { setError('Please select a course first'); return }

    setLoading(true)
    setError('')
    setRosterData(null)
    setPendingAttendance({})
    setAttData({})
    setTabMode('roster')

    const response = await fetch(`/api/faculty/attendance?course_id=${selectedCourseId}`)
    const result = await response.json()

    if (!response.ok) {
      setError(result.error ?? 'Failed to fetch roster. Please try again.')
      setLoading(false)
      return
    }

    setRosterData(result)
    setLoading(false)
  }

  async function handleLoadAttendance() {
    if (!selectedCourseId) return
    setLoadingAtt(true)
    setAttError('')
    setAttSuccess('')
    setPendingAttendance({})

    const response = await fetch(
      `/api/faculty/attendance?course_id=${selectedCourseId}&month=${attMonth}&year=${attYear}`
    )
    const result = await response.json()

    if (!response.ok) {
      setAttError(result.error ?? 'Failed to load attendance')
      setLoadingAtt(false)
      return
    }

    setRosterData(result)
    setAttData(result.attendance ?? {})
    setLoadingAtt(false)
  }

  function getDaysInMonth(month: number, year: number): number {
    return new Date(year, month, 0).getDate()
  }

  function getDateStr(day: number): string {
    return `${attYear}-${String(attMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function getCellStatus(studentId: string, day: number): string {
    const dateStr = getDateStr(day)
    return pendingAttendance[dateStr]?.[studentId]
      ?? attData[studentId]?.[dateStr]
      ?? ''
  }

  function toggleCell(studentId: string, day: number) {
    const dateStr = getDateStr(day)
    const current = getCellStatus(studentId, day)
    const next = current === 'present' ? 'absent' : 'present'

    setPendingAttendance(prev => ({
      ...prev,
      [dateStr]: { ...(prev[dateStr] ?? {}), [studentId]: next },
    }))
  }

  async function handleSaveAttendance() {
    setSavingAtt(true)
    setAttError('')
    setAttSuccess('')

    const allRequests: Promise<Response>[] = []

    for (const [date, studentMap] of Object.entries(pendingAttendance)) {
      const records = Object.entries(studentMap).map(([student_id, status]) => ({
        student_id,
        status: status as 'present' | 'absent',
      }))

      if (records.length === 0) continue

      allRequests.push(
        fetch('/api/faculty/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ course_id: selectedCourseId, date, records }),
        })
      )
    }

    if (allRequests.length === 0) {
      setAttError('No changes to save')
      setSavingAtt(false)
      return
    }

    const responses = await Promise.all(allRequests)
    const hasError = responses.some(r => !r.ok)

    if (hasError) {
      setAttError('Some attendance records failed to save. Please try again.')
    } else {
      setAttSuccess('Attendance saved successfully!')
      // Merge pending into attData
      setAttData(prev => {
        const merged = { ...prev }
        for (const [date, studentMap] of Object.entries(pendingAttendance)) {
          for (const [studentId, status] of Object.entries(studentMap)) {
            if (!merged[studentId]) merged[studentId] = {}
            merged[studentId][date] = status
          }
        }
        return merged
      })
      setPendingAttendance({})
    }

    setSavingAtt(false)
  }

  async function handleDownloadPDF() {
    if (!rosterData || rosterData.students.length === 0) return
    const { generateAttendanceSheet } = await import('@/core/utils/exportPdf')
    await generateAttendanceSheet({
      courseTitle: rosterData.course.title,
      courseCode: rosterData.course.course_code,
      students: rosterData.students.map(s => ({
        full_name: s.full_name,
        roll_number: s.roll_number,
        department_name: s.department,
      })),
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const daysInMonth = getDaysInMonth(attMonth, attYear)
  const pendingCount = Object.values(pendingAttendance).reduce(
    (sum, day) => sum + Object.keys(day).length, 0
  )

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
            <p className={styles.topBarSubtitle}>Teacher Dashboard</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>

      {/* Teacher Info Card */}
      <div className={styles.infoCard}>
        {loadingTeacher ? (
          <div style={{ height: '2.5rem' }} />
        ) : (
          <>
            <p className={styles.teacherName}>{teacherName || 'Teaching Staff'}</p>
            <div className={styles.teacherDetails}>
              <span className={`${styles.detailBadge} ${styles.roleBadge}`}>Teaching Staff</span>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Course Search */}
        <p className={styles.searchLabel}>Select a Course</p>
        <div className={styles.searchRow}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search course name or code..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setSelectedCourseId('')
                setRosterData(null)
                setError('')
              }}
              autoComplete="off"
            />

            {searchQuery.length > 1 && !selectedCourseId && (
              <div className={styles.searchResults}>
                {courses
                  .filter(c =>
                    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.course_code.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .slice(0, 8)
                  .map(course => (
                    <button
                      key={course.id}
                      className={styles.searchResultItem}
                      onClick={() => {
                        setSelectedCourseId(course.id)
                        setSearchQuery(`${course.title} — ${course.course_code}`)
                      }}
                    >
                      <span className={styles.searchResultTitle}>{course.title}</span>
                      <span className={styles.searchResultCode}>{course.course_code}</span>
                    </button>
                  ))
                }
                {courses.filter(c =>
                  c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.course_code.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 && (
                  <div className={styles.searchNoResult}>No courses found</div>
                )}
              </div>
            )}
          </div>
          <button
            className={styles.fetchBtn}
            onClick={handleFetch}
            disabled={loading || !selectedCourseId}
          >
            {loading ? 'Loading...' : 'Get Roster →'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Fetching class roster...</p>
          </div>
        )}

        {/* Results */}
        {!loading && rosterData && (
          <>
            {/* Course Info Banner */}
            <div className={styles.courseInfoBanner}>
              <div>
                <p className={styles.courseInfoName}>{rosterData.course.title}</p>
                <p className={styles.courseInfoCode}>{rosterData.course.course_code}</p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className={styles.attTabRow}>
              <button
                className={`${styles.attTab} ${tabMode === 'roster' ? styles.attTabActive : ''}`}
                onClick={() => setTabMode('roster')}
              >
                👥 Class Roster
              </button>
              <button
                className={`${styles.attTab} ${tabMode === 'attendance' ? styles.attTabActive : ''}`}
                onClick={() => { setTabMode('attendance'); handleLoadAttendance() }}
              >
                ✅ Mark Attendance
              </button>
            </div>

            {/* ── ROSTER TAB ── */}
            {tabMode === 'roster' && (
              <>
                <div className={styles.statsRow}>
                  <div className={styles.statCard}>
                    <p className={styles.statValue}>{rosterData.total_students}</p>
                    <p className={styles.statLabel}>Total Students</p>
                  </div>
                  <div className={styles.statCard}>
                    <p className={styles.statValue}>{Object.keys(rosterData.department_breakdown).length}</p>
                    <p className={styles.statLabel}>Departments</p>
                  </div>
                </div>

                {Object.keys(rosterData.department_breakdown).length > 0 && (
                  <div className={styles.breakdownCard}>
                    <p className={styles.breakdownTitle}>Department Breakdown</p>
                    {Object.entries(rosterData.department_breakdown).map(([dept, count]) => (
                      <div key={dept} className={styles.breakdownRow}>
                        <span className={styles.breakdownDept}>{dept}</span>
                        <span className={styles.breakdownCount}>{count} students</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.sectionHeader}>
                  <p className={styles.sectionTitle}>Class Roster ({rosterData.total_students})</p>
                  {rosterData.total_students > 0 && (
                    <button className={styles.downloadBtn} onClick={handleDownloadPDF}>
                      📄 Download PDF
                    </button>
                  )}
                </div>

                <div className={styles.tableWrapper}>
                  {rosterData.total_students === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>📭</div>
                      <p className={styles.emptyTitle}>No students enrolled</p>
                      <p className={styles.emptySubtitle}>No students have selected this course yet.</p>
                    </div>
                  ) : (
                    <table className={styles.table}>
                      <thead className={styles.tableHead}>
                        <tr><th>#</th><th>Name</th><th>Roll No</th><th>Department</th></tr>
                      </thead>
                      <tbody>
                        {rosterData.students.map((student, index) => (
                          <tr key={student.id} className={styles.tableRow}>
                            <td>{index + 1}</td>
                            <td>{student.full_name}</td>
                            <td className={styles.rollNumber}>{student.roll_number}</td>
                            <td><span className={styles.deptBadge}>{student.department_code || student.department}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* ── ATTENDANCE TAB ── */}
            {tabMode === 'attendance' && (
              <>
                {/* Month/Year selector */}
                <div className={styles.attControls}>
                  <select
                    className={styles.attSelect}
                    value={attMonth}
                    onChange={e => setAttMonth(Number(e.target.value))}
                  >
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    className={styles.attSelect}
                    value={attYear}
                    onChange={e => setAttYear(Number(e.target.value))}
                  >
                    {[attYear - 1, attYear, attYear + 1].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button
                    className={styles.fetchBtn}
                    onClick={handleLoadAttendance}
                    disabled={loadingAtt}
                  >
                    {loadingAtt ? 'Loading...' : 'Load →'}
                  </button>
                  <button
                    className={styles.downloadBtn}
                    onClick={handleDownloadPDF}
                    disabled={rosterData.total_students === 0}
                  >
                    📄 PDF
                  </button>
                </div>

                {attError && <div className={styles.errorBanner}>{attError}</div>}
                {attSuccess && <div className={styles.successBanner}>✓ {attSuccess}</div>}

                {loadingAtt ? (
                  <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    <p className={styles.loadingText}>Loading attendance...</p>
                  </div>
                ) : rosterData.total_students === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📭</div>
                    <p className={styles.emptyTitle}>No students enrolled</p>
                  </div>
                ) : (
                  <>
                    <p className={styles.attHint}>
                      Tap a cell to toggle. 🟢 Present · 🔴 Absent · ⬜ Not marked
                    </p>

                    <div className={styles.attGridWrapper}>
                      <table className={styles.attGrid}>
                        <thead>
                          <tr>
                            <th className={styles.attNameHeader}>Student</th>
                            {Array.from({ length: daysInMonth }, (_, i) => (
                              <th key={i + 1} className={styles.attDayHeader}>{i + 1}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rosterData.students.map(student => (
                            <tr key={student.id}>
                              <td className={styles.attStudentName}>
                                <span>{student.full_name}</span>
                                <span className={styles.attRoll}>{student.roll_number}</span>
                              </td>
                              {Array.from({ length: daysInMonth }, (_, dayIdx) => {
                                const day = dayIdx + 1
                                const status = getCellStatus(student.id, day)
                                const isPending = !!pendingAttendance[getDateStr(day)]?.[student.id]
                                return (
                                  <td
                                    key={day}
                                    className={`${styles.attCell} ${
                                      status === 'present' ? styles.attPresent :
                                      status === 'absent' ? styles.attAbsent : ''
                                    } ${isPending ? styles.attPending : ''}`}
                                    onClick={() => toggleCell(student.id, day)}
                                    title={`${student.full_name} — Day ${day}`}
                                  >
                                    {status === 'present' ? '●' : status === 'absent' ? '✕' : ''}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={styles.attSaveRow}>
                      {pendingCount > 0 && (
                        <p className={styles.attPendingHint}>{pendingCount} unsaved change{pendingCount !== 1 ? 's' : ''}</p>
                      )}
                      <button
                        className={styles.attSaveBtn}
                        onClick={handleSaveAttendance}
                        disabled={savingAtt || pendingCount === 0}
                      >
                        {savingAtt ? 'Saving...' : `Save Attendance${pendingCount > 0 ? ` (${pendingCount})` : ''} →`}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
