'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './pending.module.css'

export default function PendingApprovalPage() {
  const router = useRouter()

  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [rejected, setRejected] = useState(false)
  const [studentName, setStudentName] = useState('')

  async function handleCheckStatus() {
    setChecking(true)
    setError('')

    const response = await fetch('/api/students/approval-status')
    const data = await response.json()

    if (!response.ok) {
      if (response.status === 404) {
        // Student was rejected and deleted
        setRejected(true)
      } else {
        setError('Failed to check status. Please try again.')
      }
      setChecking(false)
      return
    }

    if (data.account_status === 'approved') {
      // Redirect to student dashboard
      router.push('/dashboard/student')
      return
    }

    // Still pending
    setStudentName(data.full_name)
    setChecking(false)
  }

  return (
    <div className={styles.pageWrapper}>

      <div className={styles.card}>

        {/* Card Header */}
        <div className={styles.cardHeader}>
          <div className={styles.logoWrapper}>
            <Image
              src="/logo.png"
              alt="Kannur University"
              width={40}
              height={40}
              className={styles.logo}
            />
          </div>
          <h1 className={styles.portalTitle}>
            FYIMP Registration Portal
          </h1>
          <div className={styles.goldLine} />
        </div>

        {/* Card Body */}
        <div className={styles.cardBody}>

          {!rejected ? (
            <>
              {/* Pending State */}
              <div className={styles.statusIcon}>⏳</div>

              <h2 className={styles.statusTitle}>Awaiting HOD Approval</h2>
              <p className={styles.statusDescription}>
                Your registration request has been submitted successfully.
                Your department HOD will review and approve your account.
                Come back and check your status below.
              </p>

              {studentName && (
                <div className={styles.infoBanner}>
                  Still pending, {studentName}. Please check back later.
                </div>
              )}

              {error && (
                <div className={styles.errorBanner}>{error}</div>
              )}

              <button
                className={styles.checkBtn}
                onClick={handleCheckStatus}
                disabled={checking}
              >
                {checking ? (
                  <>
                    <span className={styles.spinner} />
                    Checking...
                  </>
                ) : (
                  'Check Approval Status →'
                )}
              </button>

              <div className={styles.divider}>
                <div className={styles.dividerLine} />
                <span className={styles.dividerText}>or</span>
                <div className={styles.dividerLine} />
              </div>

              <p className={styles.loginLink}>
                Already approved?{' '}
                <Link href="/login">Login here →</Link>
              </p>
            </>
          ) : (
            <>
              {/* Rejected State */}
              <div className={styles.statusIcon}>❌</div>

              <h2 className={`${styles.statusTitle} ${styles.rejectedTitle}`}>
                Request Not Approved
              </h2>
              <p className={styles.statusDescription}>
                Your registration request was not approved by the HOD.
                If you believe this is a mistake, please contact your department directly.
              </p>

              <Link href="/signup" className={styles.retryBtn}>
                Try Again →
              </Link>
            </>
          )}

        </div>
      </div>

      <p className={styles.footer}>
        © 2026 Kannur University • Internal Systems Division
      </p>

    </div>
  )
}
