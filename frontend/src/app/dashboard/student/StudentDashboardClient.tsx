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

export interface EnrolledCourse {
  slotNumber: number
  id: string
  courseCode: string
  title: string
  credits: number
  category: string
  departmentName: string
  status: string
  isConfirmed: boolean
}

interface StudentDashboardClientProps {
  studentInfo: StudentInfo
  hasSubmission: boolean
  enrolledCourses?: EnrolledCourse[]
  totalRegisteredCredits?: number
}

export default function StudentDashboardClient({
  studentInfo,
  hasSubmission,
  enrolledCourses = [],
  totalRegisteredCredits = 0,
}: StudentDashboardClientProps) {
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
                {hasSubmission ? 'View Course Details & Update Preferences →' : 'View Course Details & Register Electives →'}
              </Link>
              <Link
                href="/dashboard/student/credits"
                className={styles.registerLink}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  marginTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                📊 View Degree Credit Ledger (Exit Milestones) →
              </Link>
              <p className={styles.registerHint}>
                {hasSubmission
                  ? 'Track your credit accumulation across categories, level bands, and degree exit points.'
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

      {/* Enrolled Courses & Academic Schedule Section */}
      <div className={styles.enrolledSection}>
        <div className={styles.enrolledHeader}>
          <div className={styles.enrolledTitleGroup}>
            <h2 className={styles.enrolledTitle}>
              <span>📚</span> My Enrolled Courses — Semester {studentInfo?.current_semester ?? 1}
            </h2>
            <p className={styles.enrolledSubtitle}>
              Official papers registered and allocated for your current semester
            </p>
          </div>
          {totalRegisteredCredits > 0 && (
            <div className={styles.creditsTotalBadge}>
              {totalRegisteredCredits} Total Credits Enrolled
            </div>
          )}
        </div>

        {enrolledCourses && enrolledCourses.length > 0 ? (
          <div className={styles.courseGrid}>
            {enrolledCourses.map((c) => {
              const catUpper = (c.category || '').toUpperCase()
              let catClass = styles.catGeneral
              if (catUpper.includes('DSC') || catUpper.includes('DSE')) catClass = styles.catDsc
              else if (catUpper.includes('AEC')) catClass = styles.catAec
              else if (catUpper.includes('SEC')) catClass = styles.catSec
              else if (catUpper.includes('VAC')) catClass = styles.catVac
              else if (catUpper.includes('MDC')) catClass = styles.catMdc

              return (
                <div key={c.id || c.courseCode} className={styles.courseCard}>
                  <div className={styles.cardTopRow}>
                    <span className={styles.slotBadge}>Slot {c.slotNumber}</span>
                    <span className={`${styles.categoryBadge} ${catClass}`}>
                      {c.category}
                    </span>
                  </div>

                  <div className={styles.cardMainBody}>
                    <span className={styles.cardCourseCode}>{c.courseCode}</span>
                    <h3 className={styles.cardCourseTitle}>{c.title}</h3>
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.cardDeptName} title={c.departmentName}>
                      {c.departmentName}
                    </span>
                    <span className={styles.cardCreditPill}>
                      {c.credits} cr
                    </span>
                  </div>

                  <div>
                    {c.isConfirmed ? (
                      <span className={styles.statusPillConfirmed}>
                        ✓ {c.status}
                      </span>
                    ) : (
                      <span className={styles.statusPillPending}>
                        ⏳ {c.status}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={styles.emptyCoursesCard}>
            <div className={styles.emptyCoursesIcon}>📝</div>
            <h3 className={styles.emptyCoursesTitle}>
              {hasSubmission
                ? 'Preferences Submitted — Allocation in Progress'
                : 'No Courses Registered Yet'}
            </h3>
            <p className={styles.emptyCoursesText}>
              {hasSubmission
                ? `Your course preferences for Semester ${studentInfo?.current_semester ?? 1} have been received. Official course allocations will appear here once finalized by the administration.`
                : `You have not submitted course preferences for Semester ${studentInfo?.current_semester ?? 1}. Please select your academic track and submit your ranked choices.`}
            </p>
            <Link
              href="/dashboard/student/register"
              className={styles.registerLink}
              style={{ display: 'inline-flex', padding: '0.65rem 1.25rem', marginTop: '0.25rem' }}
            >
              {hasSubmission ? 'Review / Update Preferences →' : 'Select Track & Register Courses →'}
            </Link>
          </div>
        )}
      </div>

    </div>
  )
}
