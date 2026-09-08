'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Footer from '@/component/Footer'
import styles from './consent.module.css'
import { ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

export default function ConsentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<Role | null>(null)
  const [currentVersion, setCurrentVersion] = useState('2026-09-08')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function verifyStatus() {
      try {
        const [profileRes, statusRes] = await Promise.all([
          fetch('/api/auth/profile'),
          fetch('/api/consent/status'),
        ])

        if (!profileRes.ok) {
          router.replace('/login')
          return
        }

        const profileData = await profileRes.json()
        setUserRole(profileData.role as Role)

        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (statusData.currentVersion) {
            setCurrentVersion(statusData.currentVersion)
          }

          // If already accepted, redirect straight to dashboard
          if (statusData.accepted) {
            const dest = profileData.role
              ? ROLE_DASHBOARD_MAP[profileData.role as Role] || '/dashboard/student'
              : '/dashboard/student'
            router.replace(dest)
            return
          }
        }
      } catch (err) {
        console.error('Failed to verify consent status:', err)
      } finally {
        setChecking(false)
      }
    }

    verifyStatus()
  }, [router])

  const handleAccept = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/consent/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy_version: currentVersion }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to record consent. Please try again.')
      }

      const dest = userRole ? ROLE_DASHBOARD_MAP[userRole] || '/dashboard/student' : '/dashboard/student'
      router.replace(dest)
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.')
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.replace('/login')
    }
  }

  if (checking) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <span className={styles.logoBadge}>FYIMP</span>
            <span className={styles.logoText}>Kannur University</span>
          </div>
          <button onClick={handleSignOut} className={styles.signOutHeaderBtn}>
            Sign Out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.iconContainer}>
            <span className={styles.shieldIcon}>🛡️</span>
          </div>

          <span className={styles.badge}>Policy Update • Version {currentVersion}</span>
          <h1 className={styles.title}>Data Privacy & Terms Agreement</h1>
          <p className={styles.subtitle}>
            FYIMP Management System — Department of Information Technology, Kannur University.
            Please review how your data is collected and used before continuing to the portal.
          </p>

          <div className={styles.divider} />

          <div className={styles.dataList}>
            <div className={styles.dataItem}>
              <div className={styles.bullet}>✓</div>
              <div className={styles.itemContent}>
                <h3>Identity Information</h3>
                <p>
                  Name, registration number, department, and campus are used solely to route your account
                  to the correct courses, timetable, and departmental records.
                </p>
              </div>
            </div>

            <div className={styles.dataItem}>
              <div className={styles.bullet}>✓</div>
              <div className={styles.itemContent}>
                <h3>Academic Coordination Data</h3>
                <p>
                  Course registrations, timetable slot assignments, and declared credits are processed
                  to automate schedule coordination and credit ledgers.
                </p>
              </div>
            </div>

            <div className={styles.dataItem}>
              <div className={styles.bullet}>✓</div>
              <div className={styles.itemContent}>
                <h3>Attendance Tracking</h3>
                <p>
                  Class period attendance marked by instructors and daily campus sign-in status (on-time,
                  late, early-leave) help faculty and HODs maintain statutory attendance statements.
                </p>
              </div>
            </div>

            <div className={`${styles.dataItem} ${styles.highlightItem}`}>
              <div className={`${styles.bullet} ${styles.highlightBullet}`}>📍</div>
              <div className={styles.itemContent}>
                <h3>Zero GPS Coordinate Retention</h3>
                <p>
                  <strong>Momentary check only:</strong> Device location is sent for a single momentary
                  verification check to confirm presence within campus perimeter and is discarded immediately.
                </p>
                <p className={styles.privacyNote}>
                  Location coordinates are never stored in any database, tracked in the background, or shared.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.legalLinksBlock}>
            <p>
              Please read the complete institutional documentation before continuing:
            </p>
            <div className={styles.linksRow}>
              <Link href="/privacy-policy" target="_blank" className={styles.legalLink}>
                📄 Read Full Privacy Policy ↗
              </Link>
              <Link href="/terms-of-use" target="_blank" className={styles.legalLink}>
                📋 Read Full Terms of Use ↗
              </Link>
            </div>
          </div>

          {error && <div className={styles.errorAlert}>{error}</div>}

          <div className={styles.actions}>
            <button
              onClick={handleAccept}
              disabled={loading}
              className={styles.agreeButton}
            >
              {loading ? 'Recording Consent...' : 'I Agree & Continue to Portal →'}
            </button>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className={styles.declineButton}
            >
              Decline & Sign Out
            </button>
          </div>

          <p className={styles.complianceNotice}>
            Acceptance is recorded in an immutable audit log per institutional compliance regulations.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
