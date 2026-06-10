'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import styles from './superadmin-dashboard.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Campus {
  _id: string
  name: string
  code: string
  createdAt: string
}

interface Department {
  _id: string
  name: string
  code: string
  campus_id: string
  campus_name?: string
  createdAt: string
}

interface Faculty {
  _id: string
  full_name: string
  email: string
  role: string
  department_id: string | null
  department_name: string
}

interface DepartmentWithHod {
  _id: string
  name: string
  code: string
  campus_id: string
  hod: {
    _id: string
    full_name: string
    email: string
  } | null
}

type Tab = 'campus' | 'departments' | 'hods'

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  superadmin: '/dashboard/superadmin',
  campus_director: '/dashboard/director',
  hod: '/dashboard/hod',
  teaching_staff: '/dashboard/teacher',
  student: '/dashboard/student',
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SuperadminDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('campus')

  // ── Campus state ──
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [loadingCampuses, setLoadingCampuses] = useState(false)
  const [campusError, setCampusError] = useState('')
  const [campusSuccess, setCampusSuccess] = useState('')

  const [showAddCampus, setShowAddCampus] = useState(false)
  const [campusName, setCampusName] = useState('')
  const [campusCode, setCampusCode] = useState('')
  const [savingCampus, setSavingCampus] = useState(false)

  const [editCampus, setEditCampus] = useState<Campus | null>(null)
  const [editCampusName, setEditCampusName] = useState('')
  const [editCampusCode, setEditCampusCode] = useState('')
  const [updatingCampus, setUpdatingCampus] = useState(false)

  const [deleteCampus, setDeleteCampus] = useState<Campus | null>(null)
  const [deletingCampus, setDeletingCampus] = useState(false)

  // ── Department state ──
  const [departments, setDepartments] = useState<Department[]>([])
  const [loadingDepts, setLoadingDepts] = useState(false)
  const [deptError, setDeptError] = useState('')
  const [deptSuccess, setDeptSuccess] = useState('')
  const [filterCampusId, setFilterCampusId] = useState('')

  const [showAddDept, setShowAddDept] = useState(false)
  const [deptName, setDeptName] = useState('')
  const [deptCode, setDeptCode] = useState('')
  const [deptCampusId, setDeptCampusId] = useState('')
  const [savingDept, setSavingDept] = useState(false)

  const [editDept, setEditDept] = useState<Department | null>(null)
  const [editDeptName, setEditDeptName] = useState('')
  const [editDeptCode, setEditDeptCode] = useState('')
  const [editDeptCampusId, setEditDeptCampusId] = useState('')
  const [updatingDept, setUpdatingDept] = useState(false)

  const [deleteDept, setDeleteDept] = useState<Department | null>(null)
  const [deletingDept, setDeletingDept] = useState(false)

  // ── HOD Assignment state ──
  const [departmentsWithHods, setDepartmentsWithHods] = useState<DepartmentWithHod[]>([])
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [loadingHods, setLoadingHods] = useState(false)
  const [hodError, setHodError] = useState('')
  const [hodSuccess, setHodSuccess] = useState('')

  const [selectedDeptForHod, setSelectedDeptForHod] = useState<DepartmentWithHod | null>(null)
  const [selectedFacultyId, setSelectedFacultyId] = useState('')
  const [newHodEmail, setNewHodEmail] = useState('')
  const [newHodPassword, setNewHodPassword] = useState('')
  const [savingHod, setSavingHod] = useState(false)

  // Logout state
  const [loggingOut, setLoggingOut] = useState(false)

  // ── Auth guard ──
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'superadmin') {
        router.push(ROLE_DASHBOARD_MAP[session.user.role] ?? '/login')
      }
    }
  }, [status, session, router])

  // ── Fetch on mount ──
  useEffect(() => {
    fetchCampuses()
  }, [])

  useEffect(() => {
    if (activeTab === 'departments') fetchDepartments()
    if (activeTab === 'hods') fetchHodsData()
  }, [activeTab])

  // Auto-filter departments when campus filter changes (only on departments tab)
  useEffect(() => {
    if (activeTab !== 'departments') return
    fetchDepartments()
  }, [filterCampusId])

  // Pre-fill HOD email when teaching staff is selected
  useEffect(() => {
    if (selectedFacultyId) {
      const selectedFaculty = facultyList.find(f => f._id === selectedFacultyId)
      if (selectedFaculty) {
        setNewHodEmail(selectedFaculty.email)
      }
    } else {
      setNewHodEmail('')
    }
  }, [selectedFacultyId, facultyList])

  // ══════════════════════════════════════════════════════════════════════════
  // CAMPUS FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════

  async function fetchCampuses() {
    setLoadingCampuses(true)
    setCampusError('')
    const res = await fetch('/api/superadmin/campus')
    const data = await res.json()
    if (!res.ok) setCampusError(data.error ?? 'Failed to fetch campuses')
    else setCampuses(data)
    setLoadingCampuses(false)
  }

  async function handleAddCampus() {
    if (!campusName.trim() || !campusCode.trim()) {
      setCampusError('Name and code are required')
      return
    }
    setSavingCampus(true)
    setCampusError('')
    const res = await fetch('/api/superadmin/campus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: campusName.trim(), code: campusCode.trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCampusError(data.error ?? 'Failed to add campus')
    } else {
      setCampusSuccess('Campus added successfully')
      setShowAddCampus(false)
      setCampusName('')
      setCampusCode('')
      fetchCampuses()
    }
    setSavingCampus(false)
  }

  async function handleUpdateCampus() {
    if (!editCampus) return
    if (!editCampusName.trim() || !editCampusCode.trim()) {
      setCampusError('Name and code are required')
      return
    }
    setUpdatingCampus(true)
    setCampusError('')
    const res = await fetch('/api/superadmin/campus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editCampus._id,
        name: editCampusName.trim(),
        code: editCampusCode.trim(),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCampusError(data.error ?? 'Failed to update campus')
    } else {
      setCampusSuccess('Campus updated successfully')
      setEditCampus(null)
      fetchCampuses()
    }
    setUpdatingCampus(false)
  }

  async function handleDeleteCampus() {
    if (!deleteCampus) return
    setDeletingCampus(true)
    const res = await fetch('/api/superadmin/campus', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteCampus._id }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCampusError(data.error ?? 'Failed to delete campus')
    } else {
      setCampusSuccess('Campus deleted successfully')
      setDeleteCampus(null)
      fetchCampuses()
    }
    setDeletingCampus(false)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DEPARTMENT FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════

  async function fetchDepartments() {
    setLoadingDepts(true)
    setDeptError('')
    const params = filterCampusId ? `?campus_id=${filterCampusId}` : ''
    const res = await fetch(`/api/superadmin/departments${params}`)
    const data = await res.json()
    if (!res.ok) setDeptError(data.error ?? 'Failed to fetch departments')
    else setDepartments(data)
    setLoadingDepts(false)
  }

  async function handleAddDept() {
    if (!deptName.trim() || !deptCode.trim() || !deptCampusId) {
      setDeptError('Name, code and campus are required')
      return
    }
    setSavingDept(true)
    setDeptError('')
    const res = await fetch('/api/superadmin/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: deptName.trim(),
        code: deptCode.trim(),
        campus_id: deptCampusId,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setDeptError(data.error ?? 'Failed to add department')
    } else {
      setDeptSuccess('Department added successfully')
      setShowAddDept(false)
      setDeptName('')
      setDeptCode('')
      setDeptCampusId('')
      fetchDepartments()
    }
    setSavingDept(false)
  }

  async function handleUpdateDept() {
    if (!editDept) return
    if (!editDeptName.trim() || !editDeptCode.trim() || !editDeptCampusId) {
      setDeptError('Name, code and campus are required')
      return
    }
    setUpdatingDept(true)
    setDeptError('')
    const res = await fetch('/api/superadmin/departments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editDept._id,
        name: editDeptName.trim(),
        code: editDeptCode.trim(),
        campus_id: editDeptCampusId,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setDeptError(data.error ?? 'Failed to update department')
    } else {
      setDeptSuccess('Department updated successfully')
      setEditDept(null)
      fetchDepartments()
    }
    setUpdatingDept(false)
  }

  async function handleDeleteDept() {
    if (!deleteDept) return
    setDeletingDept(true)
    const res = await fetch('/api/superadmin/departments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteDept._id }),
    })
    const data = await res.json()
    if (!res.ok) {
      setDeptError(data.error ?? 'Failed to delete department')
    } else {
      setDeptSuccess('Department deleted successfully')
      setDeleteDept(null)
      fetchDepartments()
    }
    setDeletingDept(false)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HOD FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════

  async function fetchHodsData() {
    setLoadingHods(true)
    setHodError('')
    const res = await fetch('/api/superadmin/hod')
    const data = await res.json()
    if (!res.ok) {
      setHodError(data.error ?? 'Failed to fetch HOD info')
    } else {
      setDepartmentsWithHods(data.departments)
      setFacultyList(data.faculty)
    }
    setLoadingHods(false)
  }

  async function handleAssignHod() {
    if (!selectedDeptForHod) return

    if (!selectedFacultyId) {
      setHodError('Please select a faculty member')
      return
    }

    if (!newHodEmail.trim() || !newHodPassword.trim()) {
      setHodError('HOD Email and Password are required')
      return
    }

    setSavingHod(true)
    setHodError('')
    setHodSuccess('')

    const payload = {
      department_id: selectedDeptForHod._id,
      user_id: selectedFacultyId,
      email: newHodEmail.trim(),
      password: newHodPassword.trim()
    }

    const res = await fetch('/api/superadmin/hod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) {
      setHodError(data.error ?? 'Failed to assign HOD')
    } else {
      setHodSuccess('HOD assigned successfully')
      setSelectedDeptForHod(null)
      setSelectedFacultyId('')
      setNewHodEmail('')
      setNewHodPassword('')
      fetchHodsData()
    }
    setSavingHod(false)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await signOut({ redirect: false })
    router.push('/login')
  }

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'superadmin')) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    )
  }

  const adminName = session?.user?.name ?? 'Super Admin'

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className={styles.pageWrapper}>

      {/* ── Top Bar ── */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.logoSmall}>
            <Image src="/logo.png" alt="KU" width={28} height={28} />
          </div>
          <div>
            <p className={styles.topBarTitle}>FYIMP Portal</p>
            <p className={styles.topBarSubtitle}>Superadmin Dashboard</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out…' : 'Logout'}
        </button>
      </div>

      {/* ── Info Card ── */}
      <div className={styles.infoCard}>
        <p className={styles.adminName}>{adminName}</p>
        <div className={styles.adminDetails}>
          <span className={`${styles.detailBadge} ${styles.roleBadge}`}>
            Super Admin
          </span>
          <span className={styles.detailBadge}>
            {campuses.length} {campuses.length === 1 ? 'Campus' : 'Campuses'}
          </span>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'campus' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('campus')}
        >
          🏛️ Campuses
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'departments' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          🏫 Departments
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'hods' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('hods')}
        >
          🎓 HOD Assignment
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className={styles.mainContent}>

        {/* ════════════════════════════════════
            TAB — CAMPUSES
        ════════════════════════════════════ */}
        {activeTab === 'campus' && (
          <>
            {campusError && <div className={styles.errorBanner}>{campusError}</div>}
            {campusSuccess && (
              <div className={styles.successBanner}>✓ {campusSuccess}</div>
            )}

            <div className={styles.sectionHeader}>
              <p className={styles.sectionTitle}>
                All Campuses ({campuses.length})
              </p>
              <button
                className={styles.addBtn}
                onClick={() => {
                  setShowAddCampus(true)
                  setCampusError('')
                  setCampusSuccess('')
                }}
              >
                + Add Campus
              </button>
            </div>

            <div className={styles.tableWrapper}>
              {loadingCampuses ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <p className={styles.loadingText}>Loading campuses...</p>
                </div>
              ) : campuses.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🏛️</div>
                  <p className={styles.emptyTitle}>No campuses yet</p>
                  <p className={styles.emptySubtitle}>
                    Add your first campus to get started.
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr>
                      <th>#</th>
                      <th>Campus Name</th>
                      <th>Code</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campuses.map((campus, i) => (
                      <tr key={campus._id} className={styles.tableRow}>
                        <td>{i + 1}</td>
                        <td className={styles.nameCell}>{campus.name}</td>
                        <td>
                          <span className={styles.codeBadge}>{campus.code}</span>
                        </td>
                        <td className={styles.dateCell}>
                          {new Date(campus.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.editBtn}
                              onClick={() => {
                                setEditCampus(campus)
                                setEditCampusName(campus.name)
                                setEditCampusCode(campus.code)
                                setCampusError('')
                                setCampusSuccess('')
                              }}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => {
                                setDeleteCampus(campus)
                                setCampusError('')
                                setCampusSuccess('')
                              }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════
            TAB — DEPARTMENTS
        ════════════════════════════════════ */}
        {activeTab === 'departments' && (
          <>
            {deptError && <div className={styles.errorBanner}>{deptError}</div>}
            {deptSuccess && (
              <div className={styles.successBanner}>✓ {deptSuccess}</div>
            )}

            {/* Filter + Add row */}
            <div className={styles.filterRow}>
              <select
                className={styles.filterSelect}
                value={filterCampusId}
                onChange={e => setFilterCampusId(e.target.value)}
              >
                <option value="">All Campuses</option>
                {campuses.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              {loadingDepts && <span style={{ fontSize: '0.72rem', color: '#9ba1ab' }}>Filtering…</span>}
              <button
                className={styles.addBtn}
                onClick={() => {
                  setShowAddDept(true)
                  setDeptError('')
                  setDeptSuccess('')
                }}
              >
                + Add Dept
              </button>
            </div>

            <div className={styles.sectionHeader}>
              <p className={styles.sectionTitle}>
                {filterCampusId
                  ? `Departments — ${campuses.find(c => c._id === filterCampusId)?.name}`
                  : `All Departments (${departments.length})`}
              </p>
            </div>

            <div className={styles.tableWrapper}>
              {loadingDepts ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <p className={styles.loadingText}>Loading departments...</p>
                </div>
              ) : departments.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🏫</div>
                  <p className={styles.emptyTitle}>No departments found</p>
                  <p className={styles.emptySubtitle}>
                    {filterCampusId
                      ? 'No departments for this campus yet.'
                      : 'Add your first department to get started.'}
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr>
                      <th>#</th>
                      <th>Department Name</th>
                      <th>Code</th>
                      <th>Campus</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept, i) => (
                      <tr key={dept._id} className={styles.tableRow}>
                        <td>{i + 1}</td>
                        <td className={styles.nameCell}>{dept.name}</td>
                        <td>
                          <span className={styles.codeBadge}>{dept.code}</span>
                        </td>
                        <td className={styles.campusCell}>
                          {dept.campus_name ??
                            campuses.find(c => c._id === dept.campus_id)?.name ??
                            '—'}
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.editBtn}
                              onClick={() => {
                                setEditDept(dept)
                                setEditDeptName(dept.name)
                                setEditDeptCode(dept.code)
                                setEditDeptCampusId(dept.campus_id)
                                setDeptError('')
                                setDeptSuccess('')
                              }}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => {
                                setDeleteDept(dept)
                                setDeptError('')
                                setDeptSuccess('')
                              }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════
            TAB — HOD ASSIGNMENT
        ════════════════════════════════════ */}
        {activeTab === 'hods' && (
          <>
            {hodError && <div className={styles.errorBanner}>{hodError}</div>}
            {hodSuccess && (
              <div className={styles.successBanner}>✓ {hodSuccess}</div>
            )}

            <div className={styles.sectionHeader}>
              <p className={styles.sectionTitle}>
                HOD Assignment ({departmentsWithHods.length} Departments)
              </p>
            </div>

            <div className={styles.tableWrapper}>
              {loadingHods ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <p className={styles.loadingText}>Loading departments & HODs...</p>
                </div>
              ) : departmentsWithHods.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🎓</div>
                  <p className={styles.emptyTitle}>No departments found</p>
                  <p className={styles.emptySubtitle}>
                    Add departments first before assigning HODs.
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr>
                      <th>#</th>
                      <th>Department</th>
                      <th>Code</th>
                      <th>Current HOD</th>
                      <th>HOD Email</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentsWithHods.map((dept, i) => (
                      <tr key={dept._id} className={styles.tableRow}>
                        <td>{i + 1}</td>
                        <td className={styles.nameCell}>{dept.name}</td>
                        <td>
                          <span className={styles.codeBadge}>{dept.code}</span>
                        </td>
                        <td className={styles.nameCell} style={{ fontWeight: dept.hod ? '600' : 'normal', color: dept.hod ? '#fff' : '#888' }}>
                          {dept.hod ? dept.hod.full_name : '⚠️ Not Assigned'}
                        </td>
                        <td style={{ color: dept.hod ? '#9ba1ab' : '#555' }}>
                          {dept.hod ? dept.hod.email : '—'}
                        </td>
                        <td>
                          <button
                            className={styles.addBtn}
                            onClick={() => {
                              setSelectedDeptForHod(dept)
                              // Find if current HOD is in facultyList and pre-select them
                              const currentHodFaculty = dept.hod ? facultyList.find(f => f.email === dept.hod?.email) : null
                              if (currentHodFaculty) {
                                setSelectedFacultyId(currentHodFaculty._id)
                                setNewHodEmail(currentHodFaculty.email)
                              } else {
                                setSelectedFacultyId('')
                                setNewHodEmail('')
                              }
                              setNewHodPassword('')
                              setHodError('')
                              setHodSuccess('')
                            }}
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Assign HOD
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODALS — CAMPUS
      ════════════════════════════════════════════════════════════════════ */}

      {/* Add Campus */}
      {showAddCampus && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Add Campus</h3>
            <p className={styles.modalSubtitle}>
              Create a new university campus.
            </p>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Campus Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Main Campus"
                  value={campusName}
                  onChange={e => setCampusName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Campus Code *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. MAIN"
                  value={campusCode}
                  onChange={e => setCampusCode(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => {
                  setShowAddCampus(false)
                  setCampusName('')
                  setCampusCode('')
                }}
                disabled={savingCampus}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleAddCampus}
                disabled={savingCampus}
              >
                {savingCampus ? 'Adding...' : 'Add Campus →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Campus */}
      {editCampus && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Edit Campus</h3>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Campus Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editCampusName}
                  onChange={e => setEditCampusName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Campus Code *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editCampusCode}
                  onChange={e => setEditCampusCode(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setEditCampus(null)}
                disabled={updatingCampus}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleUpdateCampus}
                disabled={updatingCampus}
              >
                {updatingCampus ? 'Saving...' : 'Save Changes →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Campus */}
      {deleteCampus && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Delete Campus</h3>
            <p className={styles.modalSubtitle}>
              Are you sure you want to delete{' '}
              <strong>{deleteCampus.name}</strong>?{' '}
              This will also affect all departments under this campus.
              This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setDeleteCampus(null)}
                disabled={deletingCampus}
              >
                Cancel
              </button>
              <button
                className={styles.modalDeleteBtn}
                onClick={handleDeleteCampus}
                disabled={deletingCampus}
              >
                {deletingCampus ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODALS — DEPARTMENT
      ════════════════════════════════════════════════════════════════════ */}

      {/* Add Department */}
      {showAddDept && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Add Department</h3>
            <p className={styles.modalSubtitle}>
              Create a new department under a campus.
            </p>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Department Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Mathematical Sciences"
                  value={deptName}
                  onChange={e => setDeptName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Department Code *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. MAT"
                  value={deptCode}
                  onChange={e => setDeptCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Campus *</label>
                <select
                  className={styles.input}
                  value={deptCampusId}
                  onChange={e => setDeptCampusId(e.target.value)}
                >
                  <option value="">— Select Campus —</option>
                  {campuses.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => {
                  setShowAddDept(false)
                  setDeptName('')
                  setDeptCode('')
                  setDeptCampusId('')
                }}
                disabled={savingDept}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleAddDept}
                disabled={savingDept}
              >
                {savingDept ? 'Adding...' : 'Add Department →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department */}
      {editDept && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Edit Department</h3>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Department Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editDeptName}
                  onChange={e => setEditDeptName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Department Code *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editDeptCode}
                  onChange={e => setEditDeptCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Campus *</label>
                <select
                  className={styles.input}
                  value={editDeptCampusId}
                  onChange={e => setEditDeptCampusId(e.target.value)}
                >
                  <option value="">— Select Campus —</option>
                  {campuses.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setEditDept(null)}
                disabled={updatingDept}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleUpdateDept}
                disabled={updatingDept}
              >
                {updatingDept ? 'Saving...' : 'Save Changes →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Department */}
      {deleteDept && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Delete Department</h3>
            <p className={styles.modalSubtitle}>
              Are you sure you want to delete{' '}
              <strong>{deleteDept.name}</strong>?{' '}
              This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setDeleteDept(null)}
                disabled={deletingDept}
              >
                Cancel
              </button>
              <button
                className={styles.modalDeleteBtn}
                onClick={handleDeleteDept}
                disabled={deletingDept}
              >
                {deletingDept ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODALS — HOD ASSIGNMENT
      ════════════════════════════════════════════════════════════════════ */}

      {selectedDeptForHod && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Assign HOD</h3>
            <p className={styles.modalSubtitle}>
              Assign a HOD for <strong>{selectedDeptForHod.name}</strong> ({selectedDeptForHod.code}).
            </p>

            {/* Error in modal */}
            {hodError && <div className={styles.errorBanner} style={{ margin: '0.5rem 0' }}>{hodError}</div>}

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Select Teaching Staff *</label>
                <select
                  className={styles.input}
                  value={selectedFacultyId}
                  onChange={e => setSelectedFacultyId(e.target.value)}
                >
                  <option value="">— Select Member —</option>
                  {facultyList
                    .filter(f => f.role === 'teaching_staff' || (selectedDeptForHod.hod && f.email === selectedDeptForHod.hod.email))
                    .map(f => (
                      <option key={f._id} value={f._id}>
                        {f.full_name} ({f.email}) {f.role === 'hod' ? '(Current HOD)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>HOD Email Address *</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="e.g. hod.maths@kannuruniversity.ac.in"
                  value={newHodEmail}
                  onChange={e => setNewHodEmail(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>HOD Temporary Password *</label>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={newHodPassword}
                  onChange={e => setNewHodPassword(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setSelectedDeptForHod(null)}
                disabled={savingHod}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleAssignHod}
                disabled={savingHod}
              >
                {savingHod ? 'Saving...' : 'Assign HOD →'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
