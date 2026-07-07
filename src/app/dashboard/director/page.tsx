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

export default function DirectorDashboard() {
  const router = useRouter()

  const [directorName, setDirectorName] = useState('')
  const [campusName, setCampusName] = useState('')
  const [campusId, setCampusId] = useState('')
  const [loadingDirector, setLoadingDirector] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])

  // Window settings state
  const [currentDeadline, setCurrentDeadline] = useState<string | null>(null)
  const [deadline, setDeadline] = useState('')
  const [minCredits, setMinCredits] = useState(18)
  const [maxCredits, setMaxCredits] = useState(26)
  const [savingWindow, setSavingWindow] = useState(false)
  const [windowSuccess, setWindowSuccess] = useState('')
  const [windowError, setWindowError] = useState('')

  // Promotion state
  const [promoting, setPromoting] = useState(false)
  const [promoteSuccess, setPromoteSuccess] = useState('')
  const [promoteError, setPromoteError] = useState('')
  const [promoteStep, setPromoteStep] = useState<0 | 1 | 2>(0) // 0=hidden 1=step1 2=step2
  const [lastPromotedAt, setLastPromotedAt] = useState<string | null>(null)

  // Add faculty state
  const [facultyName, setFacultyName] = useState('')
  const [facultyEmail, setFacultyEmail] = useState('')
  const [facultyPassword, setFacultyPassword] = useState('')
  const [facultyRole, setFacultyRole] = useState<'hod' | 'campus_director'>('hod')
  const [facultyDeptId, setFacultyDeptId] = useState('')
  const [addingFaculty, setAddingFaculty] = useState(false)
  const [facultySuccess, setFacultySuccess] = useState('')
  const [facultyError, setFacultyError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Derived window status from deadline alone
  const windowIsOpen = currentDeadline !== null && new Date() < new Date(currentDeadline)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get faculty (director) info
      const { data: faculty } = await supabase
        .from('faculty')
        .select('full_name, campus_id')
        .eq('id', user.id)
        .single()

      if (!faculty) { router.push('/login'); return }

      setDirectorName(faculty.full_name)
      setCampusId(faculty.campus_id)

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
        .select('deadline, min_credits, max_credits')
        .eq('campus_id', faculty.campus_id)
        .single()

      if (settings) {
        setCurrentDeadline(settings.deadline)
        setDeadline(
          settings.deadline
            ? new Date(settings.deadline).toISOString().slice(0, 16)
            : ''
        )
        setMinCredits(settings.min_credits ?? 18)
        setMaxCredits(settings.max_credits ?? 26)
        setLastPromotedAt((settings as any).last_promoted_at ?? null)
      }

      // Get departments for this campus
      const { data: depts } = await supabase
        .from('departments')
        .select('id, name')
        .eq('campus_id', faculty.campus_id)

      if (depts) setDepartments(depts)

      setLoadingDirector(false)
    }
    loadData()
  }, [])

  // Academic year helper
  function getAcademicYear(): string {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    if (month >= 6) return `${year}-${String(year + 1).slice(2)}`
    return `${year - 1}-${String(year).slice(2)}`
  }

  // Save window settings
  async function handleSaveWindow() {
    if (!deadline) {
      setWindowError('Please set a deadline')
      return
    }

    const deadlineDate = new Date(deadline)
    if (isNaN(deadlineDate.getTime())) {
      setWindowError('Invalid deadline date')
      return
    }

    setSavingWindow(true)
    setWindowError('')
    setWindowSuccess('')

    const response = await fetch('/api/admin/campus/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deadline: deadlineDate.toISOString(),
        min_credits: minCredits,
        max_credits: maxCredits,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setWindowError(data.error ?? 'Failed to update settings.')
      setSavingWindow(false)
      return
    }

    setCurrentDeadline(deadlineDate.toISOString())
    setWindowSuccess(data.message)
    setSavingWindow(false)
  }

  // Promote students
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
      setPromoteStep(0)
      return
    }

    setPromoteSuccess(`${data.message}${data.graduated_count > 0 ? ` (${data.graduated_count} students graduated and removed)` : ''}`)
    setLastPromotedAt(new Date().toISOString())
    setPromoting(false)
    setPromoteStep(0)
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
        <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>

      {/* Director Info Card */}
      <div className={styles.infoCard}>
        {loadingDirector ? (
          <div style={{ height: '2.5rem' }} />
        ) : (
          <>
            <p className={styles.directorName}>{directorName || 'Campus Director'}</p>
            <div className={styles.directorDetails}>
              <span className={`${styles.detailBadge} ${styles.roleBadge}`}>Campus Director</span>
              <span className={styles.detailBadge}>{campusName}</span>
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

          {/* Live Status Banner */}
          <div className={windowIsOpen ? styles.Banner : styles.windowClosedBanner}>
            {windowIsOpen ? (
              <>
                <span className={styles.statusDot} />
                Open — closes {new Date(currentDeadline!).toLocaleString('en-IN')}
              </>
            ) : (
              <>
                ⛔ Closed
                {currentDeadline
                  ? ` — deadline was ${new Date(currentDeadline).toLocaleString('en-IN')}`
                  : ' — no deadline set yet'}
              </>
            )}
          </div>

          <div className={styles.fieldGroup}>

            <div className={styles.field}>
              <label className={styles.label}>Registration Deadline</label>
              <input
                type="datetime-local"
                className={styles.input}
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
              <p className={styles.fieldHint}>
                Window opens immediately and closes automatically at this date and time.
              </p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Academic Year</label>
              <div className={styles.readOnlyField}>
                {getAcademicYear()}
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
            {savingWindow
              ? <><span className={styles.spinner} /> Saving...</>
              : 'Save Settings →'
            }
          </button>

        </div>

        {/* ── SEMESTER PROMOTION ── */}
        <p className={styles.sectionTitle}>Semester Promotion</p>

        {promoteError && <div className={styles.errorBanner}>{promoteError}</div>}
        {promoteSuccess && <div className={styles.successBanner}>✓ {promoteSuccess}</div>}

        <div className={styles.windowCard}>
          <p style={{ fontSize: '0.82rem', color: '#44474e', margin: '0 0 1rem 0' }}>
            Promote all students in this campus to the next semester.
            Students in their final semester (10) will be removed from the system.
            This action cannot be undone.
          </p>

          {/* Step 0: Just show the button */}
          {promoteStep === 0 && (
            <button
              className={styles.primaryBtn}
              onClick={() => setPromoteStep(1)}
              style={{ background: '#c9a227', color: '#002147' }}
            >
              Promote All Students →
            </button>
          )}

          {/* Step 1: Show last promotion time and ask to continue */}
          {promoteStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: '#fff8e6', border: '1px solid #f5d78c', borderRadius: '0.6rem', padding: '0.9rem 1rem' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b6914', margin: '0 0 0.3rem' }}>
                  📅 Last Promotion
                </p>
                <p style={{ fontSize: '0.85rem', color: '#44474e', margin: 0 }}>
                  {lastPromotedAt
                    ? new Date(lastPromotedAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : 'Never promoted on this system'}
                </p>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#44474e', margin: 0 }}>
                Please verify the date above before continuing. Only proceed if you intend to start a new semester now.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className={styles.primaryBtn}
                  onClick={() => setPromoteStep(2)}
                  style={{ background: '#c9a227', color: '#002147' }}
                >
                  Continue →
                </button>
                <button
                  className={styles.primaryBtn}
                  onClick={() => setPromoteStep(0)}
                  style={{ background: '#9ba1ab' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Explicit confirmation */}
          {promoteStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: '#fdf2f2', border: '1px solid #f5c6c6', borderRadius: '0.6rem', padding: '0.9rem 1rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c0392b', margin: 0 }}>
                  ⚠️ Has the next semester officially started?
                </p>
                <p style={{ fontSize: '0.78rem', color: '#44474e', margin: '0.35rem 0 0' }}>
                  This will increment every student's semester by 1 and permanently remove Semester 10 graduates.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className={styles.primaryBtn}
                  onClick={handlePromoteStudents}
                  disabled={promoting}
                  style={{ background: '#c0392b' }}
                >
                  {promoting
                    ? <><span className={styles.spinner} /> Promoting...</>
                    : 'Yes, Start New Semester →'
                  }
                </button>
                <button
                  className={styles.primaryBtn}
                  onClick={() => setPromoteStep(0)}
                  disabled={promoting}
                  style={{ background: '#9ba1ab' }}
                >
                  No, Cancel
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
                className={styles.input}
                value={facultyRole}
                onChange={e => setFacultyRole(e.target.value as 'hod' | 'campus_director')}
              >
                <option value="hod">HOD</option>
                <option value="campus_director">Campus Director</option>
              </select>
            </div>

            {facultyRole === 'hod' && (
              <div className={styles.field}>
                <label className={styles.label}>Department</label>
                <select
                  className={styles.input}
                  value={facultyDeptId}
                  onChange={e => setFacultyDeptId(e.target.value)}
                >
                  <option value="">— Select Department —</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
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
            {addingFaculty
              ? <><span className={styles.spinner} /> Creating Account...</>
              : 'Create Faculty Account →'
            }
          </button>
        </div>

      </div>
    </div>
  )
}
