'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import styles from './student-dashboard.module.css'

interface StudentInfo {
  full_name: string
  roll_number: string
  current_semester: number
  academic_year_joined: string
  department_name: string
  campus_name: string
}

export default function StudentDashboard() {
  const router = useRouter()
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [loadingStudent, setLoadingStudent] = useState(true)
  const [hasSubmission, setHasSubmission] = useState<boolean | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadStudentInfo() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: student } = await supabase
        .from('students')
        .select(`
          full_name,
          roll_number,
          current_semester,
          academic_year_joined,
          must_change_password,
          departments (name),
          campuses (name)
        `)
        .eq('id', user.id)
        .single()

      if (student) {
        if (student.must_change_password) {
          router.replace('/dashboard/student/change-password')
          return
        }

        setStudentInfo({
          full_name: student.full_name,
          roll_number: student.roll_number,
          current_semester: student.current_semester,
          academic_year_joined: student.academic_year_joined ?? '—',
          department_name: (student.departments as any)?.name ?? 'Unknown',
          campus_name: (student.campuses as any)?.name ?? 'Unknown',
        })

        // Check if student has already submitted this semester
        const { data: reg } = await supabase
          .from('student_registrations')
          .select('student_id')
          .eq('student_id', user.id)
          .eq('semester', student.current_semester)
          .maybeSingle()

        setHasSubmission(!!reg)
      }
      setLoadingStudent(false)
    }
    loadStudentInfo()
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
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
            <p className={styles.topBarSubtitle}>Student Dashboard</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      {/* Full-width Profile Section */}
      <div className={styles.profileSection}>
        {loadingStudent ? (
          <div className={styles.profileSkeleton}>
            <div className={styles.skeletonAvatar} />
            <div style={{ flex: 1 }}>
              <div className={styles.skeletonBar} style={{ width: '12rem', height: '1.5rem', marginBottom: '0.75rem' }} />
              <div className={styles.skeletonBar} style={{ width: '8rem', height: '0.85rem' }} />
            </div>
          </div>
        ) : studentInfo ? (
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
                <span className={styles.profileFieldLabel}>Roll Number</span>
                <span className={styles.profileFieldValue}>{studentInfo.roll_number || '—'}</span>
              </div>
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
                {hasSubmission ? 'Update Registration →' : 'Register Courses →'}
              </Link>
              <p className={styles.registerHint}>
                {hasSubmission
                  ? 'You have already submitted. Click to update your selection.'
                  : 'Select your courses for this semester.'}
              </p>
            </div>
          </>
        ) : (
          <p className={styles.profileError}>Unable to load profile. Please refresh.</p>
        )}
      </div>

    </div>
  )
}
