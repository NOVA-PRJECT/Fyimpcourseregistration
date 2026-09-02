'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './home.module.css'
import { ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkSession(isBfcache: boolean) {
      try {
        const response = await fetch('/api/auth/profile')
        if (response.ok) {
          const data = await response.json()
          if (data.role) {
            const target = ROLE_DASHBOARD_MAP[data.role as Role] || '/dashboard/student'
            router.replace(target)
            return // Redirection triggered, leave checking as true to keep content hidden
          }
        }
      } catch (err) {
        console.error('Session check failed:', err)
      }
      setChecking(false)
    }

    // Check on mount
    checkSession(false)

    // Check on pageshow (specifically for true bfcache restorations)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setChecking(true) // Immediately hide stale content with spinner
        checkSession(true)
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [router])

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#030a16',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(201, 162, 39, 0.1)',
          borderTop: '3px solid #c9a227',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Background gradients */}
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />

      {/* Main Card */}
      <div className={styles.card}>
        <div className={styles.brandHeader}>
          <div className={styles.logoWrapper}>
            <Image
              src="/logo.png"
              alt="Kannur University Logo"
              width={64}
              height={64}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <h1 className={styles.universityName}>Kannur University</h1>
          <div className={styles.goldLine} />
        </div>

        <h2 className={styles.portalTitle}>FYIMP Registration Portal</h2>

        <div className={styles.divider} />

        <Link href="/login" className={styles.loginBtn}>
          <span>Login to Portal</span>
          <span className={styles.arrow}>→</span>
        </Link>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        2026 Kannur University Mangattuparamba Campus
      </footer>
    </div>
  )
}
