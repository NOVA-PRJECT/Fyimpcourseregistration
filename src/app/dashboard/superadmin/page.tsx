'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from './superadmin-dashboard.module.css'

type Tab = 'campuses' | 'departments' | 'faculty'

interface Campus {
  id: string
  name: string
  code: string
}

interface Department {
  id: string
  name: string
  code: string
  campus_id: string
  campuses?: { name: string } | null
}

interface Faculty {
  id: string
  full_name: string
  email: string
  role: string
  campus_id: string
  departments: { name: string } | null
  campuses: { name: string }
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('campuses')
  const [adminName, setAdminName] = useState('')
  const [loadingAdmin, setLoadingAdmin] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Campuses state
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [loadingCampuses, setLoadingCampuses] = useState(false)
  const [showAddCampus, setShowAddCampus] = useState(false)
  const [editCampus, setEditCampus] = useState<Campus | null>(null)
  const [deleteCampus, setDeleteCampus] = useState<Campus | null>(null)
  const [campusName, setCampusName] = useState('')
  const [campusCode, setCampusCode] = useState('')
  const [savingCampus, setSavingCampus] = useState(false)
  const [deletingCampus, setDeletingCampus] = useState(false)

  // Departments state
  const [departments, setDepartments] = useState<Department[]>([])
  const [loadingDepts, setLoadingDepts] = useState(false)
  const [showAddDept, setShowAddDept] = useState(false)
  const [editDept, setEditDept] = useState<Department | null>(null)
  const [deleteDept, setDeleteDept] = useState<Department | null>(null)
  const [deptName, setDeptName] = useState('')
  const [deptCode, setDeptCode] = useState('')
  const [deptCampusId, setDeptCampusId] = useState('')
  const [savingDept, setSavingDept] = useState(false)
  const [deletingDept, setDeletingDept] = useState(false)

  // Faculty state
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [loadingFaculty, setLoadingFaculty] = useState(false)
  const [showAddFaculty, setShowAddFaculty] = useState(false)
  const [editFaculty, setEditFaculty] = useState<Faculty | null>(null)   // ← NEW
  const [deleteFaculty, setDeleteFaculty] = useState<Faculty | null>(null)
  const [facultyName, setFacultyName] = useState('')
  const [facultyEmail, setFacultyEmail] = useState('')
  const [facultyPassword, setFacultyPassword] = useState('')
  const [facultyRole, setFacultyRole] = useState<'hod' | 'campus_director' | 'teaching_staff'>('hod')
  const [facultyDeptId, setFacultyDeptId] = useState('')
  const [facultyCampusId, setFacultyCampusId] = useState('')
  const [savingFaculty, setSavingFaculty] = useState(false)
  const [deletingFaculty, setDeletingFaculty] = useState(false)

  // Edit faculty form state (separate from add form)  ← NEW
  const [editFacultyName, setEditFacultyName] = useState('')
  const [editFacultyRole, setEditFacultyRole] = useState<'hod' | 'campus_director' | 'teaching_staff'>('hod')
  const [editFacultyDeptId, setEditFacultyDeptId] = useState('')
  const [editFacultyCampusId, setEditFacultyCampusId] = useState('')
  const [updatingFaculty, setUpdatingFaculty] = useState(false)          // ← NEW
  const [loggingOut, setLoggingOut] = useState(false)


  useEffect(() => {
    async function loadAdmin() {
      const response = await fetch('/api/auth/profile')
      const data = await response.json()
      if (!response.ok) { router.push('/login'); return }
      if (data.profile) setAdminName(data.profile.full_name)
      setLoadingAdmin(false)
    }
    loadAdmin()
  }, [])

  useEffect(() => {
    if (activeTab === 'campuses') fetchCampuses()
    else if (activeTab === 'departments') { fetchDepartments(); fetchCampuses() }
    else if (activeTab === 'faculty') { fetchFaculty(); fetchCampuses(); fetchDepartments() }
  }, [activeTab])

  function clearMessages() { setError(''); setSuccess('') }

  // ── Campus Functions ──
  async function fetchCampuses() {
    setLoadingCampuses(true)
    const res = await fetch('/api/admin/campuses')
    const data = await res.json()
    if (res.ok) setCampuses(data)
    setLoadingCampuses(false)
  }

