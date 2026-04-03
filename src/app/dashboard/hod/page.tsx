'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Papa from 'papaparse'
import styles from './hod-dashboard.module.css'

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

interface HodInfo {
  full_name: string
  department_name: string
}

export default function HodDashboard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [hodInfo, setHodInfo] = useState<HodInfo | null>(null)
  const [loadingHod, setLoadingHod] = useState(true)

  // CSV Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  // Defaulters state
  const [semester, setSemester] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DefaulterData | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

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
    loadData()
  }, [])

  // Handle file selection
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

  // Upload CSV
  async function handleUpload() {
    if (!selectedFile) {
      setUploadError('Please select a CSV file first')
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
          setUploadError('CSV file is empty or has no valid rows')
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
            setUploadError(result.error ?? 'Upload failed. Please try again.')
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
        setUploadError('Failed to parse CSV. Please check the format.')
        setUploading(false)
      }
    })
  }

  // Fetch defaulters
  async function handleFetch() {
    setLoading(true)
    setError('')
    setData(null)
    setCopied(false)

    const response = await fetch(`/api/faculty/defaulters?semester=${semester}`)
    const result = await response.json()

    if (!response.ok) {
      setError(result.error ?? 'Failed to fetch data.')
      setLoading(false)
      return
    }

    setData(result)
    setLoading(false)
  }

  // Copy for WhatsApp
  function handleCopyWhatsApp() {
    if (!data || data.defaulters.length === 0) return

    const lines = [
      `📋 *FYIMP Course Registration — Defaulters*`,
      `📚 Semester: ${semester}`,
      `🏛️ Department: ${hodInfo?.department_name}`,
      ``,
      `The following students have *not yet submitted* their course registration:`,
      ``,
      ...data.defaulters.map((s, i) => `${i + 1}. ${s.full_name}`),
      ``,
      `Total defaulters: ${data.defaulter_count} / ${data.total_students}`,
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

      {/* Main Content */}
      <div className={styles.mainContent}>

        {/* ── CSV UPLOAD ── */}
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
            {uploading ? (
              <><span className={styles.spinner} /> Uploading...</>
            ) : (
              'Upload Students →'
            )}
          </button>
        </div>

        {/* Upload Results */}
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

        {/* ── DEFAULTER RADAR ── */}
        <p className={styles.sectionTitle}>Registration Status</p>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.semesterRow}>
          <span className={styles.semesterLabel}>Semester:</span>
          <select
            className={styles.semesterSelect}
            value={semester}
            onChange={e => setSemester(Number(e.target.value))}
          >
            {[1,2,3,4,5,6,7,8,9,10].map(s => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
          <button
            className={styles.fetchBtn}
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Check →'}
          </button>
        </div>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Fetching student data...</p>
          </div>
        )}

        {!loading && data && (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <p className={styles.statValue}>{data.total_students}</p>
                <p className={styles.statLabel}>Total</p>
              </div>
              <div className={styles.statCard}>
                <p className={`${styles.statValue} ${styles.success}`}>{data.submitted_count}</p>
                <p className={styles.statLabel}>Submitted</p>
              </div>
              <div className={styles.statCard}>
                <p className={`${styles.statValue} ${data.defaulter_count > 0 ? styles.danger : styles.success}`}>
                  {data.defaulter_count}
                </p>
                <p className={styles.statLabel}>Pending</p>
              </div>
            </div>

            <div className={styles.sectionHeader}>
              <p className={styles.sectionTitle}>
                Pending Students ({data.defaulter_count})
              </p>
              {data.defaulter_count > 0 && (
                copied
                  ? <span className={styles.copiedMsg}>✓ Copied!</span>
                  : <button className={styles.whatsappBtn} onClick={handleCopyWhatsApp}>
                      📋 Copy for WhatsApp
                    </button>
              )}
            </div>

            <div className={styles.tableWrapper}>
              {data.defaulter_count === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🎉</div>
                  <p className={styles.emptyTitle}>All students submitted!</p>
                  <p className={styles.emptySubtitle}>
                    All {data.total_students} students completed registration for Semester {semester}.
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr><th>#</th><th>Name</th></tr>
                  </thead>
                  <tbody>
                    {data.defaulters.map((student, index) => (
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

      </div>
    </div>
  )
}
