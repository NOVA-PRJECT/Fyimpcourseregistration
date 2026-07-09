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
}

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
  const [loggingOut, setLoggingOut] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      const response = await fetch('/api/faculty/courses')
      const data = await response.json()
      if (!response.ok) {
        router.push('/login')
        return
      }

      setTeacherName(data.teacherName)
      setCourses(data.courses)
      setLoadingTeacher(false)
    }
    loadData()
  }, [])

  async function handleFetch() {
    if (!selectedCourseId) { setError('Please select a course first'); return }

    setLoading(true)
    setError('')
    setRosterData(null)

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
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
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
            <p className={styles.topBarSubtitle}>Teacher Dashboard</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
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

            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <p className={styles.statValue}>{rosterData.total_students}</p>
                <p className={styles.statLabel}>Enrolled Students</p>
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
                  📄 Download Attendance Sheet
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

      </div>
    </div>
  )
}
