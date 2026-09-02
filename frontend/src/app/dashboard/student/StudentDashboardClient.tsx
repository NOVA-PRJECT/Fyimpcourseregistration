'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import styles from './student-dashboard.module.css'
import { useBfcacheGuard } from '@/core/hooks/useBfcacheGuard'

interface StudentInfo {
  full_name: string
  current_semester: number
  academic_year_joined: string
  department_name: string
  campus_name: string
}

interface StudentDashboardClientProps {
  studentInfo: StudentInfo
  hasSubmission: boolean
}

export default function StudentDashboardClient({ studentInfo, hasSubmission }: StudentDashboardClientProps) {
  useBfcacheGuard()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)



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
            <p className={styles.topBarSubtitle}>Student Dashboard</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      {/* Full-width Profile Section */}
      <div className={styles.profileSection}>
        {studentInfo ? (
          <>
            {/* Avatar + Name */}
            <div className={styles.profileTop}>
              <div className={styles.profileAvatar}>
                {studentInfo.full_name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.profileMeta}>
                <h1 className={styles.profileName}>{studentInfo.full_name}</h1>
                <p className={styles.profileRole}>FYIMP Student</p>
              </div>
            </div>

            {/* Detail Grid */}
            <div className={styles.profileGrid}>
              <div className={styles.profileField}>
                <span className={styles.profileFieldLabel}>Department</span>
                <span className={styles.profileFieldValue}>{studentInfo.department_name}</span>
              </div>
              <div className={styles.profileField}>
                <span className={styles.profileFieldLabel}>Campus</span>
                <span className={styles.profileFieldValue}>{studentInfo.campus_name}</span>
              </div>
              <div className={styles.profileField}>
                <span className={styles.profileFieldLabel}>Current Semester</span>
                <span className={styles.profileFieldValue}>
                  <span className={styles.semBadge}>Semester {studentInfo.current_semester}</span>
                </span>
              </div>
              <div className={styles.profileField}>
                <span className={styles.profileFieldLabel}>Academic Year Joined</span>
                <span className={styles.profileFieldValue}>{studentInfo.academic_year_joined}</span>
              </div>
            </div>

            {/* Register / Update Button */}
            <div className={styles.profileAction}>
              <Link
                href="/dashboard/student/register"
                className={styles.registerLink}
              >
                {hasSubmission ? 'Update Track & Course Selection →' : 'Select Track & Register Courses →'}
              </Link>
              <p className={styles.registerHint}>
                {hasSubmission
                  ? 'You have already submitted your track selection. Click to view or update your choices.'
                  : 'First select your academic track, then choose your paper preferences for this semester.'}
              </p>
            </div>

            {/* Resource Hub Ad-Style Premium Card */}
            <div className={styles.resourceAdCard}>
              <div className={styles.adBadge}>STUDENT RESOURCE</div>
              <div className={styles.adContent}>
                <div className={styles.adTextGroup}>
                  <h3 className={styles.adTitle}>FYIMP HUB</h3>
                  <p className={styles.adDescription}>
                    Unlock free access to study materials, syllabus copies, notes, and semester-wise question pools curated by KUC MANGATTUPARAMBA FYIMP students
                  </p>
                </div>
                <a
                  href="https://fyimphub.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.adButton}
                >
                  Explore Hub →
                </a>
              </div>
            </div>
          </>
        ) : (
          <p className={styles.profileError}>Unable to load profile. Please refresh.</p>
        )}
      </div>

    </div>
  )
}
