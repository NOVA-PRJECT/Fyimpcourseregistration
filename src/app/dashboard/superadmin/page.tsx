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

type Tab = 'campus' | 'departments'

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

  // ── Auth guard ──
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // ── Fetch on mount ──
  useEffect(() => {
    fetchCampuses()
  }, [])

  useEffect(() => {
    if (activeTab === 'departments') fetchDepartments()
  }, [activeTab])

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
    const res = await fetch(`/api/superadmin/department${params}`)
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
    const res = await fetch('/api/superadmin/department', {
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
    const res = await fetch('/api/superadmin/department', {
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
    const res = await fetch('/api/superadmin/department', {
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

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push('/login')
  }

  if (status === 'loading') {
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
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Logout
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
              <button
                className={styles.fetchBtn}
                onClick={fetchDepartments}
                disabled={loadingDepts}
              >
                {loadingDepts ? 'Loading...' : 'Filter →'}
              </button>
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

    </div>
  )
}
