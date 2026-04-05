'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import styles from './director-dashboard.module.css'

interface Department {
  id: string
  name: string
}

interface WindowSettings {
  registration_is_open: boolean
  deadline: string | null
  min_credits: number
  max_credits: number
  academic_year: string
}

export default function DirectorDashboard() {
  const router = useRouter()

  const [directorName, setDirectorName] = useState('')
  const [campusName, setCampusName] = useState('')
  const [loadingDirector, setLoadingDirector] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])

  // Window state
  const [windowSettings, setWindowSettings] = useState<WindowSettings | null>(null)
  const [windowOpen, setWindowOpen] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [academicYear, setAcademicYear] = useState('2025-26')
  const [minCredits, setMinCredits] = useState(18)
  const [maxCredits, setMaxCredits] = useState(26)
  const [savingWindow, setSavingWindow] = useState(false)
  const [windowSuccess, setWindowSuccess] = useState('')
  const [windowError, setWindowError] = useState('')

  // Add faculty state
  const [facultyName, setFacultyName] = useState('')
  const [facultyEmail, setFacultyEmail] = useState('')
  const [facultyPassword, setFacultyPassword] = useState('')
  const [facultyRole, setFacultyRole] = useState<'hod' | 'campus_director'>('hod')
  const [facultyDeptId, setFacultyDeptId] = useState('')
  const [addingFaculty, setAddingFaculty] = useState(false)
  const [facultySuccess, setFacultySuccess] = useState('')
  const [facultyError, setFacultyError] = useState('')
  const [promoting, setPromoting] = useState(false)
