'use client'

export const dynamic = 'force-dynamic'
import BlueprintTab from './BlueprintTab'
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

interface DeptStudent {
  id: string
  full_name: string
  roll_number: string
  current_semester: number
  submitted: boolean
}

interface DeptData {
  academic_year: string
  total_students: number
  submitted_count: number
  students: DeptStudent[]
}

interface UploadResult {
  inserted_count: number
  error_count: number
  results?: { row: number; email: string; status: string; issues?: string[] }[]
}

type Tab = 'defaulters' | 'upload' | 'students' | 'blueprint' | 'courses'

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
  const [batchPassword, setBatchPassword] = useState('')
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
  const [addRoll, setAddRoll] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addYearJoined, setAddYearJoined] = useState('')
  const [addSemester, setAddSemester] = useState(1)
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
  const [defaulterSemester, setDefaulterSemester] = useState<number | 'all'>('all')
  const [loadingDefaulters, setLoadingDefaulters] = useState(false)
  const [deptData, setDeptData] = useState<DeptData | null>(null)
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

  // Auto-load views on tab switch
  useEffect(() => {
    if (activeTab === 'defaulters' && !deptData && !loadingDefaulters) {
      handleFetch('all')
    } else if (activeTab === 'students' && students.length === 0 && !loadingStudents) {
      fetchStudents(studentSemester)
    }
  }, [activeTab])

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
    if (!batchPassword || batchPassword.length < 8) {
      setUploadError('Batch password must be at least 8 characters')
      return
    }
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
          const response = await fetch('/api/hod/bulk-students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows, batch_default_password: batchPassword }),
          })
          const result = await response.json()
          if (!response.ok) {
            setUploadError(result.error ?? 'Upload failed')
            setUploading(false)
            return
          }
          setUploadResult(result)
          setUploadSuccess(`Upload complete — ${result.inserted_count} students created.`)
          setSelectedFile(null)
          setBatchPassword('')
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
  async function fetchStudents(sem: number = studentSemester) {
    setLoadingStudents(true)
    setStudentError('')
    setStudentSuccess('')
    const response = await fetch(`/api/hod/students?semester=${sem}`)
    const result = await response.json()
    if (!response.ok) {
      setStudentError(result.error ?? 'Failed to fetch students')
    } else {
      setStudents(result)
    }
    setLoadingStudents(false)
  }

  async function handleAddStudent() {
    if (!addName || !addCap || !addRoll || !addEmail || !addPassword || !addYearJoined) {
      setStudentError('All fields are required')
      return
    }
    if (addPassword.length < 8) {
      setStudentError('Password must be at least 8 characters')
      return
    }
    setAdding(true)
    setStudentError('')
    const response = await fetch('/api/hod/students/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: addName,
        roll_number: addRoll,
        cap_application_number: addCap,
        academic_year_joined: addYearJoined,
        current_semester: addSemester,
        email: addEmail,
        password: addPassword,
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      setStudentError(result.error ?? 'Failed to add student')
    } else {
      setStudentSuccess('Student created successfully')
      setShowAddModal(false)
      setAddName(''); setAddCap(''); setAddRoll(''); setAddEmail(''); setAddPassword(''); setAddYearJoined(''); setAddSemester(1)
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
  async function handleFetch(sem: number | 'all' = defaulterSemester) {
    setLoadingDefaulters(true)
    setDefaulterError('')
    setDeptData(null)
    setCopied(false)
    const semParam = sem === 'all' ? '' : `?semester=${sem}`
    const response = await fetch(`/api/faculty/defaulters${semParam}`)
    const result = await response.json()
    if (!response.ok) {
      setDefaulterError(result.error ?? 'Failed to fetch data.')
    } else {
      setDeptData(result)
    }
    setLoadingDefaulters(false)
  }

  function handleCopyWhatsApp() {
    if (!deptData || deptData.students.length === 0) return
    const notSubmitted = deptData.students.filter(s => !s.submitted)
    if (notSubmitted.length === 0) return
    const lines = [
      `📋 *FYIMP Course Registration — Defaulters*`,
      `🏛️ Department: ${hodInfo?.department_name}`,
      ``,
      `The following students have *not yet submitted* their course registration:`,
      ``,
      ...notSubmitted.map((s, i) => `${i + 1}. ${s.full_name} (Sem ${s.current_semester})`),
      ``,
      `Total defaulters: ${notSubmitted.length} / ${deptData.total_students}`,
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

  const notSubmittedStudents = deptData?.students.filter(s => !s.submitted) ?? []

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
        <button className={`${styles.tabBtn} ${activeTab === 'defaulters' ? styles.tabActive : ''}`} onClick={() => setActiveTab('defaulters')}>
          📋 Defaulters
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'upload' ? styles.tabActive : ''}`} onClick={() => setActiveTab('upload')}>
          📂 Bulk Upload
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'students' ? styles.tabActive : ''}`} onClick={() => setActiveTab('students')}>
          👥 Students
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'blueprint' ? styles.tabActive : ''}`} onClick={() => setActiveTab('blueprint')}>
          📐 Blueprint
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'courses' ? styles.tabActive : ''}`} onClick={() => setActiveTab('courses')}>
          📚 Courses
        </button>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>

        {/* ══ BULK UPLOAD TAB ══ */}
        {activeTab === 'upload' && (
          <>
            <p className={styles.sectionTitle}>Bulk Upload Students</p>

            {uploadError && <div className={styles.errorBanner}>{uploadError}</div>}
            {uploadSuccess && <div className={styles.successBanner}>✓ {uploadSuccess}</div>}

            <div className={styles.uploadCard}>
              <p className={styles.uploadDescription}>
                Upload a CSV to create student accounts directly. Each student will receive a temporary password you set below and must change it on first login.
              </p>

              <div className={styles.formatHint}>
                <p className={styles.formatHintTitle}>Required CSV Columns</p>
                <p className={styles.formatHintCode}>
                  full_name, roll_number, cap_application_number, academic_year_joined, current_semester, email
                </p>
                <p className={styles.formatHintCode} style={{ marginTop: '0.35rem', color: '#9ba1ab' }}>
                  Example: Ahmed Ali, 2025-CS-001, CAP2025001, 2025-26, 1, ahmed@email.com
                </p>
              </div>

              {/* Batch Password Field */}
              <div className={styles.field} style={{ marginBottom: '0.85rem' }}>
                <label className={styles.label}>Batch Default Password *</label>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="Min. 8 characters — all students in this upload get this"
                  value={batchPassword}
                  onChange={e => setBatchPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <p style={{ fontSize: '0.7rem', color: '#9ba1ab', margin: '0.25rem 0 0' }}>
                  Students must change this password on first login.
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
                    <p className={styles.dropzoneSubtext}>{(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload</p>
                  </>
                ) : (
                  <>
                    <div className={styles.dropzoneIcon}>📂</div>
                    <p className={styles.dropzoneText}>Tap to select CSV file</p>
                    <p className={styles.dropzoneSubtext}>Only .csv files accepted</p>
                  </>
                )}
              </div>

              <button className={styles.uploadBtn} onClick={handleUpload} disabled={uploading || !selectedFile || !batchPassword}>
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
                      <p className={styles.resultLabel}>Created</p>
                    </div>
                    <div className={`${styles.resultStat} ${uploadResult.error_count > 0 ? styles.danger : styles.success}`}>
                      <p className={styles.resultValue}>{uploadResult.error_count}</p>
                      <p className={styles.resultLabel}>Errors</p>
                    </div>
                  </div>
                  {uploadResult.results && uploadResult.results.filter(r => r.status === 'error').length > 0 && (
                    <div className={styles.errorList}>
                      <p className={styles.errorListTitle}>Row Errors</p>
                      {uploadResult.results.filter(r => r.status === 'error').map((err, i) => (
                        <div key={i} className={styles.errorItem}>
                          Row {err.row} ({err.email}): {err.issues?.join(', ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ══ STUDENTS CRUD TAB ══ */}
        {activeTab === 'students' && (
          <>
            {studentError && <div className={styles.errorBanner}>{studentError}</div>}
            {studentSuccess && <div className={styles.successBanner}>✓ {studentSuccess}</div>}

            <div className={styles.semesterRow}>
              <span className={styles.semesterLabel}>Semester:</span>
              <select className={styles.semesterSelect} value={studentSemester} onChange={e => {
                const nextSem = Number(e.target.value)
                setStudentSemester(nextSem)
                fetchStudents(nextSem)
              }}>
                {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
              <button className={styles.addBtn} onClick={() => { setShowAddModal(true); setStudentError(''); setStudentSuccess('') }}>
                + Add
              </button>
            </div>

            <div className={styles.tableWrapper}>
              {loadingStudents ? (
                <div className={styles.loadingState}><div className={styles.spinner} /><p className={styles.loadingText}>Loading students...</p></div>
              ) : students.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>👥</div>
                  <p className={styles.emptyTitle}>No students found</p>
                  <p className={styles.emptySubtitle}>No students in Semester {studentSemester}. Click Load to fetch or Add to create one.</p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}><tr><th>#</th><th>Name</th><th>Sem</th><th>Actions</th></tr></thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={student.id} className={styles.tableRow}>
                        <td>{index + 1}</td>
                        <td>{student.full_name}</td>
                        <td>{student.current_semester}</td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button className={styles.approveBtn} onClick={() => { setEditStudent(student); setEditName(student.full_name); setEditSemester(student.current_semester); setStudentError(''); setStudentSuccess('') }}>✏️</button>
                            <button className={styles.rejectBtn} onClick={() => { setDeleteStudent(student); setStudentError(''); setStudentSuccess('') }}>🗑️</button>
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
                  <p className={styles.modalSubtitle}>Creates a Supabase Auth account + student record. Student must change password on first login.</p>
                  <div className={styles.fieldGroup}>
                    {[
                      { label: 'Full Name *', value: addName, set: setAddName, type: 'text', placeholder: 'Student full name' },
                      { label: 'Roll Number *', value: addRoll, set: setAddRoll, type: 'text', placeholder: 'e.g. 2025-CS-001' },
                      { label: 'CAP Number *', value: addCap, set: setAddCap, type: 'text', placeholder: 'e.g. CAP2025001' },
                      { label: 'Academic Year Joined *', value: addYearJoined, set: setAddYearJoined, type: 'text', placeholder: 'e.g. 2025-26' },
                      { label: 'Email *', value: addEmail, set: setAddEmail, type: 'email', placeholder: 'student@email.com' },
                      { label: 'Password *', value: addPassword, set: setAddPassword, type: 'password', placeholder: 'Min. 8 characters' },
                    ].map(({ label, value, set, type, placeholder }) => (
                      <div key={label} className={styles.field}>
                        <label className={styles.label}>{label}</label>
                        <input type={type} className={styles.input} placeholder={placeholder} value={value} onChange={e => set(e.target.value)} />
                      </div>
                    ))}
                    <div className={styles.field}>
                      <label className={styles.label}>Current Semester *</label>
                      <select className={styles.input} value={addSemester} onChange={e => setAddSemester(Number(e.target.value))}>
                        {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={styles.modalActions}>
                    <button className={styles.modalCancelBtn} onClick={() => { setShowAddModal(false); setAddName(''); setAddCap(''); setAddRoll(''); setAddEmail(''); setAddPassword(''); setAddYearJoined(''); setAddSemester(1) }} disabled={adding}>Cancel</button>
                    <button className={styles.modalConfirmBtn} onClick={handleAddStudent} disabled={adding}>{adding ? 'Creating...' : 'Create Student →'}</button>
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
                      <input type="text" className={styles.input} value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>CAP Number</label>
                      <input type="text" className={styles.input} value={editStudent.cap_application_number ?? '—'} disabled style={{ opacity: 0.5 }} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Current Semester</label>
                      <select className={styles.input} value={editSemester} onChange={e => setEditSemester(Number(e.target.value))}>
                        {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={styles.modalActions}>
                    <button className={styles.modalCancelBtn} onClick={() => setEditStudent(null)} disabled={updating}>Cancel</button>
                    <button className={styles.modalConfirmBtn} onClick={handleUpdateStudent} disabled={updating}>{updating ? 'Saving...' : 'Save Changes →'}</button>
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
                    Are you sure you want to permanently remove <strong>{deleteStudent.full_name}</strong>?
                    This will delete their account, all registration history, and attendance records. This cannot be undone.
                  </p>
                  <div className={styles.modalActions}>
                    <button className={styles.modalCancelBtn} onClick={() => setDeleteStudent(null)} disabled={deleting}>Cancel</button>
                    <button className={styles.modalDeleteBtn} onClick={handleDeleteStudent} disabled={deleting}>{deleting ? 'Removing...' : 'Yes, Remove'}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'blueprint' && <BlueprintTab view="blueprint" />}
        {activeTab === 'courses' && <BlueprintTab view="courses" />}

        {/* ══ DEFAULTERS TAB ══ */}
        {activeTab === 'defaulters' && (
          <>
            {defaulterError && <div className={styles.errorBanner}>{defaulterError}</div>}

            {/* Optional semester filter + fetch */}
            <div className={styles.semesterRow}>
              <span className={styles.semesterLabel}>Filter:</span>
              <select
                className={styles.semesterSelect}
                value={defaulterSemester}
                onChange={e => {
                  const nextVal = e.target.value === 'all' ? 'all' : Number(e.target.value)
                  setDefaulterSemester(nextVal)
                  handleFetch(nextVal)
                }}
              >
                <option value="all">All Semesters</option>
                {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            {loadingDefaulters && (
              <div className={styles.loadingState}><div className={styles.spinner} /><p className={styles.loadingText}>Fetching student data...</p></div>
            )}

            {!loadingDefaulters && deptData && (
              <>
                <div className={styles.statsRow}>
                  <div className={styles.statCard}>
                    <p className={styles.statValue}>{deptData.total_students}</p>
                    <p className={styles.statLabel}>Total</p>
                  </div>
                  <div className={styles.statCard}>
                    <p className={`${styles.statValue} ${styles.success}`}>{deptData.submitted_count}</p>
                    <p className={styles.statLabel}>Submitted</p>
                  </div>
                  <div className={styles.statCard}>
                    <p className={`${styles.statValue} ${notSubmittedStudents.length > 0 ? styles.danger : styles.success}`}>{notSubmittedStudents.length}</p>
                    <p className={styles.statLabel}>Pending</p>
                  </div>
                </div>

                <div className={styles.sectionHeader}>
                  <p className={styles.sectionTitle}>
                    All Students ({deptData.total_students})
                    {defaulterSemester !== 'all' && ` — Semester ${defaulterSemester}`}
                  </p>
                  {notSubmittedStudents.length > 0 && (
                    copied
                      ? <span className={styles.copiedMsg}>✓ Copied!</span>
                      : <button className={styles.whatsappBtn} onClick={handleCopyWhatsApp}>📋 Copy Pending for WhatsApp</button>
                  )}
                </div>

                <div className={styles.tableWrapper}>
                  {deptData.total_students === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>👥</div>
                      <p className={styles.emptyTitle}>No students found</p>
                      <p className={styles.emptySubtitle}>No students in your department{defaulterSemester !== 'all' ? ` for Semester ${defaulterSemester}` : ''}.</p>
                    </div>
                  ) : (
                    <table className={styles.table}>
                      <thead className={styles.tableHead}>
                        <tr><th>#</th><th>Name</th><th>Roll No</th><th>Sem</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {deptData.students.map((student, index) => (
                          <tr key={student.id} className={styles.tableRow}>
                            <td>{index + 1}</td>
                            <td>{student.full_name}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{student.roll_number}</td>
                            <td>Sem {student.current_semester}</td>
                            <td>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '2rem',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: student.submitted ? '#dcfce7' : '#fee2e2',
                                color: student.submitted ? '#16a34a' : '#dc2626',
                              }}>
                                {student.submitted ? '✓ Submitted' : '⏳ Pending'}
                              </span>
                            </td>
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
