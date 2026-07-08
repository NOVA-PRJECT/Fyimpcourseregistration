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
  const [minCredits, setMinCredits] = useState(18)
  const [maxCredits, setMaxCredits] = useState(26)
  const [slots, setSlots] = useState<SlotData[]>(
    Array.from({ length: 6 }, (_, i) => ({
      slot: i + 1, rule: '', target: '', name: ''
    }))
  )

  // Courses state
  const [courses, setCourses] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [editCourse, setEditCourse] = useState<any | null>(null)
  const [deleteCourse, setDeleteCourse] = useState<any | null>(null)
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [courseCredits, setCourseCredits] = useState(4)
  const [courseCategory, setCourseCategory] = useState('DSC')
  const [courseTag, setCourseTag] = useState('')
  const [savingCourse, setSavingCourse] = useState(false)
  const [deletingCourse, setDeletingCourse] = useState(false)

  // Fetch on mount
  useEffect(() => {
    fetchBlueprint(1)
  }, [])

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
    else { setSuccess(data.message) }
    setSaving(false)
  }

  async function handleSaveCourse() {
    if (!courseCode || !courseTitle) { setError('Code and title are required'); return }
    setSavingCourse(true)
    setError('')

    const isEdit = !!editCourse
    const res = await fetch('/api/hod/courses', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit
        ? { id: editCourse.id, title: courseTitle, credits: courseCredits, category: courseCategory, tag: courseTag }
        : { course_code: courseCode, title: courseTitle, semester, credits: courseCredits, category: courseCategory, tag: courseTag }
      ),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Failed to save course') }
    else {
      setSuccess(data.message)
      setShowAddCourse(false)
      setEditCourse(null)
      setCourseCode(''); setCourseTitle(''); setCourseCredits(4); setCourseCategory('DSC'); setCourseTag('')
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
    else { setSuccess(data.message); setDeleteCourse(null); fetchCourses() }
    setDeletingCourse(false)
  }

  return (
    <>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {success && <div className={styles.successBanner}>✓ {success}</div>}

      {/* Semester Selector */}
      <div className={styles.semesterRow}>
        <span className={styles.semesterLabel}>Semester:</span>
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

      {!loading && (
        <>
          {/* ── BLUEPRINT EDITOR ── */}
          {view === 'blueprint' && (
            <>
              <p className={styles.sectionTitle}>Blueprint — Semester {semester}</p>

              {/* Credits */}
              <div className={styles.creditsRow}>
                <div className={styles.creditField}>
                  <label className={styles.label}>Min Credits</label>
                  <input type="number" className={styles.input}
                    value={minCredits} onChange={e => setMinCredits(Number(e.target.value))} />
                </div>
                <div className={styles.creditField}>
                  <label className={styles.label}>Max Credits</label>
                  <input type="number" className={styles.input}
                    value={maxCredits} onChange={e => setMaxCredits(Number(e.target.value))} />
                </div>
              </div>

              {/* Slot Editors */}
              <div className={styles.slotsEditorContainer}>
                {slots.map(slot => (
                  <div key={slot.slot} className={styles.slotEditorCard}>
                    <p className={styles.slotEditorTitle}>Slot {slot.slot}</p>

                    <div className={styles.fieldGroup}>
                      <div className={styles.field}>
                        <label className={styles.label}>Slot Name</label>
                        <input type="text" className={styles.input}
                          placeholder="e.g. Major 1, MDC, Elective"
                          value={slot.name}
                          onChange={e => updateSlot(slot.slot, 'name', e.target.value)} />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Rule</label>
                        <select className={styles.input} value={slot.rule}
                          onChange={e => updateSlot(slot.slot, 'rule', e.target.value)}>
                          {RULES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      {slot.rule && (
                        <div className={styles.field}>
                          <label className={styles.label}>
                            Target {slot.rule === 'FIXED' ? '(Course Code)' :
                              slot.rule === 'DEPT_RESTRICTED' || slot.rule === 'EXCLUDE_DEPT' ? '(Department Name)' :
                                '(Tag e.g. POOL-A, MDC-1)'}
                          </label>
                          <input type="text" className={styles.input}
                            placeholder={
                              slot.rule === 'FIXED' ? 'e.g. KU01DSCMAT101' :
                                slot.rule === 'DEPT_RESTRICTED' || slot.rule === 'EXCLUDE_DEPT' ? 'e.g. Mathematical Sciences' :
                                  'e.g. POOL-A or MDC-1'
                            }
                            value={slot.target}
                            onChange={e => updateSlot(slot.slot, 'target', e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button className={styles.saveBtn} onClick={handleSaveBlueprint} disabled={saving}>
                {saving ? 'Saving...' : 'Save Blueprint →'}
              </button>
            </>
          )}

          {/* ── COURSES ── */}
          {view === 'courses' && (
            <>
              <div className={styles.sectionHeader}>
                <p className={styles.sectionTitle}>Courses — Semester {semester}</p>
                <button className={styles.addBtn} onClick={() => {
                  setShowAddCourse(true); setError(''); setSuccess('')
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
                  {!editCourse && (
                    <div className={styles.field}>
                      <label className={styles.label}>Course Code</label>
                      <input type="text" className={styles.input} placeholder="e.g. KU01DSCMAT101"
                        value={courseCode} onChange={e => setCourseCode(e.target.value)} />
                    </div>
                  )}
                  <div className={styles.field}>
                    <label className={styles.label}>Title</label>
                    <input type="text" className={styles.input} placeholder="e.g. Differential Calculus"
                      value={courseTitle} onChange={e => setCourseTitle(e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Credits</label>
                    <input type="number" className={styles.input} min={1} max={10}
                      value={courseCredits} onChange={e => setCourseCredits(Number(e.target.value))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Category</label>
                    <select className={styles.input} value={courseCategory} onChange={e => setCourseCategory(e.target.value)}>
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
                <div className={styles.modalActions}>
                  <button className={styles.modalCancelBtn}
                    onClick={() => { setShowAddCourse(false); setEditCourse(null); setCourseCode(''); setCourseTitle(''); setCourseCredits(4); setCourseCategory('DSC'); setCourseTag('') }}
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
                <div className={styles.modalActions}>
                  <button className={styles.modalCancelBtn} onClick={() => setDeleteCourse(null)} disabled={deletingCourse}>Cancel</button>
                  <button className={styles.modalDeleteBtn} onClick={handleDeleteCourse} disabled={deletingCourse}>
                    {deletingCourse ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
