'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Papa from 'papaparse'
import styles from './hod-dashboard.module.css'

// ── Types ──
interface HodInfo {
  full_name: string
  department_name: string
}

interface Student {
  id: string
  full_name: string
  current_semester: number
  cap_application_number: string | null
}

interface Defaulter {
  id: string
  full_name: string
  roll_number: string
}

interface DefaulterData {
  total_students: number
  submitted_count: number
  defaulter_count: number
  defaulters: Defaulter[]
}

interface UploadResult {
  inserted_count: number
  error_count: number
  errors?: { row: number; issues: string[] }[]
}

type Tab = 'upload' | 'students' | 'defaulters'

export default function HodDashboard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<Tab>('defaulters')
  const [hodInfo, setHodInfo] = useState<HodInfo | null>(null)
  const [loadingHod, setLoadingHod] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // ── Upload Tab State ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  // ── Students Tab State ──
  const [studentSemester, setStudentSemester] = useState(1)
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentError, setStudentError] = useState('')
  const [studentSuccess, setStudentSuccess] = useState('')

  // Add student modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCap, setAddCap] = useState('')
  const [addDob, setAddDob] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [adding, setAdding] = useState(false)

  // Edit student modal
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [editName, setEditName] = useState('')
  const [editSemester, setEditSemester] = useState(1)
  const [updating, setUpdating] = useState(false)

  // Delete confirmation
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Defaulters Tab State ──
  const [defaulterSemester, setDefaulterSemester] = useState(1)
  const [loading, setLoading] = useState(false)
  const [defaulterData, setDefaulterData] = useState<DefaulterData | null>(null)
  const [defaulterError, setDefaulterError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadHodInfo() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: faculty } = await supabase
        .from('faculty')
        .select('full_name, departments (name)')
        .eq('id', user.id)
        .single()

      if (faculty) {
        setHodInfo({
          full_name: faculty.full_name,
          department_name: (faculty.departments as any)?.name ?? 'Unknown',
        })
      }
      setLoadingHod(false)
    }
    loadHodInfo()
  }, [])

  // ── Upload Tab Functions ──
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file only')
      return
    }
    setSelectedFile(file)
    setUploadError('')
    setUploadResult(null)
    setUploadSuccess('')
  }

  async function handleUpload() {
    if (!selectedFile) { setUploadError('Please select a CSV file first'); return }
    setUploading(true)
    setUploadError('')
    setUploadSuccess('')
    setUploadResult(null)

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data
        if (!rows || rows.length === 0) {
          setUploadError('CSV file is empty')
          setUploading(false)
          return
        }
        try {
          const response = await fetch('/api/admin/bulk-admissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rows),
          })
          const result = await response.json()
          if (!response.ok) {
            setUploadError(result.error ?? 'Upload failed')
            setUploading(false)
            return
          }
          setUploadResult(result)
          setUploadSuccess(`Upload complete — ${result.inserted_count} students added.`)
          setSelectedFile(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        } catch {
          setUploadError('Something went wrong. Please try again.')
        }
        setUploading(false)
      },
      error: () => {
        setUploadError('Failed to parse CSV.')
        setUploading(false)
      }
    })
  }

  // ── Students Tab Functions ──
  async function fetchStudents() {
    setLoadingStudents(true)
    setStudentError('')
    setStudentSuccess('')
    const response = await fetch(`/api/hod/students?semester=${studentSemester}`)
    const result = await response.json()
    if (!response.ok) {
      setStudentError(result.error ?? 'Failed to fetch students')
    } else {
      setStudents(result)
    }
    setLoadingStudents(false)
  }

  async function handleAddStudent() {
    if (!addName || !addCap || !addDob) {
      setStudentError('Name, CAP number and date of birth are required')
      return
    }
    setAdding(true)
    setStudentError('')
    const response = await fetch('/api/hod/students/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: addName,
        cap_application_number: addCap,
        date_of_birth: addDob,
        email: addEmail || undefined,
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      setStudentError(result.error ?? 'Failed to add student')
    } else {
      setStudentSuccess('Student added successfully')
      setShowAddModal(false)
      setAddName(''); setAddCap(''); setAddDob(''); setAddEmail('')
      fetchStudents()
    }
    setAdding(false)
  }

  async function handleUpdateStudent() {
    if (!editStudent) return
    setUpdating(true)
    setStudentError('')
    const response = await fetch('/api/hod/students/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: editStudent.id,
        full_name: editName,
        current_semester: editSemester,
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      setStudentError(result.error ?? 'Failed to update student')
    } else {
      setStudentSuccess('Student updated successfully')
      setEditStudent(null)
      fetchStudents()
    }
    setUpdating(false)
  }

  async function handleDeleteStudent() {
    if (!deleteStudent) return
    setDeleting(true)
    const response = await fetch('/api/hod/students/remove', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: deleteStudent.id }),
    })
    const result = await response.json()
    if (!response.ok) {
      setStudentError(result.error ?? 'Failed to delete student')
    } else {
      setStudentSuccess('Student removed successfully')
      setDeleteStudent(null)
      fetchStudents()
    }
    setDeleting(false)
  }

  // ── Defaulters Tab Functions ──
  async function handleFetch() {
    setLoading(true)
    setDefaulterError('')
    setDefaulterData(null)
    setCopied(false)
    const response = await fetch(`/api/faculty/defaulters?semester=${defaulterSemester}`)
    const result = await response.json()
    if (!response.ok) {
      setDefaulterError(result.error ?? 'Failed to fetch data.')
    } else {
      setDefaulterData(result)
    }
    setLoading(false)
  }

  function handleCopyWhatsApp() {
    if (!defaulterData || defaulterData.defaulters.length === 0) return
    const lines = [
      `📋 *FYIMP Course Registration — Defaulters*`,
      `📚 Semester: ${defaulterSemester}`,
      `🏛️ Department: ${hodInfo?.department_name}`,
      ``,
      `The following students have *not yet submitted* their course registration:`,
      ``,
      ...defaulterData.defaulters.map((s, i) => `${i + 1}. ${s.full_name}`),
      ``,
      `Total defaulters: ${defaulterData.defaulter_count} / ${defaulterData.total_students}`,
      ``,
      `Please complete your registration immediately.`,
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  async function handleLogout() {
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
            <p className={styles.topBarSubtitle}>HOD Dashboard</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
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
    className={`${styles.tabBtn} ${activeTab === 'defaulters' ? styles.tabActive : ''}`}
    onClick={() => setActiveTab('defaulters')}
  >
    📋 Defaulters
  </button>
  <button
    className={`${styles.tabBtn} ${activeTab === 'upload' ? styles.tabActive : ''}`}
    onClick={() => setActiveTab('upload')}
  >
    📂 Bulk Upload
  </button>
  <button
    className={`${styles.tabBtn} ${activeTab === 'students' ? styles.tabActive : ''}`}
    onClick={() => setActiveTab('students')}
  >
    👥 Students
  </button>
</div>

      {/* Main Content */}
      <div className={styles.mainContent}>

        {/* ══════════════════════════════════════
            TAB 1 — BULK UPLOAD
        ══════════════════════════════════════ */}
        {activeTab === 'upload' && (
          <>
            <p className={styles.sectionTitle}>Upload Semester 1 Students</p>

            {uploadError && <div className={styles.errorBanner}>{uploadError}</div>}
            {uploadSuccess && <div className={styles.successBanner}>✓ {uploadSuccess}</div>}

            <div className={styles.uploadCard}>
              <p className={styles.uploadDescription}>
                Upload your department's Semester 1 student list.
                Students will use their CAP number and date of birth to sign up.
              </p>

              <div className={styles.formatHint}>
                <p className={styles.formatHintTitle}>Required CSV Columns</p>
                <p className={styles.formatHintCode}>
                  cap_application_number, date_of_birth, full_name, email
                </p>
                <p className={styles.formatHintCode} style={{ marginTop: '0.35rem', color: '#9ba1ab' }}>
                  Example: CAP2025001, 2005-08-14, Ahmed Ali, ahmed@email.com
                </p>
              </div>

              <div className={`${styles.dropzone} ${selectedFile ? styles.hasFile : ''}`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className={styles.dropzoneInput}
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <>
                    <div className={styles.dropzoneIcon}>✅</div>
                    <p className={styles.dropzoneFileName}>{selectedFile.name}</p>
                    <p className={styles.dropzoneSubtext}>
                      {(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload
                    </p>
                  </>
                ) : (
                  <>
                    <div className={styles.dropzoneIcon}>📂</div>
                    <p className={styles.dropzoneText}>Tap to select CSV file</p>
                    <p className={styles.dropzoneSubtext}>Only .csv files accepted</p>
                  </>
                )}
              </div>

              <button
                className={styles.uploadBtn}
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
              >
                {uploading ? <><span className={styles.spinner} /> Uploading...</> : 'Upload Students →'}
              </button>
            </div>

            {uploadResult && (
              <>
                <p className={styles.sectionTitle}>Upload Results</p>
                <div className={styles.uploadCard}>
                  <div className={styles.resultsGrid}>
                    <div className={`${styles.resultStat} ${styles.success}`}>
                      <p className={styles.resultValue}>{uploadResult.inserted_count}</p>
                      <p className={styles.resultLabel}>Inserted</p>
                    </div>
                    <div className={`${styles.resultStat} ${uploadResult.error_count > 0 ? styles.danger : styles.success}`}>
                      <p className={styles.resultValue}>{uploadResult.error_count}</p>
                      <p className={styles.resultLabel}>Errors</p>
                    </div>
                  </div>
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className={styles.errorList}>
                      <p className={styles.errorListTitle}>Row Errors</p>
                      {uploadResult.errors.map((err, i) => (
                        <div key={i} className={styles.errorItem}>
                          Row {err.row}: {err.issues.join(', ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 2 — STUDENTS CRUD
        ══════════════════════════════════════ */}
        {activeTab === 'students' && (
          <>
            {studentError && <div className={styles.errorBanner}>{studentError}</div>}
            {studentSuccess && <div className={styles.successBanner}>✓ {studentSuccess}</div>}

            {/* Semester selector + Add button */}
            <div className={styles.semesterRow}>
              <span className={styles.semesterLabel}>Semester:</span>
              <select
                className={styles.semesterSelect}
                value={studentSemester}
                onChange={e => setStudentSemester(Number(e.target.value))}
              >
                {[1,2,3,4,5,6,7,8,9,10].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
              <button className={styles.fetchBtn} onClick={fetchStudents} disabled={loadingStudents}>
                {loadingStudents ? 'Loading...' : 'Load →'}
              </button>
              <button
                className={styles.addBtn}
                onClick={() => { setShowAddModal(true); setStudentError(''); setStudentSuccess('') }}
              >
                + Add
              </button>
            </div>

            {/* Students Table */}
            <div className={styles.tableWrapper}>
              {loadingStudents ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <p className={styles.loadingText}>Loading students...</p>
                </div>
              ) : students.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>👥</div>
                  <p className={styles.emptyTitle}>No students found</p>
                  <p className={styles.emptySubtitle}>
                    No students in Semester {studentSemester}. Click Load to fetch or Add to create one.
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Sem</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={student.id} className={styles.tableRow}>
                        <td>{index + 1}</td>
                        <td>{student.full_name}</td>
                        <td>{student.current_semester}</td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.approveBtn}
                              onClick={() => {
                                setEditStudent(student)
                                setEditName(student.full_name)
                                setEditSemester(student.current_semester)
                                setStudentError('')
                                setStudentSuccess('')
                              }}
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

            {/* Add Student Modal */}
            {showAddModal && (
              <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                  <h3 className={styles.modalTitle}>Add Student</h3>
                  <p className={styles.modalSubtitle}>
                    Student will be added to admissions master. They sign up using CAP + DOB.
                  </p>

                  <div className={styles.fieldGroup}>
                    <div className={styles.field}>
                      <label className={styles.label}>Full Name *</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Student full name"
                        value={addName}
                        onChange={e => setAddName(e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>CAP Number *</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. CAP2025001"
                        value={addCap}
                        onChange={e => setAddCap(e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Date of Birth *</label>
                      <input
                        type="date"
                        className={styles.input}
                        value={addDob}
                        onChange={e => setAddDob(e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Email (optional)</label>
                      <input
                        type="email"
                        className={styles.input}
                        placeholder="student@email.com"
                        value={addEmail}
                        onChange={e => setAddEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.modalActions}>
                    <button
                      className={styles.modalCancelBtn}
                      onClick={() => { setShowAddModal(false); setAddName(''); setAddCap(''); setAddDob(''); setAddEmail('') }}
                      disabled={adding}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.modalConfirmBtn}
                      onClick={handleAddStudent}
                      disabled={adding}
                    >
                      {adding ? 'Adding...' : 'Add Student →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Student Modal */}
            {editStudent && (
              <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                  <h3 className={styles.modalTitle}>Edit Student</h3>

                  <div className={styles.fieldGroup}>
                    <div className={styles.field}>
                      <label className={styles.label}>Full Name</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>CAP Number</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={editStudent.cap_application_number ?? '—'}
                        disabled
                        style={{ opacity: 0.5 }}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Current Semester</label>
                      <select
                        className={styles.input}
                        value={editSemester}
                        onChange={e => setEditSemester(Number(e.target.value))}
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
                      disabled={updating}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.modalConfirmBtn}
                      onClick={handleUpdateStudent}
                      disabled={updating}
                    >
                      {updating ? 'Saving...' : 'Save Changes →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteStudent && (
              <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                  <h3 className={styles.modalTitle}>Remove Student</h3>
                  <p className={styles.modalSubtitle}>
                    Are you sure you want to permanently remove{' '}
                    <strong>{deleteStudent.full_name}</strong>?
                    This will delete their account and all registration history.
                    This cannot be undone.
                  </p>

                  <div className={styles.modalActions}>
                    <button
                      className={styles.modalCancelBtn}
                      onClick={() => setDeleteStudent(null)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.modalDeleteBtn}
                      onClick={handleDeleteStudent}
                      disabled={deleting}
                    >
                      {deleting ? 'Removing...' : 'Yes, Remove'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 3 — DEFAULTERS
        ══════════════════════════════════════ */}
        {activeTab === 'defaulters' && (
          <>
            {defaulterError && <div className={styles.errorBanner}>{defaulterError}</div>}

            <div className={styles.semesterRow}>
              <span className={styles.semesterLabel}>Semester:</span>
              <select
                className={styles.semesterSelect}
                value={defaulterSemester}
                onChange={e => setDefaulterSemester(Number(e.target.value))}
              >
                {[1,2,3,4,5,6,7,8,9,10].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
              <button className={styles.fetchBtn} onClick={handleFetch} disabled={loading}>
                {loading ? 'Loading...' : 'Check →'}
              </button>
            </div>

            {loading && (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p className={styles.loadingText}>Fetching student data...</p>
              </div>
            )}

            {!loading && defaulterData && (
              <>
                <div className={styles.statsRow}>
                  <div className={styles.statCard}>
                    <p className={styles.statValue}>{defaulterData.total_students}</p>
                    <p className={styles.statLabel}>Total</p>
                  </div>
                  <div className={styles.statCard}>
                    <p className={`${styles.statValue} ${styles.success}`}>{defaulterData.submitted_count}</p>
                    <p className={styles.statLabel}>Submitted</p>
                  </div>
                  <div className={styles.statCard}>
                    <p className={`${styles.statValue} ${defaulterData.defaulter_count > 0 ? styles.danger : styles.success}`}>
                      {defaulterData.defaulter_count}
                    </p>
                    <p className={styles.statLabel}>Pending</p>
                  </div>
                </div>

                <div className={styles.sectionHeader}>
                  <p className={styles.sectionTitle}>
                    Pending Students ({defaulterData.defaulter_count})
                  </p>
                  {defaulterData.defaulter_count > 0 && (
                    copied
                      ? <span className={styles.copiedMsg}>✓ Copied!</span>
                      : <button className={styles.whatsappBtn} onClick={handleCopyWhatsApp}>
                          📋 Copy for WhatsApp
                        </button>
                  )}
                </div>

                <div className={styles.tableWrapper}>
                  {defaulterData.defaulter_count === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>🎉</div>
                      <p className={styles.emptyTitle}>All students submitted!</p>
                      <p className={styles.emptySubtitle}>
                        All {defaulterData.total_students} students completed registration for Semester {defaulterSemester}.
                      </p>
                    </div>
                  ) : (
                    <table className={styles.table}>
                      <thead className={styles.tableHead}>
                        <tr><th>#</th><th>Name</th></tr>
                      </thead>
                      <tbody>
                        {defaulterData.defaulters.map((student, index) => (
                          <tr key={student.id} className={styles.tableRow}>
                            <td>{index + 1}</td>
                            <td>{student.full_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
