'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import StudentDashboardClient from './StudentDashboardClient'
import styles from './student-dashboard.module.css'

interface StudentInfo {
  id?: string
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

export default function StudentDashboardPage() {
  const router = useRouter()
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [hasSubmission, setHasSubmission] = useState(false)
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [totalRegisteredCredits, setTotalRegisteredCredits] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Instant hydration from sessionStorage for zero-flash page back/forth transitions
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('fyimp_student_summary')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed?.studentInfo) {
            setStudentInfo(parsed.studentInfo)
            setHasSubmission(parsed.hasSubmission ?? false)
            setEnrolledCourses(parsed.enrolledCourses || [])
            setTotalRegisteredCredits(parsed.totalRegisteredCredits || 0)
            setLoading(false)
          }
        }
      } catch {
        // Ignore session parse error
      }
    }

    // 2. Background fresh revalidation
    async function loadSummary() {
      try {
        const res = await fetch('/api/student/dashboard-summary')
        if (res.status === 401) {
          router.replace('/login')
          return
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          if (err.must_change_password) {
            router.replace('/dashboard/student/change-password')
            return
          }
          router.replace('/login')
          return
        }
        const data = await res.json()
        if (data.must_change_password) {
          router.replace('/dashboard/student/change-password')
          return
        }
        setStudentInfo(data.studentInfo)
        setHasSubmission(data.hasSubmission)
        setEnrolledCourses(data.enrolledCourses || [])
        setTotalRegisteredCredits(data.totalRegisteredCredits || 0)

        // Cache for subsequent instant transitions
        try {
          sessionStorage.setItem('fyimp_student_summary', JSON.stringify(data))
        } catch {
          // Ignore storage quota error
        }
      } catch {
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }
    loadSummary()
  }, [router])

  // Modern Skeleton Loading Screen (Theme-matched, zero white page flash)
  if (loading && !studentInfo) {
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
          <div style={{ width: '70px', height: '28px' }} className={styles.skeletonPulse} />
        </div>

        {/* Profile Section Skeleton */}
        <div className={styles.profileSection}>
          <div className={styles.profileTop}>
            <div className={`${styles.skeletonAvatar} ${styles.skeletonPulse}`} />
            <div className={styles.profileMeta} style={{ gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
              <div className={`${styles.skeletonTextLg} ${styles.skeletonPulse}`} />
              <div className={`${styles.skeletonTextSm} ${styles.skeletonPulse}`} style={{ width: '110px' }} />
            </div>
          </div>

          <div className={styles.profileGrid} style={{ marginTop: '1.5rem' }}>
            <div className={`${styles.skeletonChip} ${styles.skeletonPulse}`} />
            <div className={`${styles.skeletonChip} ${styles.skeletonPulse}`} />
            <div className={`${styles.skeletonChip} ${styles.skeletonPulse}`} />
            <div className={`${styles.skeletonChip} ${styles.skeletonPulse}`} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
            <div style={{ height: '3rem', borderRadius: '0.65rem' }} className={styles.skeletonPulse} />
            <div style={{ height: '3rem', borderRadius: '0.65rem' }} className={styles.skeletonPulse} />
          </div>
        </div>

        {/* Action / Course Section Skeleton */}
        <div style={{ maxWidth: '1200px', width: '100%', margin: '1.5rem auto', padding: '0 1rem', boxSizing: 'border-box' }}>
          <div style={{ height: '7rem', borderRadius: '0.85rem', marginBottom: '1.5rem' }} className={styles.skeletonLightPulse} />
          <div style={{ height: '14rem', borderRadius: '0.85rem' }} className={styles.skeletonLightPulse} />
        </div>
      </div>
    )
  }

  if (!studentInfo) {
    return null
  }

  return (
    <StudentDashboardClient
      studentInfo={studentInfo}
      hasSubmission={hasSubmission}
      enrolledCourses={enrolledCourses}
      totalRegisteredCredits={totalRegisteredCredits}
    />
  )
}
