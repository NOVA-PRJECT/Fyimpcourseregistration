'use client'

import { useState, useEffect } from 'react'
import styles from './hod-dashboard.module.css'

const RULES = [
  { value: '', label: '— Empty slot —' },
  { value: 'FIXED', label: 'FIXED — Specific course' },
  { value: 'DEPT_RESTRICTED', label: 'DEPT_RESTRICTED — From specific dept (DSC/DSE)' },
  { value: 'EXCLUDE_DEPT', label: 'EXCLUDE_DEPT — Exclude specific dept (DSC/DSE)' },
  { value: 'POOL_RESTRICTED', label: 'POOL_RESTRICTED — Own dept pool by tag' },
  { value: 'GLOBAL_BASKET', label: 'GLOBAL_BASKET — Other depts pool by tag' },
]

interface SlotData {
  slot: number
  rule: string
  target: string
  name: string
}

export default function BlueprintTab({ view = 'blueprint' }: { view?: 'blueprint' | 'courses' }) {
  const [semester, setSemester] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [minCredits, setMinCredits] = useState<number | ''>(18)
  const [maxCredits, setMaxCredits] = useState<number | ''>(26)
  const [slots, setSlots] = useState<SlotData[]>(
    Array.from({ length: 6 }, (_, i) => ({
      slot: i + 1, rule: '', target: '', name: ''
    }))
  )

  // New state variables for pickers
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([])
  const [fixedSearch, setFixedSearch] = useState<Record<number, string>>({})
  const [fixedOpen, setFixedOpen] = useState<Record<number, boolean>>({})

  // Courses state
  const [courses, setCourses] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [editCourse, setEditCourse] = useState<any | null>(null)
  const [deleteCourse, setDeleteCourse] = useState<any | null>(null)
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [courseCredits, setCourseCredits] = useState<number | '' | null>(null)
  const [courseCategory, setCourseCategory] = useState<string | null>(null)
  const [courseTag, setCourseTag] = useState('')
  const [savingCourse, setSavingCourse] = useState(false)
  const [deletingCourse, setDeletingCourse] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)

  // Fetch on mount
  useEffect(() => {
    fetchBlueprint(1)
    fetchDepartmentsList()
  }, [])

  async function fetchDepartmentsList() {
    try {
      const res = await fetch('/api/hod/departments')
      const data = await res.json()
      if (res.ok) {
        setDepartments(data)
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  async function fetchBlueprint(sem: number = semester) {
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await fetch(`/api/hod/blueprint?semester=${sem}`)
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to fetch blueprint')
      setLoading(false)
      return
    }

    if (data) {
      setMinCredits(data.min_credits ?? 18)
      setMaxCredits(data.max_credits ?? 26)
      setSlots(Array.from({ length: 6 }, (_, i) => ({
        slot: i + 1,
        rule: data[`slot_${i + 1}_rule`] ?? '',
        target: data[`slot_${i + 1}_target`] ?? '',
        name: data[`slot_${i + 1}_name`] ?? '',
      })))
    } else {
      // No blueprint yet — reset to empty
      setSlots(Array.from({ length: 6 }, (_, i) => ({
        slot: i + 1, rule: '', target: '', name: ''
      })))
    }

    await fetchCourses(sem)
    setLoading(false)
  }

  async function fetchCourses(sem: number = semester) {
    setLoadingCourses(true)
    const res = await fetch(`/api/hod/courses?semester=${sem}`)
    const data = await res.json()
    if (res.ok) setCourses(data)
    setLoadingCourses(false)
  }

  function updateSlot(slotNum: number, field: keyof SlotData, value: string) {
    setSlots(prev => prev.map(s =>
      s.slot === slotNum ? { ...s, [field]: value } : s
    ))
  }

  async function handleSaveBlueprint() {
    if (minCredits === '' || maxCredits === '') {
      setError('Min and Max credits are required')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/hod/blueprint', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semester, min_credits: minCredits, max_credits: maxCredits, slots }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Failed to save blueprint') }
    else {
      setSuccess(data.message)
      setTimeout(() => setSuccess(''), 1000)
    }
    setSaving(false)
  }

  async function handleSaveCourse() {
    if (!courseCode.trim()) { setError('Course code is required'); return }
    if (!courseTitle.trim()) { setError('Course title is required'); return }
    if (courseCredits === null || courseCredits === '') { setError('Credits are required'); return }
    if (!courseCategory) { setError('Category is required'); return }

    const needTag = ['MDC', 'VAC', 'SEC', 'AEC'].includes(courseCategory)
    if (needTag && !courseTag.trim()) {
      setError(`Tag is required for category ${courseCategory}`)
      return
    }

    setSavingCourse(true)
    setError('')

    const isEdit = !!editCourse
    const res = await fetch('/api/hod/courses', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit
        ? { id: editCourse.id, course_code: courseCode.trim().toUpperCase(), title: courseTitle.trim(), credits: courseCredits, category: courseCategory, tag: courseTag.trim() }
        : { course_code: courseCode.trim().toUpperCase(), title: courseTitle.trim(), semester, credits: courseCredits, category: courseCategory, tag: courseTag.trim() }
      ),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Failed to save course') }
    else {
      setSuccess(data.message)
      setTimeout(() => setSuccess(''), 1000)
      setShowAddCourse(false)
      setEditCourse(null)
      setCourseCode(''); setCourseTitle(''); setCourseCredits(null); setCourseCategory(null); setCourseTag('')
      fetchCourses()
    }
    setSavingCourse(false)
  }

  async function handleDeleteCourse() {
    if (!deleteCourse) return
    setDeletingCourse(true)
    const res = await fetch('/api/hod/courses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: deleteCourse.id }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to delete course') }
    else {
      setSuccess(data.message)
      setTimeout(() => setSuccess(''), 1000)
      setDeleteCourse(null)
      fetchCourses()
    }
    setDeletingCourse(false)
  }

  return (
    <>
      {success && (
        <div className={styles.successModalOverlay} onClick={() => setSuccess('')}>
          <div className={styles.successModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.successModalIcon}>✓</div>
            <p className={styles.successModalText}>{success}</p>
            <button className={styles.successModalClose} onClick={() => setSuccess('')}>✕</button>
          </div>
        </div>
      )}

      {/* Semester Selector */}
      <div className={styles.semesterRow}>
        <span className={styles.semesterLabel}><b>Blueprint For Semester :</b></span>
        <select className={styles.semesterSelect} value={semester}
          onChange={e => {
            const nextSem = Number(e.target.value)
            setSemester(nextSem)
            fetchBlueprint(nextSem)
          }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
            <option key={s} value={s}>Semester {s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading Semester {semester} data...</p>
        </div>
      ) : (
        <>
          {/* ── BLUEPRINT EDITOR ── */}
          {view === 'blueprint' && (
            <>

              {/* Credits */}
              <div className={styles.creditsRow}>
                <div className={styles.creditField}>
                  <label className={styles.label}>Min Credits</label>
                  <input type="number" className={styles.input}
                    value={minCredits}
                    onChange={e => {
                      const val = e.target.value
                      setMinCredits(val === '' ? '' : Number(val))
                    }} />
                </div>
                <div className={styles.creditField}>
                  <label className={styles.label}>Max Credits</label>
                  <input type="number" className={styles.input}
                    value={maxCredits}
                    onChange={e => {
                      const val = e.target.value
                      setMaxCredits(val === '' ? '' : Number(val))
                    }} />
                </div>
              </div>

              {/* Slot Editors */}
              <div className={styles.slotsEditorContainer}>
                {slots.map(slot => (
                  <div key={slot.slot} className={styles.slotEditorCard}>
                    <p className={styles.slotEditorTitle}>Paper {slot.slot}</p>

                    <div className={styles.fieldGroup}>
                      <div className={styles.field}>
                        <label className={styles.label}>Paper Name</label>
                        <input type="text" className={styles.input}
                          placeholder="e.g. Major 1, MDC, Elective"
                          value={slot.name}
                          onChange={e => updateSlot(slot.slot, 'name', e.target.value)} />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Rule</label>
                        <select className={styles.input} value={slot.rule}
                          onChange={e => {
                            const newRule = e.target.value
                            let newTarget = ''
                            if (newRule === 'POOL_RESTRICTED') {
                              newTarget = 'POOL-'
                            }
                            updateSlot(slot.slot, 'rule', newRule)
                            updateSlot(slot.slot, 'target', newTarget)
                          }}>
                          {RULES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      {slot.rule && (
                        <div className={styles.field} style={{ position: 'relative' }}>
                          <label className={styles.label}>
                            Target {slot.rule === 'FIXED' ? '(Course Code)' :
                              slot.rule === 'DEPT_RESTRICTED' || slot.rule === 'EXCLUDE_DEPT' ? '(Departments)' :
                                '(Tag e.g. POOL-A, MDC-1)'}
                          </label>
                          {slot.rule === 'DEPT_RESTRICTED' || slot.rule === 'EXCLUDE_DEPT' ? (
                            <div className={styles.checkboxGroup} style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              border: '1px solid #dde1e7',
                              borderRadius: '0.4rem',
                              background: '#ffffff',
                              maxHeight: '120px',
                              overflowY: 'auto'
                            }}>
                              {departments.map(d => {
                                const selectedCodes = slot.target ? slot.target.split(',').map(c => c.trim()) : [];
                                const isChecked = selectedCodes.includes(d.code);
                                return (
                                  <label key={d.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid #f0f2f5',
                                    borderRadius: '3px',
                                    background: isChecked ? '#e6f0fa' : '#fafafa'
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e => {
                                        let newCodes;
                                        if (e.target.checked) {
                                          newCodes = [...selectedCodes, d.code];
                                        } else {
                                          newCodes = selectedCodes.filter(c => c !== d.code);
                                        }
                                        updateSlot(slot.slot, 'target', newCodes.join(','));
                                      }}
                                    />
                                    {d.name} ({d.code})
                                  </label>
                                );
                              })}
                            </div>
                          ) : slot.rule === 'FIXED' ? (
                            <div style={{ position: 'relative' }}>
                              <input type="text" className={styles.input}
                                placeholder="Search & select course..."
                                value={
                                  fixedOpen[slot.slot]
                                    ? (fixedSearch[slot.slot] ?? '')
                                    : (() => {
                                        const course = courses.find(c => c.course_code === slot.target)
                                        return course ? `${course.course_code} — ${course.title}` : slot.target
                                      })()
                                }
                                onFocus={() => {
                                  setFixedOpen(prev => ({ ...prev, [slot.slot]: true }))
                                  setFixedSearch(prev => ({ ...prev, [slot.slot]: '' }))
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setFixedOpen(prev => ({ ...prev, [slot.slot]: false }))
                                  }, 150)
                                }}
                                onChange={e => {
                                  const val = e.target.value
                                  setFixedSearch(prev => ({ ...prev, [slot.slot]: val }))
                                }} />
                              {fixedOpen[slot.slot] && (
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  right: 0,
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #dde1e7',
                                  borderRadius: '0.4rem',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                  maxHeight: '180px',
                                  overflowY: 'auto',
                                  zIndex: 200,
                                }}>
                                  {courses.length === 0 ? (
                                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#9ba1ab' }}>
                                      No courses found for Semester {semester}. Add courses first.
                                    </div>
                                  ) : (() => {
                                    const searchStr = (fixedSearch[slot.slot] ?? '').toLowerCase()
                                    const filtered = courses.filter(c =>
                                      c.course_code.toLowerCase().includes(searchStr) ||
                                      c.title.toLowerCase().includes(searchStr)
                                    )
                                    if (filtered.length === 0) {
                                      return (
                                        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#9ba1ab' }}>
                                          No matching courses
                                        </div>
                                      )
                                    }
                                    return filtered.map(c => (
                                      <div key={c.id}
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => {
                                          updateSlot(slot.slot, 'target', c.course_code)
                                          setFixedOpen(prev => ({ ...prev, [slot.slot]: false }))
                                        }}
                                        style={{
                                          padding: '0.5rem 0.75rem',
                                          fontSize: '0.75rem',
                                          cursor: 'pointer',
                                          borderBottom: '1px solid #f0f2f5',
                                          color: '#002147'
                                        }}
                                        className={styles.comboboxItem}>
                                        <strong style={{ fontFamily: 'monospace' }}>{c.course_code}</strong> — {c.title}
                                      </div>
                                    ))
                                  })()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <input type="text" className={styles.input}
                              placeholder="e.g. POOL-A or MDC-1"
                              value={slot.target}
                              onChange={e => {
                                let val = e.target.value
                                if (slot.rule === 'POOL_RESTRICTED') {
                                  if (!val.startsWith('POOL-')) {
                                    val = 'POOL-'
                                  }
                                }
                                updateSlot(slot.slot, 'target', val)
                              }} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                position: 'sticky',
                bottom: 0,
                background: '#f0f2f5',
                padding: '1rem 0',
                borderTop: '1.5px solid #dde1e7',
                zIndex: 10,
                display: 'flex',
                gap: '0.75rem',
                marginTop: '1.5rem',
              }}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  style={{ flex: 1, background: '#ffffff', color: '#44474e', border: '1.5px solid #dde1e7' }}
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.saveBtn}
                  style={{ flex: 1 }}
                  onClick={() => {
                    if (minCredits === '' || maxCredits === '') {
                      setError('Min and Max credits are required')
                      return
                    }
                    setShowSaveConfirm(true)
                  }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Blueprint →'}
                </button>
              </div>
            </>
          )}

          {/* ── COURSES ── */}
          {view === 'courses' && (
            <>
              <div className={styles.sectionHeader}>
                <p className={styles.sectionTitle}>Courses — Semester {semester}</p>
                <button className={styles.addBtn} onClick={() => {
                  setCourseCode('')
                  setCourseTitle('')
                  setCourseCredits(null)
                  setCourseCategory(null)
                  setCourseTag('')
                  setEditCourse(null)
                  setShowAddCourse(true)
                  setError('')
                  setSuccess('')
                }}>+ Add Course</button>
              </div>

              <div className={styles.tableWrapper}>
                {loadingCourses ? (
                  <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    <p className={styles.loadingText}>Loading courses...</p>
                  </div>
                ) : courses.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📚</div>
                    <p className={styles.emptyTitle}>No courses yet</p>
                    <p className={styles.emptySubtitle}>Add courses for Semester {semester}.</p>
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead className={styles.tableHead}>
                      <tr><th>Code</th><th>Title</th><th>Cr</th><th>Cat</th><th>Tag</th><th></th></tr>
                    </thead>
                    <tbody>
                      {courses.map(course => (
                        <tr key={course.id} className={styles.tableRow}>
                          <td style={{ fontSize: '0.68rem', fontFamily: 'monospace' }}>{course.course_code}</td>
                          <td style={{ fontSize: '0.78rem' }}>{course.title}</td>
                          <td>{course.credits}</td>
                          <td><span className={styles.codeBadge}>{course.category}</span></td>
                          <td style={{ fontSize: '0.68rem', color: '#9ba1ab' }}>{course.tag ?? '—'}</td>
                          <td>
                            <div className={styles.actionBtns}>
                              <button className={styles.editBtn} onClick={() => {
                                setEditCourse(course)
                                setCourseCode(course.course_code)
                                setCourseTitle(course.title)
                                setCourseCredits(course.credits)
                                setCourseCategory(course.category)
                                setCourseTag(course.tag ?? '')
                                setError(''); setSuccess('')
                              }}>✏️</button>
                              <button className={styles.deleteBtn} onClick={() => {
                                setDeleteCourse(course); setError(''); setSuccess('')
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
        </>
      )}

      {view === 'courses' && (
        <>
          {/* Add/Edit Course Modal */}
          {(showAddCourse || editCourse) && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3 className={styles.modalTitle}>{editCourse ? 'Edit Course' : 'Add Course'}</h3>
                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label className={styles.label}>Course Code</label>
                    <input type="text" className={styles.input} placeholder="e.g. KU01DSCMAT101"
                      value={courseCode} onChange={e => setCourseCode(e.target.value.toUpperCase())} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Title</label>
                    <input type="text" className={styles.input} placeholder="e.g. Differential Calculus"
                      value={courseTitle} onChange={e => setCourseTitle(e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Credits</label>
                    <input type="number" className={styles.input} min={1} max={10}
                      value={courseCredits ?? ''}
                      onChange={e => {
                        const val = e.target.value
                        setCourseCredits(val === '' ? null : Number(val))
                      }} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Category</label>
                    <select className={styles.input} value={courseCategory ?? ''} onChange={e => setCourseCategory(e.target.value || null)}>
                      <option value="">— Select Category —</option>
                      {['DSS', 'DSC', 'DSE', 'VAC', 'SEC', 'MDC', 'MOOC', 'AEC', 'INT', 'FWD', 'RPH', 'CIP'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Tag (optional)</label>
                    <input type="text" className={styles.input} placeholder="e.g. POOL-A or MDC-1"
                      value={courseTag} onChange={e => setCourseTag(e.target.value)} />
                  </div>
                </div>
                {error && <div className={styles.errorBanner} style={{ marginBottom: '1rem' }}>{error}</div>}
                <div className={styles.modalActions}>
                  <button className={styles.modalCancelBtn}
                    onClick={() => { setShowAddCourse(false); setEditCourse(null); setCourseCode(''); setCourseTitle(''); setCourseCredits(null); setCourseCategory(null); setCourseTag(''); setError('') }}
                    disabled={savingCourse}>Cancel</button>
                  <button className={styles.modalConfirmBtn} onClick={handleSaveCourse} disabled={savingCourse}>
                    {savingCourse ? 'Saving...' : editCourse ? 'Save Changes →' : 'Add Course →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Course Confirmation */}
          {deleteCourse && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3 className={styles.modalTitle}>Delete Course</h3>
                <p className={styles.modalSubtitle}>
                  Are you sure you want to delete <strong>{deleteCourse.title}</strong>?
                </p>
                {error && <div className={styles.errorBanner} style={{ marginBottom: '1rem' }}>{error}</div>}
                <div className={styles.modalActions}>
                  <button className={styles.modalCancelBtn} onClick={() => { setDeleteCourse(null); setError('') }} disabled={deletingCourse}>Cancel</button>
                  <button className={styles.modalDeleteBtn} onClick={handleDeleteCourse} disabled={deletingCourse}>
                    {deletingCourse ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Discard Changes Confirmation */}
      {showCancelConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Discard Changes</h3>
            <p className={styles.modalSubtitle}>
              Are you sure you want to discard all edits?
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setShowCancelConfirm(false)}>
                No, Keep Editing
              </button>
              <button className={styles.modalConfirmBtn} onClick={() => {
                setShowCancelConfirm(false)
                fetchBlueprint(semester)
              }}>
                Yes, Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Blueprint Confirmation */}
      {showSaveConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Save Blueprint</h3>
            <p className={styles.modalSubtitle}>
              Are you sure you want to save this blueprint? This will update the paper rules and credit requirements for Semester {semester}.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setShowSaveConfirm(false)}>
                Cancel
              </button>
              <button className={styles.modalConfirmBtn} onClick={() => {
                setShowSaveConfirm(false)
                handleSaveBlueprint()
              }}>
                Yes, Save Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
