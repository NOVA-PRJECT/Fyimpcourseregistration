'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
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

interface PendingStudent {
  id: string
  full_name: string
}

interface HodInfo {
  full_name: string
  department_name: string
}

export default function HodDashboard() {
  const router = useRouter()
  const [hodInfo, setHodInfo] = useState<HodInfo | null>(null)
  const [loadingHod, setLoadingHod] = useState(true)
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [approvalMsg, setApprovalMsg] = useState('')
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

      const response = await fetch('/api/hod/pending-signups')
      const result = await response.json()
      if (response.ok) setPendingStudents(result)
      setLoadingPending(false)
    }
    loadData()
  }, [])

  async function handleApprove(studentId: string) {
    setApprovingId(studentId)
    setApprovalMsg('')
    const response = await fetch('/api/hod/approve-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId }),
    })
    const result = await response.json()
    if (response.ok) {
      setApprovalMsg('Student approved successfully')
      setPendingStudents(prev => prev.filter(s => s.id !== studentId))
    } else {
      setApprovalMsg(result.error ?? 'Failed to approve')
    }
    setApprovingId(null)
  }

  async function handleReject(studentId: string) {
    setRejectingId(studentId)
    setApprovalMsg('')
    const response = await fetch('/api/hod/reject-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId }),
    })
    const result = await response.json()
    if (response.ok) {
      setApprovalMsg('Student rejected and removed')
      setPendingStudents(prev => prev.filter(s => s.id !== studentId))
    } else {
      setApprovalMsg(result.error ?? 'Failed to reject')
    }
    setRejectingId(null)
  }

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

  function handleCopyWhatsApp() {
    if (!data || data.defaulters.length === 0) return
    const lines = [
      `📋 *FYIMP Course Registration*`,
      `📚 Semester: ${semester}`,
      `🏛️ Department: ${hodInfo?.department_name}`,
      ``,
      `The following students have *not yet submitted* their course registration:`,
      ``,
      ...data.defaulters.map((s, i) => `${i + 1}. ${s.full_name} (${s.roll_number})`),
      ``,
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

      <div className={styles.mainContent}>

        {/* Pending Approvals */}
        <div className={styles.sectionHeader}>
          <p className={styles.sectionTitle}>Pending Approvals</p>
          {pendingStudents.length > 0 && (
            <span className={styles.pendingBadge}>{pendingStudents.length}</span>
          )}
        </div>

        {approvalMsg && <div className={styles.successBanner}>✓ {approvalMsg}</div>}

        <div className={styles.tableWrapper} style={{ marginBottom: '1.25rem' }}>
          {loadingPending ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>Loading...</p>
            </div>
          ) : pendingStudents.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>✅</div>
              <p className={styles.emptyTitle}>No pending approvals</p>
              <p className={styles.emptySubtitle}>All signup requests have been reviewed.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingStudents.map((student, index) => (
                  <tr key={student.id} className={styles.tableRow}>
                    <td>{index + 1}</td>
                    <td>{student.full_name}</td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button
                          className={styles.approveBtn}
                          onClick={() => handleApprove(student.id)}
                          disabled={approvingId === student.id || rejectingId === student.id}
                        >
                          {approvingId === student.id ? '...' : '✓ Approve'}
                        </button>
                        <button
                          className={styles.rejectBtn}
                          onClick={() => handleReject(student.id)}
                          disabled={approvingId === student.id || rejectingId === student.id}
                        >
                          {rejectingId === student.id ? '...' : '✗ Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Defaulter Radar */}
        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.semesterRow}>
          <span className={styles.semesterLabel}>Check Semester:</span>
          <select
            className={styles.semesterSelect}
            value={semester}
            onChange={e => setSemester(Number(e.target.value))}
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
              <p className={styles.sectionTitle}>Pending Students ({data.defaulter_count})</p>
              {data.defaulter_count > 0 && (
                copied
                  ? <span className={styles.copiedMsg}>✓ Copied!</span>
                  : <button className={styles.whatsappBtn} onClick={handleCopyWhatsApp}>📋 Copy for WhatsApp</button>
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
                    <tr><th>#</th><th>Name</th><th>Roll Number</th></tr>
                  </thead>
                  <tbody>
                    {data.defaulters.map((student, index) => (
                      <tr key={student.id} className={styles.tableRow}>
                        <td>{index + 1}</td>
                        <td>{student.full_name}</td>
                        <td className={styles.rollNumber}>{student.roll_number}</td>
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