  async function handleSaveCampus() {
    if (!campusName || !campusCode) { setError('Name and code are required'); return }
    setSavingCampus(true)
    clearMessages()
    const isEdit = !!editCampus
    const res = await fetch('/api/admin/campuses', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit
        ? { id: editCampus.id, name: campusName, code: campusCode }
        : { name: campusName, code: campusCode }
      ),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to save campus') }
    else {
      setSuccess(data.message)
      setShowAddCampus(false)
      setEditCampus(null)
      setCampusName(''); setCampusCode('')
      fetchCampuses()
    }
    setSavingCampus(false)
  }

  async function handleDeleteCampus() {
    if (!deleteCampus) return
    setDeletingCampus(true)
    const res = await fetch('/api/admin/campuses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campus_id: deleteCampus.id }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to delete campus') }
    else { setSuccess(data.message); setDeleteCampus(null); fetchCampuses() }
    setDeletingCampus(false)
  }

  // ── Department Functions ──
  async function fetchDepartments() {
    setLoadingDepts(true)
    const res = await fetch('/api/admin/departments')
    const data = await res.json()
    if (res.ok) setDepartments(data)
    setLoadingDepts(false)
  }

  async function handleSaveDept() {
    if (!deptName || !deptCode || !deptCampusId) { setError('All fields are required'); return }
    setSavingDept(true)
    clearMessages()
    const isEdit = !!editDept
    const res = await fetch('/api/admin/departments', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit
        ? { id: editDept.id, name: deptName, code: deptCode }
        : { name: deptName, code: deptCode, campus_id: deptCampusId }
      ),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to save department') }
    else {
      setSuccess(data.message)
      setShowAddDept(false)
      setEditDept(null)
      setDeptName(''); setDeptCode(''); setDeptCampusId('')
      fetchDepartments()
    }
    setSavingDept(false)
  }

  async function handleDeleteDept() {
    if (!deleteDept) return
    setDeletingDept(true)
    const res = await fetch('/api/admin/departments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department_id: deleteDept.id }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to delete department') }
    else { setSuccess(data.message); setDeleteDept(null); fetchDepartments() }
    setDeletingDept(false)
  }

  // ── Faculty Functions ──
  async function fetchFaculty() {
    setLoadingFaculty(true)
    const res = await fetch('/api/admin/faculty-list')
    const data = await res.json()
    if (res.ok) setFaculty(data)
    setLoadingFaculty(false)
  }

  async function handleAddFaculty() {
    if (!facultyName || !facultyEmail || !facultyPassword || !facultyCampusId) {
      setError('All required fields must be filled')
      return
    }
    if (facultyRole === 'hod' && !facultyDeptId) {
      setError('Department is required for HOD')
      return
    }
    setSavingFaculty(true)
    clearMessages()
    const res = await fetch('/api/admin/faculty-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: facultyName,
        email: facultyEmail,
        password: facultyPassword,
        role: facultyRole,
        department_id: facultyRole === 'hod' ? facultyDeptId : undefined,
        campus_id: facultyCampusId,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (data.details && typeof data.details === 'object') {
        const fieldErrors = data.details.fieldErrors || {}
        const formatted = Object.entries(fieldErrors)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
          .join('; ')
        setError(formatted || data.error || 'Failed to add faculty')
      } else {
        setError(data.details ?? data.error ?? 'Failed to add faculty')
      }
    }
    else {
      setSuccess(data.message)
      setShowAddFaculty(false)
      setFacultyName(''); setFacultyEmail(''); setFacultyPassword('')
      setFacultyDeptId(''); setFacultyCampusId('')
      fetchFaculty()
    }
    setSavingFaculty(false)
  }

  // ── NEW: Edit Faculty ──
  function openEditFaculty(f: Faculty) {
    setEditFaculty(f)
    setEditFacultyName(f.full_name)
    setEditFacultyRole(f.role as 'hod' | 'campus_director')
    // L6 fix: Use campus_id directly instead of reverse-lookup by name
    setEditFacultyCampusId(f.campus_id ?? '')
    // Find the dept_id from departments list by matching dept name
    const matchedDept = departments.find(d => d.name === f.departments?.name)
    setEditFacultyDeptId(matchedDept?.id ?? '')
    clearMessages()
  }

  async function handleUpdateFaculty() {
    if (!editFaculty) return
    if (!editFacultyName) { setError('Name is required'); return }
    if (editFacultyRole === 'hod' && !editFacultyDeptId) {
      setError('Department is required for HOD')
      return
    }
    setUpdatingFaculty(true)
    clearMessages()
    const res = await fetch('/api/admin/faculty-list', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editFaculty.id,
        full_name: editFacultyName,
        role: editFacultyRole,
        department_id: editFacultyRole === 'hod' ? editFacultyDeptId : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to update faculty') }
    else {
      setSuccess(data.message)
      setEditFaculty(null)
      setEditFacultyName(''); setEditFacultyRole('hod')
      setEditFacultyDeptId(''); setEditFacultyCampusId('')
      fetchFaculty()
    }
    setUpdatingFaculty(false)
  }

  async function handleDeleteFaculty() {
    if (!deleteFaculty) return
    setDeletingFaculty(true)
    const res = await fetch('/api/admin/faculty-list', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faculty_id: deleteFaculty.id }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to delete faculty') }
    else { setSuccess(data.message); setDeleteFaculty(null); fetchFaculty() }
    setDeletingFaculty(false)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const roleLabel = (role: string) => ({
    hod: 'HOD',
    campus_director: 'Campus Director',
    teaching_staff: 'Teaching Staff',
  }[role] ?? role)

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
            <p className={styles.topBarSubtitle}>Super Admin</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      {/* Info Card */}
      <div className={styles.infoCard}>
        {loadingAdmin ? <div style={{ height: '2.5rem' }} /> : (
          <>
            <p className={styles.adminName}>{adminName || 'Super Admin'}</p>
            <div className={styles.adminDetails}>
              <span className={styles.detailBadge}>⚡ Super Admin</span>
            </div>
          </>
        )}
      </div>

      {/* Tab Bar */}
      <div className={styles.tabBar}>
        {(['campuses', 'departments', 'faculty'] as Tab[]).map(tab => (
          <button
            key={tab}
            className={`${styles.tabBtn} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab(tab); clearMessages() }}
          >
            {tab === 'campuses' ? '🏛️ Campuses' : tab === 'departments' ? '🏫 Departments' : '👤 Faculty'}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {success && <div className={styles.successBanner}>✓ {success}</div>}

        {/* ══ CAMPUSES TAB ══ */}
        {activeTab === 'campuses' && (
          <>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionTitle}>Campuses</p>
              <button className={styles.addBtn} onClick={() => { setShowAddCampus(true); clearMessages() }}>
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
                  <p className={styles.emptySubtitle}>Add your first campus to get started.</p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr><th>#</th><th>Name</th><th>Code</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {campuses.map((campus, i) => (
                      <tr key={campus.id} className={styles.tableRow}>
                        <td>{i + 1}</td>
                        <td>{campus.name}</td>
                        <td><span className={styles.codeBadge}>{campus.code}</span></td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button className={styles.editBtn} onClick={() => {
                              setEditCampus(campus)
                              setCampusName(campus.name)
                              setCampusCode(campus.code)
                              clearMessages()
                            }}>✏️</button>
                            <button className={styles.deleteBtn} onClick={() => {
                              setDeleteCampus(campus); clearMessages()
                            }}>🗑️</button>
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

        {/* ══ DEPARTMENTS TAB ══ */}
        {activeTab === 'departments' && (
          <>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionTitle}>Departments</p>
              <button className={styles.addBtn} onClick={() => { setShowAddDept(true); clearMessages() }}>
                + Add Department
              </button>
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
                  <p className={styles.emptyTitle}>No departments yet</p>
                  <p className={styles.emptySubtitle}>Add campuses first, then add departments.</p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr><th>#</th><th>Name</th><th>Code</th><th>Campus</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {departments.map((dept, i) => (
                      <tr key={dept.id} className={styles.tableRow}>
                        <td>{i + 1}</td>
                        <td>{dept.name}</td>
                        <td><span className={styles.codeBadge}>{dept.code}</span></td>
                        <td>{dept.campuses?.name ?? '—'}</td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button className={styles.editBtn} onClick={() => {
                              setEditDept(dept)
                              setDeptName(dept.name)
                              setDeptCode(dept.code)
                              setDeptCampusId(dept.campus_id)
                              clearMessages()
                            }}>✏️</button>
                            <button className={styles.deleteBtn} onClick={() => {
                              setDeleteDept(dept); clearMessages()
                            }}>🗑️</button>
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

        {/* ══ FACULTY TAB ══ */}
        {activeTab === 'faculty' && (
          <>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionTitle}>Faculty</p>
              <button className={styles.addBtn} onClick={() => { setShowAddFaculty(true); clearMessages() }}>
                + Add Faculty
              </button>
            </div>

            <div className={styles.tableWrapper}>
              {loadingFaculty ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <p className={styles.loadingText}>Loading faculty...</p>
                </div>
              ) : faculty.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>👤</div>
                  <p className={styles.emptyTitle}>No faculty yet</p>
                  <p className={styles.emptySubtitle}>Add faculty members to manage the portal.</p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr><th>#</th><th>Name</th><th>Role</th><th>Dept</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {faculty.map((f, i) => (
                      <tr key={f.id} className={styles.tableRow}>
                        <td>{i + 1}</td>
                        <td>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem' }}>{f.full_name}</p>
                          <p style={{ margin: 0, fontSize: '0.68rem', color: '#9ba1ab' }}>{f.email}</p>
                        </td>
                        <td><span className={styles.rolePill}>{roleLabel(f.role)}</span></td>
                        <td>{f.departments?.name ?? '—'}</td>
                        <td>
                          <div className={styles.actionBtns}>
                            {/* ← NEW edit button */}
                            <button className={styles.editBtn} onClick={() => openEditFaculty(f)}>✏️</button>
                            <button className={styles.deleteBtn} onClick={() => {
                              setDeleteFaculty(f); clearMessages()
                            }}>🗑️</button>
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

      </div>

      {/* ══ MODALS ══ */}

      {/* Add/Edit Campus Modal */}
      {(showAddCampus || editCampus) && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>{editCampus ? 'Edit Campus' : 'Add Campus'}</h3>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Campus Name</label>
                <input type="text" className={styles.input} placeholder="e.g. Kannur University Main Campus"
                  value={campusName} onChange={e => setCampusName(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Campus Code</label>
                <input type="text" className={styles.input} placeholder="e.g. KU"
                  value={campusCode} onChange={e => setCampusCode(e.target.value)} />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn}
                onClick={() => { setShowAddCampus(false); setEditCampus(null); setCampusName(''); setCampusCode('') }}
                disabled={savingCampus}>Cancel</button>
              <button className={styles.modalConfirmBtn} onClick={handleSaveCampus} disabled={savingCampus}>
                {savingCampus ? 'Saving...' : editCampus ? 'Save Changes →' : 'Add Campus →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Department Modal */}
      {(showAddDept || editDept) && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>{editDept ? 'Edit Department' : 'Add Department'}</h3>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Department Name</label>
                <input type="text" className={styles.input} placeholder="e.g. Mathematical Sciences"
                  value={deptName} onChange={e => setDeptName(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Department Code</label>
                <input type="text" className={styles.input} placeholder="e.g. MAT"
                  value={deptCode} onChange={e => setDeptCode(e.target.value)} />
              </div>
              {!editDept && (
                <div className={styles.field}>
                  <label className={styles.label}>Campus</label>
                  <select className={styles.input} value={deptCampusId} onChange={e => setDeptCampusId(e.target.value)}>
                    <option value="">— Select Campus —</option>
                    {campuses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn}
                onClick={() => { setShowAddDept(false); setEditDept(null); setDeptName(''); setDeptCode(''); setDeptCampusId('') }}
                disabled={savingDept}>Cancel</button>
              <button className={styles.modalConfirmBtn} onClick={handleSaveDept} disabled={savingDept}>
                {savingDept ? 'Saving...' : editDept ? 'Save Changes →' : 'Add Department →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Faculty Modal */}
      {showAddFaculty && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Add Faculty</h3>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Full Name</label>
                <input type="text" className={styles.input} placeholder="Dr. Name"
                  value={facultyName} onChange={e => setFacultyName(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input type="email" className={styles.input} placeholder="name@ku.ac.in"
                  value={facultyEmail} onChange={e => setFacultyEmail(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Password</label>
                <input type="password" className={styles.input} placeholder="Min. 8 characters"
                  value={facultyPassword} onChange={e => setFacultyPassword(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Role</label>
                <select className={styles.input} value={facultyRole}
                  onChange={e => setFacultyRole(e.target.value as 'hod' | 'campus_director' | 'teaching_staff')}>
                  <option value="hod">HOD</option>
                  <option value="campus_director">Campus Director</option>
                  <option value="teaching_staff">Teaching Staff</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Campus</label>
                <select className={styles.input} value={facultyCampusId} onChange={e => setFacultyCampusId(e.target.value)}>
                  <option value="">— Select Campus —</option>
                  {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {facultyRole === 'hod' && (
                <div className={styles.field}>
                  <label className={styles.label}>Department</label>
                  <select className={styles.input} value={facultyDeptId} onChange={e => setFacultyDeptId(e.target.value)}>
                    <option value="">— Select Department —</option>
                    {departments
                      .filter(d => !facultyCampusId || d.campus_id === facultyCampusId)
                      .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn}
                onClick={() => {
                  setShowAddFaculty(false)
                  setFacultyName(''); setFacultyEmail(''); setFacultyPassword('')
                  setFacultyDeptId(''); setFacultyCampusId('')
                }}
                disabled={savingFaculty}>Cancel</button>
              <button className={styles.modalConfirmBtn} onClick={handleAddFaculty} disabled={savingFaculty}>
                {savingFaculty ? 'Creating...' : 'Create Account →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW: Edit Faculty Modal ── */}
      {editFaculty && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Edit Faculty</h3>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Full Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Dr. Name"
                  value={editFacultyName}
                  onChange={e => setEditFacultyName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                {/* Email is read-only — Supabase auth email change needs a separate flow */}
                <input
                  type="email"
                  className={styles.input}
                  value={editFaculty.email}
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Role</label>
                <select
                  className={styles.input}
                  value={editFacultyRole}
                  onChange={e => {
                    setEditFacultyRole(e.target.value as 'hod' | 'campus_director' | 'teaching_staff')
                    // Clear dept if switching away from HOD
                    if (e.target.value === 'campus_director') setEditFacultyDeptId('')
                  }}
                >
                  <option value="hod">HOD</option>
                  <option value="campus_director">Campus Director</option>
                  <option value="teaching_staff">Teaching Staff</option>
                </select>
              </div>
              {(editFacultyRole === 'hod' )&& (
                <div className={styles.field}>
                  <label className={styles.label}>Department</label>
                  <select
                    className={styles.input}
                    value={editFacultyDeptId}
                    onChange={e => setEditFacultyDeptId(e.target.value)}
                  >
                    <option value="">— Select Department —</option>
                    {departments
                      .filter(d => !editFacultyCampusId || d.campus_id === editFacultyCampusId)
                      .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => {
                  setEditFaculty(null)
                  setEditFacultyName(''); setEditFacultyRole('hod')
                  setEditFacultyDeptId(''); setEditFacultyCampusId('')
                }}
                disabled={updatingFaculty}
              >Cancel</button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleUpdateFaculty}
                disabled={updatingFaculty}
              >
                {updatingFaculty ? 'Saving...' : 'Save Changes →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Campus Confirmation */}
      {deleteCampus && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Delete Campus</h3>
            <p className={styles.modalSubtitle}>
              ⚠️ This will permanently delete <strong>{deleteCampus.name}</strong> and ALL data under it —
              departments, students, faculty, courses, blueprints and registrations.
              This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setDeleteCampus(null)} disabled={deletingCampus}>Cancel</button>
              <button className={styles.modalDeleteBtn} onClick={handleDeleteCampus} disabled={deletingCampus}>
                {deletingCampus ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Department Confirmation */}
      {deleteDept && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Delete Department</h3>
            <p className={styles.modalSubtitle}>
              ⚠️ This will permanently delete <strong>{deleteDept.name}</strong> and all its students,
              courses, blueprints and registrations. This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setDeleteDept(null)} disabled={deletingDept}>Cancel</button>
              <button className={styles.modalDeleteBtn} onClick={handleDeleteDept} disabled={deletingDept}>
                {deletingDept ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Faculty Confirmation */}
      {deleteFaculty && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Remove Faculty</h3>
            <p className={styles.modalSubtitle}>
              Are you sure you want to remove <strong>{deleteFaculty.full_name}</strong>?
              Their account will be permanently deleted.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setDeleteFaculty(null)} disabled={deletingFaculty}>Cancel</button>
              <button className={styles.modalDeleteBtn} onClick={handleDeleteFaculty} disabled={deletingFaculty}>
                {deletingFaculty ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

