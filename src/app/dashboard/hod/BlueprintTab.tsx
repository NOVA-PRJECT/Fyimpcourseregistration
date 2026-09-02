'use client'

import { useState, useEffect } from 'react'
import styles from './hod-dashboard.module.css'

const RULES = [
  { value: '', label: '— Empty slot —' },
  { value: 'FIXED', label: 'FIXED — Specific DSC/DSE course from own campus' },
  { value: 'AEC_ELECT', label: 'AEC ELECT — AEC course from all campuses' },
  { value: 'DEPT_RESTRICTED', label: 'DEPT_RESTRICTED — From specific dept (DSC/DSE)' },
  { value: 'EXCLUDE_DEPT', label: 'EXCLUDE_DEPT — Exclude specific dept (DSC/DSE)' },
  { value: 'POOL_RESTRICTED', label: 'POOL_RESTRICTED — Own dept pool by tag' },
  { value: 'GLOBAL_BASKET', label: 'GLOBAL_BASKET — Other depts pool by tag' },
]

interface SlotData {
  rule: string
  target: string
  name: string
}

interface PathwayData {
  id?: string
  name: string
  slots: SlotData[]
}

export default function BlueprintTab({ view = 'blueprint' }: { view?: 'blueprint' | 'courses' }) {
  const [semester, setSemester] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [minCredits, setMinCredits] = useState<number | ''>(0)
  const [maxCredits, setMaxCredits] = useState<number | ''>(0)

  // Pathway state
  const [pathways, setPathways] = useState<PathwayData[]>([
    { name: 'Default', slots: [{ rule: '', target: '', name: '' }] }
  ])
  const [editingPathwayIndex, setEditingPathwayIndex] = useState<number | null>(null)

  // New state variables for pickers
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([])
  const [fixedSearch, setFixedSearch] = useState<Record<string, string>>({})
  const [fixedOpen, setFixedOpen] = useState<Record<string, boolean>>({})

  // Courses state
  const [courses, setCourses] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [editCourse, setEditCourse] = useState<any | null>(null)
  const [deleteCourse, setDeleteCourse] = useState<any | null>(null)
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [courseCredits, setCourseCredits] = useState<number | '' | null>(null)
  const [courseTheoryHours, setCourseTheoryHours] = useState<number | '' | null>(null)
  const [coursePracticalHours, setCoursePracticalHours] = useState<number | '' | null>(null)
  const [courseCategory, setCourseCategory] = useState<string | null>(null)
  const [courseTag, setCourseTag] = useState('')
  const [savingCourse, setSavingCourse] = useState(false)
  const [deletingCourse, setDeletingCourse] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)

  // Parallel groups state
  const [parallelGroups, setParallelGroups] = useState<any[]>([])
  const [loadingParallel, setLoadingParallel] = useState(false)
  const [showNewGroupModal, setShowNewGroupModal] = useState(false)
  const [newGroupLabel, setNewGroupLabel] = useState('')
  const [selectedGroupCourseIds, setSelectedGroupCourseIds] = useState<string[]>([])
  const [savingGroup, setSavingGroup] = useState(false)
  const [addCourseToGroupId, setAddCourseToGroupId] = useState<string | null>(null)
  const [selectedCourseToAdd, setSelectedCourseToAdd] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<any | null>(null)
  const [deletingGroup, setDeletingGroup] = useState(false)

  // Helper to determine credit ranges for each slot
  function getSlotCreditRange(slot: SlotData): { min: number; max: number } {
    if (!slot.rule) return { min: 0, max: 0 }

    if (slot.rule === 'FIXED' || slot.rule === 'AEC_ELECT' || slot.rule === 'CAMPUS_FIXED') {
      const course = courses.find(c => c.course_code === slot.target)
      const cr = course ? course.credits : 0
      return { min: cr, max: cr }
    }

    // Check if we have any matching courses in our department as a proxy
    let matchingCourses: any[] = []
    if (slot.rule === 'POOL_RESTRICTED') {
      matchingCourses = courses.filter(c => c.tag === slot.target)
    } else if (slot.rule === 'GLOBAL_BASKET') {
      matchingCourses = courses.filter(c => c.tag === slot.target)
    } else if (slot.rule === 'DEPT_RESTRICTED' || slot.rule === 'EXCLUDE_DEPT') {
      matchingCourses = courses.filter(c => ['DSC', 'DSE'].includes(c.category))
    }

    if (matchingCourses.length > 0) {
      const credits = matchingCourses.map(c => c.credits)
      return { min: Math.min(...credits), max: Math.max(...credits) }
    }

    // Fallbacks based on standard NEP/FYIMP regulations
    if (slot.rule === 'GLOBAL_BASKET') {
      const tag = (slot.target ?? '').toUpperCase()
      if (tag.includes('MDC')) return { min: 3, max: 3 }
      if (tag.includes('VAC')) return { min: 2, max: 2 }
      if (tag.includes('SEC')) return { min: 2, max: 2 }
      if (tag.includes('AEC')) return { min: 3, max: 3 }
    }

    return { min: 4, max: 4 }
  }

  // Calculate live bounds across all pathways
  function getPathwayCreditRange(pw: PathwayData): { min: number; max: number } {
    let totalMin = 0
    let totalMax = 0
    pw.slots.forEach(s => {
      const { min, max } = getSlotCreditRange(s)
      totalMin += min
      totalMax += max
    })
    return { min: totalMin, max: totalMax }
  }

  // Overall credit bounds (worst-case across all pathways)
  let overallMin = Infinity
  let overallMax = 0
  pathways.forEach(pw => {
    const { min, max } = getPathwayCreditRange(pw)
    if (min < overallMin) overallMin = min
    if (max > overallMax) overallMax = max
  })
  if (overallMin === Infinity) overallMin = 0

  const isImpossible = maxCredits !== '' && pathways.some(pw => {
    const { min } = getPathwayCreditRange(pw)
    return min > Number(maxCredits)
  })

  let warningMessage = ''
  if (isImpossible) {
    const badPathway = pathways.find(pw => {
      const { min } = getPathwayCreditRange(pw)
      return min > Number(maxCredits)
    })
    if (badPathway) {
      const { min } = getPathwayCreditRange(badPathway)
      warningMessage = `Pathway "${badPathway.name}" has a minimum of ${min} credits, exceeding your configured maximum of ${maxCredits}. Students on this pathway will not be able to submit.`
    }
  }

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
      setMinCredits(data.min_credits ?? 0)
      setMaxCredits(data.max_credits ?? 0)

      // Read from pathways JSONB if available, else create default pathway from flat columns
      if (data.pathways && Array.isArray(data.pathways) && data.pathways.length > 0) {
        setPathways(data.pathways.map((p: any) => ({
          id: p.id,
          name: p.name,
          slots: (p.slots || []).map((s: any) => ({
            rule: s.rule ?? '',
            target: s.target ?? '',
            name: s.name ?? '',
          }))
        })))
      } else {
        // Legacy: build single pathway from flat columns
        const flatSlots: SlotData[] = []
        for (let i = 1; i <= 6; i++) {
          const rule = data[`slot_${i}_rule`] ?? ''
          const target = data[`slot_${i}_target`] ?? ''
          const name = data[`slot_${i}_name`] ?? ''
          if (rule) {
            flatSlots.push({ rule, target, name })
          }
        }
        if (flatSlots.length === 0) {
          flatSlots.push({ rule: '', target: '', name: '' })
        }
        setPathways([{ name: 'Default', slots: flatSlots }])
      }
      setEditingPathwayIndex(null)
    } else {
      // No blueprint yet — reset to empty
      setMinCredits(0)
      setMaxCredits(0)
      setPathways([{ name: 'Default', slots: [{ rule: '', target: '', name: '' }] }])
      setEditingPathwayIndex(null)
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
    fetchParallelGroups(sem)
  }

  async function fetchParallelGroups(sem: number = semester) {
    setLoadingParallel(true)
    try {
      const res = await fetch(`/api/timetable/parallel-groups?academicYear=2026-27&semester=${sem}`)
      const data = await res.json()
      if (res.ok) setParallelGroups(data.groups ?? [])
    } catch (err) {
      console.error('Failed to fetch parallel groups:', err)
    } finally {
      setLoadingParallel(false)
    }
  }

  async function handleCreateGroup() {
    if (selectedGroupCourseIds.length < 2) {
      setError('At least 2 courses must be selected for a parallel group')
      return
    }
    if (courses.length === 0) return
    const deptId = courses[0]?.department_id
    if (!deptId) {
      setError('Department ID could not be identified')
      return
    }
    setSavingGroup(true)
    setError('')

    const res = await fetch('/api/timetable/parallel-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academicYear: '2026-27',
        semester,
        departmentId: deptId,
        label: newGroupLabel.trim() || undefined,
        courseIds: selectedGroupCourseIds,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to create parallel group')
    } else {
      setSuccess('Parallel group created successfully')
      setTimeout(() => setSuccess(''), 1000)
      setShowNewGroupModal(false)
      setNewGroupLabel('')
      setSelectedGroupCourseIds([])
      fetchParallelGroups(semester)
    }
    setSavingGroup(false)
  }

  async function handleAddCourseToGroup(groupId: string) {
    if (!selectedCourseToAdd) {
      setError('Please select a course to add')
      return
    }
    setAddingCourse(true)
    setError('')
    const res = await fetch(`/api/timetable/parallel-groups/${groupId}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: selectedCourseToAdd }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to add course to group')
    } else {
      setSuccess('Course added to group')
      setTimeout(() => setSuccess(''), 1000)
      setAddCourseToGroupId(null)
      setSelectedCourseToAdd('')
      fetchParallelGroups(semester)
    }
    setAddingCourse(false)
  }

  async function handleRemoveCourseFromGroup(groupId: string, courseId: string) {
    setError('')
    const res = await fetch(`/api/timetable/parallel-groups/${groupId}/courses/${courseId}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to remove course from group')
    } else {
      setSuccess('Course removed from group')
      setTimeout(() => setSuccess(''), 1000)
      fetchParallelGroups(semester)
    }
  }

  async function handleDeleteGroup() {
    if (!deleteGroupConfirm) return
    setDeletingGroup(true)
    setError('')
    const res = await fetch(`/api/timetable/parallel-groups/${deleteGroupConfirm.groupId}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to delete parallel group')
    } else {
      setSuccess('Parallel group deleted')
      setTimeout(() => setSuccess(''), 1000)
      setDeleteGroupConfirm(null)
      fetchParallelGroups(semester)
    }
    setDeletingGroup(false)
  }

  function updateSlot(pathwayIdx: number, slotIdx: number, field: keyof SlotData, value: string) {
    setPathways(prev => prev.map((pw, pi) =>
      pi === pathwayIdx
        ? {
            ...pw,
            slots: pw.slots.map((s, si) =>
              si === slotIdx ? { ...s, [field]: value } : s
            )
          }
        : pw
    ))
  }

  function addSlotToPathway(pathwayIdx: number) {
    setPathways(prev => prev.map((pw, pi) =>
      pi === pathwayIdx
        ? { ...pw, slots: [...pw.slots, { rule: '', target: '', name: '' }] }
        : pw
    ))
  }

  function removeSlotFromPathway(pathwayIdx: number, slotIdx: number) {
    setPathways(prev => prev.map((pw, pi) =>
      pi === pathwayIdx
        ? { ...pw, slots: pw.slots.filter((_, si) => si !== slotIdx) }
        : pw
    ))
  }

  function addPathway() {
    setPathways(prev => [...prev, { name: '', slots: [{ rule: '', target: '', name: '' }] }])
    setEditingPathwayIndex(pathways.length)
  }

  function removePathway(idx: number) {
    setPathways(prev => prev.filter((_, i) => i !== idx))
    setEditingPathwayIndex(null)
  }

  function updatePathwayName(idx: number, name: string) {
    setPathways(prev => prev.map((pw, i) => i === idx ? { ...pw, name } : pw))
  }

  async function handleSaveBlueprint() {
    if (minCredits === '' || maxCredits === '') {
      setError('Min and Max credits are required')
      return
    }

    // Validate all pathways have names
    for (const pw of pathways) {
      if (!pw.name.trim()) {
        setError('All pathways must have a name')
        return
      }
      // Filter out empty slots before validation
      const validSlots = pw.slots.filter(s => s.rule)
      if (validSlots.length === 0) {
        setError(`Pathway "${pw.name}" must have at least one configured slot`)
        return
      }
      for (const s of validSlots) {
        if (!s.target.trim()) {
          setError(`All slots in pathway "${pw.name}" must have a target`)
          return
        }
        if (!s.name.trim()) {
          setError(`All slots in pathway "${pw.name}" must have a name`)
          return
        }
      }
    }

    setSaving(true)
    setError('')
    setSuccess('')

    // Build pathways payload: only send non-empty slots, preserve ids
    const pathwaysPayload = pathways.map(pw => ({
      ...(pw.id ? { id: pw.id } : {}),
      name: pw.name,
      slots: pw.slots.filter(s => s.rule && s.target.trim() && s.name.trim()),
    }))

    const res = await fetch('/api/hod/blueprint', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semester, min_credits: minCredits, max_credits: maxCredits, pathways: pathwaysPayload }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Failed to save blueprint') }
    else {
      setSuccess(data.message)
      setTimeout(() => setSuccess(''), 1000)
      // Refetch to get server-generated IDs
      fetchBlueprint(semester)
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

    const finalTheory = courseTheoryHours !== null && courseTheoryHours !== '' ? Number(courseTheoryHours) : Number(courseCredits ?? 0)
    const finalPractical = coursePracticalHours !== null && coursePracticalHours !== '' ? Number(coursePracticalHours) : 0

    const isEdit = !!editCourse
    const res = await fetch('/api/hod/courses', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit
        ? { id: editCourse.id, course_code: courseCode.trim().toUpperCase(), title: courseTitle.trim(), credits: courseCredits, theory_hours_per_week: finalTheory, practical_hours_per_week: finalPractical, category: courseCategory, tag: courseTag.trim() }
        : { course_code: courseCode.trim().toUpperCase(), title: courseTitle.trim(), semester, credits: courseCredits, theory_hours_per_week: finalTheory, practical_hours_per_week: finalPractical, category: courseCategory, tag: courseTag.trim() }
      ),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Failed to save course') }
    else {
      setSuccess(data.message)
      setTimeout(() => setSuccess(''), 1000)
      setShowAddCourse(false)
      setEditCourse(null)
      setCourseCode(''); setCourseTitle(''); setCourseCredits(null); setCourseTheoryHours(null); setCoursePracticalHours(null); setCourseCategory(null); setCourseTag('')
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

  // Render a slot editor for a pathway
  function renderSlotEditor(pathwayIdx: number, slotIdx: number, slot: SlotData) {
    const fixedKey = `${pathwayIdx}-${slotIdx}`
    return (
      <div key={slotIdx} className={styles.slotEditorCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className={styles.slotEditorTitle}>Paper {slotIdx + 1}</p>
          {pathways[pathwayIdx].slots.length > 1 && (
            <button
              type="button"
              onClick={() => removeSlotFromPathway(pathwayIdx, slotIdx)}
              style={{
                background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem',
              }}
            >
              ✕ Remove
            </button>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <label className={styles.label}>Paper Name</label>
            <input type="text" className={styles.input}
              placeholder="e.g. Major 1, MDC, Elective"
              value={slot.name}
              onChange={e => updateSlot(pathwayIdx, slotIdx, 'name', e.target.value)} />
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
                updateSlot(pathwayIdx, slotIdx, 'rule', newRule)
                updateSlot(pathwayIdx, slotIdx, 'target', newTarget)
              }}>
              {RULES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {slot.rule && (
            <div className={styles.field} style={{ position: 'relative' }}>
              <label className={styles.label}>
                Target {(slot.rule === 'FIXED' || slot.rule === 'AEC_ELECT' || slot.rule === 'CAMPUS_FIXED') ? '(Course Code)' :
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
                            updateSlot(pathwayIdx, slotIdx, 'target', newCodes.join(','));
                          }}
                        />
                        {d.name} ({d.code})
                      </label>
                    );
                  })}
                </div>
              ) : (slot.rule === 'FIXED' || slot.rule === 'AEC_ELECT' || slot.rule === 'CAMPUS_FIXED') ? (
                <div style={{ position: 'relative' }}>
                  <input type="text" className={styles.input}
                    placeholder="Search & select course..."
                    value={
                      fixedOpen[fixedKey]
                        ? (fixedSearch[fixedKey] ?? '')
                        : (() => {
                            const course = courses.find(c => c.course_code === slot.target)
                            return course ? `${course.course_code} — ${course.title}` : slot.target
                          })()
                    }
                    onFocus={() => {
                      setFixedOpen(prev => ({ ...prev, [fixedKey]: true }))
                      setFixedSearch(prev => ({ ...prev, [fixedKey]: '' }))
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setFixedOpen(prev => ({ ...prev, [fixedKey]: false }))
                      }, 150)
                    }}
                    onChange={e => {
                      const val = e.target.value
                      setFixedSearch(prev => ({ ...prev, [fixedKey]: val }))
                    }} />
                  {fixedOpen[fixedKey] && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      border: '1px solid #dde1e7',
                      borderRadius: '0.4rem',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 200,
                    }}>
                      {courses.length === 0 ? (
                        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#9ba1ab' }}>
                          No courses found for Semester {semester}. Add courses first.
                        </div>
                      ) : (() => {
                        const searchStr = (fixedSearch[fixedKey] ?? '').toLowerCase()
                        const filtered = courses.filter(c => {
                          const matchesText = c.course_code.toLowerCase().includes(searchStr) ||
                            c.title.toLowerCase().includes(searchStr) ||
                            (c.category && c.category.toLowerCase().includes(searchStr))

                          if (!matchesText) return false

                          // AEC_ELECT: show AEC courses from all campuses
                          if (slot.rule === 'AEC_ELECT') {
                            return c.category === 'AEC'
                          }

                          // FIXED: show ONLY DSC/DSE courses from own campus departments
                          if (slot.rule === 'FIXED') {
                            return ['DSC', 'DSE'].includes(c.category) && c.is_own_campus !== false
                          }

                          return true
                        })
                        if (filtered.length === 0) {
                          return (
                            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#9ba1ab' }}>
                              No matching courses found
                            </div>
                          )
                        }
                        return filtered.map(c => (
                          <div key={c.id}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              updateSlot(pathwayIdx, slotIdx, 'target', c.course_code)
                              setFixedOpen(prev => ({ ...prev, [fixedKey]: false }))
                            }}
                            style={{
                              padding: '0.55rem 0.75rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f2f5',
                              color: '#002147',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.15rem'
                            }}
                            className={styles.comboboxItem}>
                            <div>
                              <strong style={{ fontFamily: 'monospace' }}>{c.course_code}</strong> — {c.title}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                              <span style={{ fontWeight: 700, color: '#002147' }}>{c.category}</span>
                              {c.department_name ? ` • ${c.department_name}` : ''}
                            </div>
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
                    updateSlot(pathwayIdx, slotIdx, 'target', val)
                  }} />
              )}
            </div>
          )}
        </div>
      </div>
    )
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

              {/* Credit Feasibility Indicator */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #dde1e7',
                borderRadius: '0.45rem',
                padding: '0.85rem 1rem',
                marginBottom: '1.5rem',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#44474e', fontWeight: 600 }}>
                    Overall Credit Bounds (across all pathways):
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#002147' }}>
                    {overallMin} — {overallMax} credits
                  </span>
                </div>
                {isImpossible && (
                  <div style={{
                    marginTop: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '0.35rem',
                    color: '#dc2626',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    ⚠️ <b>Configuration Error:</b> {warningMessage}
                  </div>
                )}
                {!isImpossible && maxCredits !== '' && (
                  <div style={{
                    marginTop: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '0.35rem',
                    color: '#1d4ed8',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    ℹ️ <b>Info:</b> The current configured slots require a minimum of {overallMin} credits, which fits below your maximum limit of {maxCredits} credits.
                  </div>
                )}
              </div>

              {/* ── PATHWAY MANAGER ── */}
              {editingPathwayIndex === null ? (
                // Pathway list view
                <>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#002147' }}>
                      Pathways ({pathways.length})
                    </p>
                    <button
                      type="button"
                      onClick={addPathway}
                      style={{
                        background: '#002147', color: '#fff', border: 'none', borderRadius: '0.4rem',
                        padding: '0.45rem 1rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      + Add Pathway
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {pathways.map((pw, idx) => {
                      const { min, max } = getPathwayCreditRange(pw)
                      const validSlots = pw.slots.filter(s => s.rule)
                      return (
                        <div key={idx} style={{
                          background: '#ffffff',
                          border: '1.5px solid #dde1e7',
                          borderRadius: '0.45rem',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                        }}>
                          <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#002147', marginBottom: '0.2rem' }}>
                              {pw.name || <span style={{ color: '#9ba1ab', fontStyle: 'italic' }}>Untitled Pathway</span>}
                            </p>
                            <p style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                              {validSlots.length} slot{validSlots.length !== 1 ? 's' : ''} • {min}–{max} credits
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => setEditingPathwayIndex(idx)}
                              style={{
                                background: '#e6f0fa', color: '#002147', border: '1px solid #bfdbfe',
                                borderRadius: '0.35rem', padding: '0.35rem 0.75rem',
                                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removePathway(idx)}
                              disabled={pathways.length <= 1}
                              style={{
                                background: pathways.length <= 1 ? '#f3f4f6' : '#fee2e2',
                                color: pathways.length <= 1 ? '#9ba1ab' : '#dc2626',
                                border: `1px solid ${pathways.length <= 1 ? '#e5e7eb' : '#fca5a5'}`,
                                borderRadius: '0.35rem', padding: '0.35rem 0.75rem',
                                fontSize: '0.72rem', fontWeight: 600,
                                cursor: pathways.length <= 1 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                // Pathway editor view
                <>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '1rem',
                  }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#002147' }}>
                      Editing Pathway
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingPathwayIndex(null)}
                      style={{
                        background: '#e6f0fa', color: '#002147', border: '1px solid #bfdbfe',
                        borderRadius: '0.4rem', padding: '0.45rem 1rem',
                        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      ← Back to Pathways
                    </button>
                  </div>

                  <div style={{
                    background: '#ffffff', border: '1.5px solid #dde1e7', borderRadius: '0.45rem',
                    padding: '1rem', marginBottom: '1rem',
                  }}>
                    <label className={styles.label}>Pathway Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Research Track, Industry Track"
                      value={pathways[editingPathwayIndex].name}
                      onChange={e => updatePathwayName(editingPathwayIndex, e.target.value)}
                    />
                  </div>

                  {/* Per-pathway credit range */}
                  {(() => {
                    const { min, max } = getPathwayCreditRange(pathways[editingPathwayIndex])
                    return (
                      <div style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.35rem',
                        padding: '0.5rem 0.75rem', marginBottom: '1rem',
                        fontSize: '0.75rem', color: '#44474e',
                      }}>
                        Pathway credit range: <b>{min} — {max}</b>
                      </div>
                    )
                  })()}

                  <div className={styles.slotsEditorContainer}>
                    {pathways[editingPathwayIndex].slots.map((slot, slotIdx) =>
                      renderSlotEditor(editingPathwayIndex, slotIdx, slot)
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => addSlotToPathway(editingPathwayIndex)}
                    disabled={pathways[editingPathwayIndex].slots.length >= 10}
                    style={{
                      background: '#ffffff', color: '#002147', border: '1.5px dashed #bfdbfe',
                      borderRadius: '0.4rem', padding: '0.6rem 1rem', width: '100%',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      marginTop: '0.75rem', marginBottom: '1.5rem',
                    }}
                  >
                    + Add Paper Slot
                  </button>
                </>
              )}

              {error && <div className={styles.errorBanner} style={{ marginBottom: '1rem' }}>{error}</div>}

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
                  setCourseTheoryHours(null)
                  setCoursePracticalHours(null)
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
                      <tr><th>Code</th><th>Title</th><th>Cr</th><th>Theory Hrs</th><th>Practical Hrs</th><th>Cat</th><th>Tag</th><th></th></tr>
                    </thead>
                    <tbody>
                      {courses.map(course => (
                        <tr key={course.id} className={styles.tableRow}>
                          <td style={{ fontSize: '0.68rem', fontFamily: 'monospace' }}>{course.course_code}</td>
                          <td style={{ fontSize: '0.78rem' }}>{course.title}</td>
                          <td>{course.credits}</td>
                          <td>{course.theory_hours_per_week ?? course.credits}</td>
                          <td>{course.practical_hours_per_week ?? 0}</td>
                          <td><span className={styles.codeBadge}>{course.category}</span></td>
                          <td style={{ fontSize: '0.68rem', color: '#9ba1ab' }}>{course.tag ?? '—'}</td>
                          <td>
                            <div className={styles.actionBtns}>
                              <button className={styles.editBtn} onClick={() => {
                                setEditCourse(course)
                                setCourseCode(course.course_code)
                                setCourseTitle(course.title)
                                setCourseCredits(course.credits)
                                setCourseTheoryHours(course.theory_hours_per_week ?? course.credits)
                                setCoursePracticalHours(course.practical_hours_per_week ?? 0)
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

              {/* ── PARALLEL GROUPS PANEL ── */}
              <div style={{ marginTop: '2.5rem' }}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionTitle} style={{ margin: 0 }}>⚡ Parallel Course Groups — Semester {semester}</p>
                    <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                      Group alternative courses (e.g. Electives) to force them into the same time slot simultaneously.
                    </p>
                  </div>
                  <button className={styles.addBtn} onClick={() => {
                    setShowNewGroupModal(true)
                    setNewGroupLabel('')
                    setSelectedGroupCourseIds([])
                    setError('')
                  }}>+ New Group</button>
                </div>

                <div className={styles.tableWrapper}>
                  {loadingParallel ? (
                    <div className={styles.loadingState}>
                      <div className={styles.spinner} />
                      <p className={styles.loadingText}>Loading parallel groups...</p>
                    </div>
                  ) : parallelGroups.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>⚡</div>
                      <p className={styles.emptyTitle}>No parallel groups yet</p>
                      <p className={styles.emptySubtitle}>
                        Create a parallel group to schedule alternative elective courses into the same time slot.
                      </p>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {parallelGroups.map((group: any) => (
                        <div key={group.groupId} style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '0.5rem',
                          padding: '0.85rem 1rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                {group.label || `Elective Parallel Group (${group.courses.length} courses)`}
                              </span>
                              <span className={styles.codeBadge} style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                                {group.courses.length} Parallel Courses
                              </span>
                            </div>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => setDeleteGroupConfirm(group)}
                              style={{ fontSize: '0.75rem' }}
                            >
                              Delete Group
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingLeft: '0.75rem', borderLeft: '3px solid #3b82f6' }}>
                            {group.courses.map((c: any) => (
                              <div key={c.courseId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                <span>
                                  <strong style={{ fontFamily: 'monospace', color: '#1e293b' }}>{c.courseCode}</strong> — {c.title}
                                </span>
                                <button
                                  onClick={() => handleRemoveCourseFromGroup(group.groupId, c.courseId)}
                                  style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '0.25rem', padding: '0.1rem 0.4rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}
                                  title="Remove course from group"
                                >
                                  ✕ Remove
                                </button>
                              </div>
                            ))}
                          </div>

                          <div style={{ marginTop: '0.75rem' }}>
                            <button
                              className={styles.addBtn}
                              style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                              onClick={() => {
                                setAddCourseToGroupId(group.groupId)
                                setSelectedCourseToAdd('')
                                setError('')
                              }}
                            >
                              + Add Course
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* New Parallel Group Modal */}
      {showNewGroupModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>+ New Parallel Group</h3>
            <p className={styles.modalSubtitle}>
              Select courses in Semester {semester} that are alternatives to each other. They will be scheduled in the exact same time slot.
            </p>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Group Label (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Elective Group A"
                  value={newGroupLabel}
                  onChange={e => setNewGroupLabel(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Select Courses (Min 2 required)</label>
                <div style={{ maxHeight: '12rem', overflowY: 'auto', border: '1px solid #dde1e7', borderRadius: '0.5rem', padding: '0.5rem' }}>
                  {courses
                    .filter(c => !parallelGroups.some(g => g.courses.some((gc: any) => gc.courseId === c.id)))
                    .map(c => {
                      const isSelected = selectedGroupCourseIds.includes(c.id)
                      return (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.2rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedGroupCourseIds(prev => prev.filter(id => id !== c.id))
                              } else {
                                setSelectedGroupCourseIds(prev => [...prev, c.id])
                              }
                            }}
                          />
                          <span><strong>{c.course_code}</strong> — {c.title}</span>
                        </label>
                      )
                    })}
                  {courses.filter(c => !parallelGroups.some(g => g.courses.some((gc: any) => gc.courseId === c.id))).length === 0 && (
                    <p style={{ fontSize: '0.78rem', color: '#9ba1ab', margin: 0, textAlign: 'center', padding: '0.5rem' }}>
                      No ungrouped courses available for Semester {semester}.
                    </p>
                  )}
                </div>
              </div>
            </div>
            {error && <div className={styles.errorBanner} style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => { setShowNewGroupModal(false); setError('') }} disabled={savingGroup}>Cancel</button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleCreateGroup}
                disabled={savingGroup || selectedGroupCourseIds.length < 2}
              >
                {savingGroup ? 'Creating...' : 'Create Group →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Course to Parallel Group Modal */}
      {addCourseToGroupId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Add Course to Group</h3>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Select Course</label>
                <select
                  className={styles.input}
                  value={selectedCourseToAdd}
                  onChange={e => setSelectedCourseToAdd(e.target.value)}
                >
                  <option value="">— Select Course —</option>
                  {courses
                    .filter(c => !parallelGroups.some(g => g.courses.some((gc: any) => gc.courseId === c.id)))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} — {c.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            {error && <div className={styles.errorBanner} style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => { setAddCourseToGroupId(null); setError('') }} disabled={addingCourse}>Cancel</button>
              <button
                className={styles.modalConfirmBtn}
                onClick={() => handleAddCourseToGroup(addCourseToGroupId)}
                disabled={addingCourse || !selectedCourseToAdd}
              >
                {addingCourse ? 'Adding...' : 'Add Course →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Parallel Group Confirmation Modal */}
      {deleteGroupConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Delete Parallel Group</h3>
            <p className={styles.modalSubtitle}>
              This will ungroup all courses in <strong>{deleteGroupConfirm.label || 'this parallel group'}</strong>. Generation will treat them independently.
            </p>
            {error && <div className={styles.errorBanner} style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => { setDeleteGroupConfirm(null); setError('') }} disabled={deletingGroup}>Cancel</button>
              <button className={styles.modalDeleteBtn} onClick={handleDeleteGroup} disabled={deletingGroup}>
                {deletingGroup ? 'Deleting...' : 'Yes, Delete Group'}
              </button>
            </div>
          </div>
        </div>
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
                      value={courseTag} onChange={e => setCourseTag(e.target.value.toUpperCase())} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Theory Hours / Week</label>
                    <input type="number" className={styles.input} min={0} max={20}
                      placeholder={courseCredits ? `${courseCredits} (Default)` : 'e.g. 3'}
                      value={courseTheoryHours ?? ''}
                      onChange={e => {
                        const val = e.target.value
                        setCourseTheoryHours(val === '' ? null : Number(val))
                      }} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Practical Hours / Week (Lab Blocks)</label>
                    <input type="number" className={styles.input} min={0} max={20}
                      placeholder="e.g. 2 (1 lab block = 2 hrs)"
                      value={coursePracticalHours ?? ''}
                      onChange={e => {
                        const val = e.target.value
                        setCoursePracticalHours(val === '' ? null : Number(val))
                      }} />
                  </div>
                </div>
                {error && <div className={styles.errorBanner} style={{ marginBottom: '1rem' }}>{error}</div>}
                <div className={styles.modalActions}>
                  <button className={styles.modalCancelBtn}
                    onClick={() => { setShowAddCourse(false); setEditCourse(null); setCourseCode(''); setCourseTitle(''); setCourseCredits(null); setCourseTheoryHours(null); setCoursePracticalHours(null); setCourseCategory(null); setCourseTag(''); setError('') }}
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
