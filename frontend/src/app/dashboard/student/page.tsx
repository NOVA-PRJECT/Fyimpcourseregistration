'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import StudentDashboardClient from './StudentDashboardClient'

interface StudentInfo {
  full_name: string
  current_semester: number
  academic_year_joined: string
  department_name: string
  campus_name: string
}

export default function StudentDashboardPage() {
  const router = useRouter()
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [hasSubmission, setHasSubmission] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
      } catch {
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }
    loadSummary()
  }, [router])

  if (loading || !studentInfo) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui' }}>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <StudentDashboardClient
      studentInfo={studentInfo}
      hasSubmission={hasSubmission}
    />
  )
}
