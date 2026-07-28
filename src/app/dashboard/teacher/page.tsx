'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from './teacher-dashboard.module.css'
import { useBfcacheGuard } from '@/core/hooks/useBfcacheGuard'

interface Course {
  id: string
  course_code: string
  title: string
}

interface Student {
  id: string
  full_name: string
  department: string
  department_code: string
}

interface RosterData {
  course: { id: string; title: string; course_code: string }
  total_students: number
  department_breakdown: Record<string, number>
  students: Student[]
}

interface DeptOption {
  key: string
  name: string
  code: string
  count: number
}

export default function TeacherDashboard() {
  useBfcacheGuard()
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

  // PDF Export Modal State
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfDeptMode, setPdfDeptMode] = useState<'all' | 'custom'>('all')
  const [selectedPdfDepts, setSelectedPdfDepts] = useState<string[]>([])
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Table Department Filter State
  const [tableDeptFilter, setTableDeptFilter] = useState('all')

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

  // Derive unique departments from roster data
  const deptOptions: DeptOption[] = useMemo(() => {
    if (!rosterData || !rosterData.students) return []
    const map = new Map<string, DeptOption>()
    for (const s of rosterData.students) {
      const key = s.department || s.department_code || 'Unknown'
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: s.department || s.department_code || 'Unknown',
          code: s.department_code || s.department || '',
          count: 0,
        })
      }
      map.get(key)!.count++
    }
    return Array.from(map.values())
  }, [rosterData])

  // Compute filtered students list for PDF export
  const pdfStudents = useMemo(() => {
    if (!rosterData) return []
    if (pdfDeptMode === 'all') return rosterData.students
    return rosterData.students.filter(s => {
      const key = s.department || s.department_code || 'Unknown'
      return (
        selectedPdfDepts.includes(key) ||
        selectedPdfDepts.includes(s.department) ||
        selectedPdfDepts.includes(s.department_code)
      )
    })
  }, [rosterData, pdfDeptMode, selectedPdfDepts])

  // Compute displayed students for table view on screen
  const displayedStudents = useMemo(() => {
    if (!rosterData) return []
    if (tableDeptFilter === 'all') return rosterData.students
    return rosterData.students.filter(s => {
      const key = s.department || s.department_code || 'Unknown'
      return (
        key === tableDeptFilter ||
        s.department === tableDeptFilter ||
        s.department_code === tableDeptFilter
      )
    })
  }, [rosterData, tableDeptFilter])

  async function handleFetch() {
    if (!selectedCourseId) { setError('Please select a course first'); return }

    setLoading(true)
    setError('')
    setRosterData(null)
    setTableDeptFilter('all')

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

  function handleOpenPdfModal() {
    if (!rosterData || rosterData.students.length === 0) return
    setPdfDeptMode('all')
    setSelectedPdfDepts(deptOptions.map(d => d.key))
    setShowPdfModal(true)
  }

  async function handleGeneratePDF() {
    if (!rosterData || pdfStudents.length === 0) return
    setGeneratingPdf(true)
    try {
      const { generateAttendanceSheet } = await import('@/core/utils/exportPdf')
      await generateAttendanceSheet({
        courseTitle: rosterData.course.title,
        courseCode: rosterData.course.course_code,
        students: pdfStudents.map(s => ({
          full_name: s.full_name,
          department_name: s.department,
          department_code: s.department_code,
        })),
      })
      setShowPdfModal(false)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      setError('Failed to generate PDF. Please try again.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
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
              <div className={styles.sectionHeaderLeft}>
                <p className={styles.sectionTitle}>
                  Class Roster ({tableDeptFilter === 'all' ? rosterData.total_students : displayedStudents.length})
                </p>
                {deptOptions.length > 1 && (
                  <select
                    className={styles.tableFilterSelect}
                    value={tableDeptFilter}
                    onChange={e => setTableDeptFilter(e.target.value)}
                    title="Filter table display by department"
                  >
                    <option value="all">All Departments ({rosterData.total_students})</option>
                    {deptOptions.map(d => (
                      <option key={d.key} value={d.key}>
                        {d.name} ({d.count})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {rosterData.total_students > 0 && (
                <button className={styles.downloadBtn} onClick={handleOpenPdfModal}>
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
              ) : displayedStudents.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🔍</div>
                  <p className={styles.emptyTitle}>No matching students</p>
                  <p className={styles.emptySubtitle}>No students enrolled from the selected department.</p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr><th>#</th><th>Name</th><th>Department</th></tr>
                  </thead>
                  <tbody>
                    {displayedStudents.map((student, index) => (
                      <tr key={student.id} className={styles.tableRow}>
                        <td>{index + 1}</td>
                        <td>{student.full_name}</td>
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

      {/* PDF Export Modal */}
      {showPdfModal && rosterData && (
        <div className={styles.modalOverlay} onClick={() => setShowPdfModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>📄 Export Attendance Sheet (PDF)</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowPdfModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className={styles.modalSubtitle}>
              Select department(s) to include in the generated attendance sheet for <strong>{rosterData.course.title}</strong> ({rosterData.course.course_code}).
            </p>

            {/* Selection Mode Radios */}
            <div className={styles.pdfOptionBlock}>
              <label className={`${styles.radioOption} ${pdfDeptMode === 'all' ? styles.radioOptionActive : ''}`}>
                <input
                  type="radio"
                  name="pdfDeptMode"
                  checked={pdfDeptMode === 'all'}
                  onChange={() => setPdfDeptMode('all')}
                  className={styles.radioInput}
                />
                <div className={styles.radioOptionContent}>
                  <span className={styles.radioOptionTitle}>🌐 All Departments</span>
                  <span className={styles.radioOptionDesc}>Includes all {rosterData.total_students} enrolled students</span>
                </div>
              </label>

              <label className={`${styles.radioOption} ${pdfDeptMode === 'custom' ? styles.radioOptionActive : ''}`}>
                <input
                  type="radio"
                  name="pdfDeptMode"
                  checked={pdfDeptMode === 'custom'}
                  onChange={() => {
                    setPdfDeptMode('custom')
                    if (selectedPdfDepts.length === 0) {
                      setSelectedPdfDepts(deptOptions.map(d => d.key))
                    }
                  }}
                  className={styles.radioInput}
                />
                <div className={styles.radioOptionContent}>
                  <span className={styles.radioOptionTitle}>🏷️ Select Specific Departments</span>
                  <span className={styles.radioOptionDesc}>Choose which department students to include</span>
                </div>
              </label>
            </div>

            {/* Custom Department Selection Checklist */}
            {pdfDeptMode === 'custom' && (
              <div className={styles.customDeptContainer}>
                <div className={styles.deptQuickHeader}>
                  <span className={styles.deptQuickTitle}>Select Departments ({selectedPdfDepts.length}/{deptOptions.length})</span>
                  <div className={styles.deptQuickActions}>
                    <button
                      type="button"
                      className={styles.quickActionBtn}
                      onClick={() => setSelectedPdfDepts(deptOptions.map(d => d.key))}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className={styles.quickActionBtn}
                      onClick={() => setSelectedPdfDepts([])}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className={styles.deptChecklist}>
                  {deptOptions.map(dept => {
                    const isChecked = selectedPdfDepts.includes(dept.key)
                    return (
                      <label
                        key={dept.key}
                        className={`${styles.deptCheckItem} ${isChecked ? styles.deptCheckItemActive : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedPdfDepts(prev => [...prev, dept.key])
                            } else {
                              setSelectedPdfDepts(prev => prev.filter(k => k !== dept.key))
                            }
                          }}
                          className={styles.checkboxInput}
                        />
                        <div className={styles.deptCheckText}>
                          <span className={styles.deptCheckName}>{dept.name}</span>
                          {dept.code && dept.code !== dept.name && (
                            <span className={styles.deptCheckCodeBadge}>{dept.code}</span>
                          )}
                        </div>
                        <span className={styles.deptCheckCount}>
                          {dept.count} {dept.count === 1 ? 'student' : 'students'}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Warning when no department is checked */}
            {pdfDeptMode === 'custom' && selectedPdfDepts.length === 0 && (
              <div className={styles.pdfWarningBanner}>
                ⚠️ Please select at least one department to export.
              </div>
            )}

            {/* Live Summary */}
            <div className={styles.pdfSummaryBox}>
              <span>Students included in PDF:</span>
              <strong className={styles.pdfSummaryCount}>
                {pdfStudents.length} of {rosterData.total_students}
              </strong>
            </div>

            {/* Modal Actions */}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setShowPdfModal(false)}
                disabled={generatingPdf}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                onClick={handleGeneratePDF}
                disabled={generatingPdf || (pdfDeptMode === 'custom' && selectedPdfDepts.length === 0)}
              >
                {generatingPdf ? 'Generating PDF...' : `Download PDF (${pdfStudents.length})`}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