const [promoteSuccess, setPromoteSuccess] = useState('')
const [promoteError, setPromoteError] = useState('')
const [showConfirm, setShowConfirm] = useState(false)


  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Load director info on mount
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get director info
      const { data: faculty } = await supabase
        .from('faculty')
        .select('full_name, campus_id')
        .eq('id', user.id)
        .single()

      if (faculty) {
        setDirectorName(faculty.full_name)

        // Get campus name
        const { data: campus } = await supabase
          .from('campuses')
          .select('name')
          .eq('id', faculty.campus_id)
          .single()

        if (campus) setCampusName(campus.name)

        // Get campus settings
        const { data: settings } = await supabase
          .from('campus_settings')
          .select('*')
          .eq('campus_id', faculty.campus_id)
          .single()

        if (settings) {
          setWindowSettings(settings)
          setWindowOpen(settings.registration_is_open)
          setDeadline(settings.deadline ? settings.deadline.slice(0, 16) : '')
          setAcademicYear(settings.academic_year)
          setMinCredits(settings.min_credits)
          setMaxCredits(settings.max_credits)
        }

        // Get departments for this campus
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name')
          .eq('campus_id', faculty.campus_id)

        if (depts) setDepartments(depts)
      }

      setLoadingDirector(false)
    }
    loadData()
  }, [])

  // Save window settings
  async function handleSaveWindow() {
    setSavingWindow(true)
    setWindowError('')
    setWindowSuccess('')

    const response = await fetch('/api/admin/campus/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: windowOpen ? 'OPEN' : 'CLOSED',
        deadline: deadline ? new Date(deadline).toISOString() : new Date().toISOString(),
        min_credits: minCredits,
        max_credits: maxCredits,
        academic_year: academicYear,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setWindowError(data.error ?? 'Failed to update window settings.')
      setSavingWindow(false)
      return
    }

    setWindowSuccess(data.message)
    setSavingWindow(false)
  }
  
  //update semester 
  async function handlePromoteStudents() {
  setPromoting(true)
  setPromoteError('')
  setPromoteSuccess('')

  const response = await fetch('/api/admin/campus/promote-students', {
    method: 'POST',
  })

  const data = await response.json()

  if (!response.ok) {
    setPromoteError(data.error ?? 'Failed to promote students.')
    setPromoting(false)
    setShowConfirm(false)
    return
  }

  setPromoteSuccess(data.message)
  setPromoting(false)
  setShowConfirm(false)
}

  // Add faculty
  async function handleAddFaculty() {
    if (!facultyName || !facultyEmail || !facultyPassword) {
      setFacultyError('All fields are required')
      return
    }

    if (facultyRole === 'hod' && !facultyDeptId) {
      setFacultyError('Please select a department for the HOD')
      return
    }

    setAddingFaculty(true)
    setFacultyError('')
    setFacultySuccess('')

    const response = await fetch('/api/admin/campus/faculty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: facultyName,
        email: facultyEmail,
        password: facultyPassword,
        role: facultyRole,
        department_id: facultyRole === 'hod' ? facultyDeptId : undefined,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setFacultyError(data.error ?? 'Failed to create faculty account.')
      setAddingFaculty(false)
      return
    }

    setFacultySuccess(data.message)
    setFacultyName('')
    setFacultyEmail('')
    setFacultyPassword('')
    setFacultyDeptId('')
    setAddingFaculty(false)
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
            <p className={styles.topBarSubtitle}>Campus Director</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Director Info Card */}
      <div className={styles.infoCard}>
        {loadingDirector ? (
          <div style={{ height: '2.5rem' }} />
        ) : (
          <>
            <p className={styles.directorName}>
              {directorName || 'Campus Director'}
            </p>
            <div className={styles.directorDetails}>
              <span className={`${styles.detailBadge} ${styles.roleBadge}`}>
                Campus Director
              </span>
              <span className={styles.detailBadge}>
                {campusName}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>

        {/* ── REGISTRATION WINDOW ── */}
        <p className={styles.sectionTitle}>Registration Window</p>

        {windowError && <div className={styles.errorBanner}>{windowError}</div>}
        {windowSuccess && <div className={styles.successBanner}>✓ {windowSuccess}</div>}

        <div className={styles.windowCard}>

          {/* Status + Toggle */}
          <div className={styles.windowStatusRow}>
            <div className={styles.windowStatusLeft}>
              <div className={`${styles.windowDot} ${windowOpen ? styles.open : styles.closed}`} />
              <div>
                <p className={styles.windowStatusText}>
                  {windowOpen ? 'Registration Open' : 'Registration Closed'}
                </p>
                {windowSettings?.deadline && (
                  <p className={styles.windowDeadline}>
                    Deadline: {new Date(windowSettings.deadline).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.toggleWrapper}>
              <span className={styles.toggleLabel}>{windowOpen ? 'Open' : 'Closed'}</span>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={windowOpen}
                  onChange={e => setWindowOpen(e.target.checked)}
                />
                <span className={styles.toggleSlider} />
              </label>
            </div>
          </div>

          {/* Settings */}
          <div className={styles.fieldGroup}>
            <div className={styles.field}>
              <label className={styles.label}>Deadline</label>
              <input
                type="datetime-local"
                className={styles.input}
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
            </div>
            
            <div className={styles.field}>
  <label className={styles.label}>Academic Year</label>
  <div className={styles.readOnlyField}>
    {new Date().getMonth() + 1 >= 6
      ? `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`
      : `${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`
    }
    <span className={styles.autoLabel}>Auto</span>
  </div>
</div>
            



            <div className={styles.inputRow}>
              <div className={styles.field}>
                <label className={styles.label}>Min Credits</label>
                <input
                  type="number"
                  className={styles.input}
                  value={minCredits}
                  onChange={e => setMinCredits(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Max Credits</label>
                <input
                  type="number"
                  className={styles.input}
                  value={maxCredits}
                  onChange={e => setMaxCredits(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <button
            className={styles.primaryBtn}
            onClick={handleSaveWindow}
            disabled={savingWindow}
          >
            {savingWindow ? (
              <><span className={styles.spinner} /> Saving...</>
            ) : (
              'Save Window Settings →'
            )}
          </button>
        </div>
        
        {/* ── SEMESTER PROMOTION ── */}
<p className={styles.sectionTitle}>Semester Promotion</p>

{promoteError && <div className={styles.errorBanner}>{promoteError}</div>}
{promoteSuccess && <div className={styles.successBanner}>✓ {promoteSuccess}</div>}

<div className={styles.windowCard}>
  <p style={{ fontSize: '0.82rem', color: '#44474e', margin: '0 0 1rem 0' }}>
    Promote all students in this campus to the next semester. 
    This action cannot be undone. Use only at the start of a new semester.
  </p>

  {!showConfirm ? (
    <button
      className={styles.primaryBtn}
      onClick={() => setShowConfirm(true)}
      style={{ background: '#c9a227' }}
    >
      Promote All Students →
    </button>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontSize: '0.82rem', color: '#c0392b', fontWeight: 700, margin: 0 }}>
        ⚠️ Are you sure? This will increment all student semesters by 1.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          className={styles.primaryBtn}
          onClick={handlePromoteStudents}
          disabled={promoting}
          style={{ background: '#c0392b' }}
        >
          {promoting ? (
            <><span className={styles.spinner} /> Promoting...</>
          ) : (
            'Yes, Promote →'
          )}
        </button>
        <button
          className={styles.primaryBtn}
          onClick={() => setShowConfirm(false)}
          style={{ background: '#9ba1ab' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )}
</div>


        {/* ── ADD FACULTY ── */}
        <p className={styles.sectionTitle}>Add Faculty</p>

        {facultyError && <div className={styles.errorBanner}>{facultyError}</div>}
        {facultySuccess && <div className={styles.successBanner}>✓ {facultySuccess}</div>}

        <div className={styles.facultyCard}>
          <div className={styles.fieldGroup}>

            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Dr. Anjali Menon"
                value={facultyName}
                onChange={e => setFacultyName(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                className={styles.input}
                placeholder="anjali@ku.ac.in"
                value={facultyEmail}
                onChange={e => setFacultyEmail(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="Min. 8 characters"
                value={facultyPassword}
                onChange={e => setFacultyPassword(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Role</label>
              <select
                className={styles.roleSelect}
                value={facultyRole}
                onChange={e => setFacultyRole(e.target.value as 'hod' | 'campus_director')}
              >
                <option value="hod">HOD</option>
              </select>
            </div>

            {facultyRole === 'hod' && (
              <div className={styles.field}>
                <label className={styles.label}>Department</label>
                <select
                  className={styles.deptSelect}
                  value={facultyDeptId}
                  onChange={e => setFacultyDeptId(e.target.value)}
                >
                  <option value="">— Select Department —</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

          </div>

          <button
            className={styles.primaryBtn}
            onClick={handleAddFaculty}
            disabled={addingFaculty}
          >
            {addingFaculty ? (
              <><span className={styles.spinner} /> Creating Account...</>
            ) : (
              'Create Faculty Account →'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
