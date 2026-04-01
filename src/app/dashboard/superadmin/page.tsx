'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Papa from 'papaparse'
import styles from './superadmin-dashboard.module.css'

interface UploadError {
  row: number
  issues: string[]
}

interface UploadResult {
  inserted_count: number
  error_count: number
  errors?: UploadError[]
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [adminName, setAdminName] = useState('')
  const [loadingAdmin, setLoadingAdmin] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Load admin info on mount
  useEffect(() => {
    async function loadAdminInfo() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: admin } = await supabase
        .from('admins')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (admin) setAdminName(admin.full_name)
      setLoadingAdmin(false)
    }
    loadAdminInfo()
  }, [])

  // Handle file selection
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file only')
      return
    }

    setSelectedFile(file)
    setError('')
    setUploadResult(null)
    setSuccess('')
  }

  // Parse CSV and upload
  async function handleUpload() {
    if (!selectedFile) {
      setError('Please select a CSV file first')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')
    setUploadResult(null)

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data

        if (!rows || rows.length === 0) {
          setError('CSV file is empty or has no valid rows')
          setUploading(false)
          return
        }

        try {
          const response = await fetch('/api/admin/bulk-admissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rows),
          })

          const data = await response.json()

          if (!response.ok) {
            setError(data.error ?? 'Upload failed. Please try again.')
            setUploading(false)
            return
          }

          setUploadResult(data)
          setSuccess(`Upload complete — ${data.inserted_count} students added successfully.`)
          setSelectedFile(null)
          if (fileInputRef.current) fileInputRef.current.value = ''

        } catch {
          setError('Something went wrong. Please try again.')
        }

        setUploading(false)
      },
      error: () => {
        setError('Failed to parse CSV file. Please check the format.')
        setUploading(false)
      }
    })
  }

  // Logout
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
            <p className={styles.topBarSubtitle}>Super Admin</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Admin Info Card */}
      <div className={styles.infoCard}>
        {loadingAdmin ? (
          <div style={{ height: '2.5rem' }} />
        ) : (
          <>
            <p className={styles.adminName}>
              {adminName || 'Super Admin'}
            </p>
            <div className={styles.adminDetails}>
              <span className={styles.detailBadge}>
                ⚡ Super Admin
              </span>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {success && <div className={styles.successBanner}>✓ {success}</div>}

        {/* ── BULK UPLOAD ── */}
        <p className={styles.sectionTitle}>Bulk Upload Admissions</p>

        <div className={styles.uploadCard}>
          <p className={styles.uploadDescription}>
            Upload the official CAP allotment CSV file to register new Semester 1 students.
            Each row must contain the student's CAP number, date of birth, full name,
            department ID, campus ID, and academic year.
          </p>

          {/* CSV Format Hint */}
          <div className={styles.formatHint}>
            <p className={styles.formatHintTitle}>Required CSV Columns</p>
            <p className={styles.formatHintCode}>
  cap_application_number, date_of_birth, full_name,<br />
  email, department_name, campus_code, academic_year
</p>
<p className={styles.formatHintCode} style={{ marginTop: '0.5rem', color: '#9ba1ab' }}>
  Example: TEST003, 2005-01-01, Ahmed Ali,<br />
  ahmed@test.com, Mathematical Sciences, KU, 2025-26
</p>
          </div>

          {/* Dropzone */}
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
            className={styles.primaryBtn}
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
          >
            {uploading ? (
              <>
                <span className={styles.spinner} />
                Uploading...
              </>
            ) : (
              'Upload Admissions →'
            )}
          </button>
        </div>

        {/* ── UPLOAD RESULTS ── */}
        {uploadResult && (
          <>
            <p className={styles.sectionTitle}>Upload Results</p>
            <div className={styles.resultsCard}>

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

              {/* Error list */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className={styles.errorList}>
                  <p className={styles.errorListTitle}>
                    Row Errors ({uploadResult.errors.length})
                  </p>
                  {uploadResult.errors.map((err, index) => (
                    <div key={index} className={styles.errorItem}>
                      Row {err.row}: {err.issues.join(', ')}
                    </div>
                  ))}
                </div>
              )}

            </div>
          </>
        )}

      </div>
    </div>
  )
}
