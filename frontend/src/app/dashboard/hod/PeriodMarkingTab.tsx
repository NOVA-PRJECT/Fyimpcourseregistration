'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Unlock,
  RefreshCw,
  Search,
  Filter,
  User,
  Users,
  ChevronRight,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react'
import styles from './hod-dashboard.module.css'

interface DepartmentSlot {
  id: string
  course_id: string
  course_code: string
  course_title: string
  semester: number
  session_type: string
  day_of_week: number
  period_number: number
  start_time: string
  end_time: string
  is_marked: boolean
  present_count: number
  absent_count: number
  is_unlocked: boolean
  unlocked_at: string | null
  unlock_reason: string | null
}

interface RosterStudent {
  id: string
  full_name: string
  cap_application_number: string | null
  email: string
  status: 'present' | 'absent' | 'unmarked'
  marked_at: string | null
  is_late_entry: boolean
}

interface SlotRosterData {
  slot: {
    id: string
    course_id: string
    course_code: string
    course_title: string
    period_number: number
    start_time: string
    end_time: string
  }
  summary: {
    total_enrolled: number
    present_count: number
    absent_count: number
    is_marked: boolean
  }
  students: RosterStudent[]
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function PeriodMarkingTab() {
  const [slots, setSlots] = useState<DepartmentSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [semesterFilter, setSemesterFilter] = useState<number | 'all'>('all')
  const [dayFilter, setDayFilter] = useState<number | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Selected slot for roster inspection
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [rosterData, setRosterData] = useState<SlotRosterData | null>(null)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')

  // Unlock Modal
  const [unlockSlotTarget, setUnlockSlotTarget] = useState<DepartmentSlot | null>(null)
  const [unlockReason, setUnlockReason] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  // Statement Export
  const [exporting, setExporting] = useState(false)

  const handleExportStatement = async () => {
    const sem = semesterFilter === 'all' ? 1 : semesterFilter
    setExporting(true)
    setError('')
    try {
      const res = await fetch(`/api/attendance/export/statement?semesterId=${sem}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.message || 'Failed to export attendance statement.')
        return
      }

      const blob = await res.blob()
      const contentDisposition = res.headers.get('content-disposition')
      let filename = `Attendance_Statement_Sem_${sem}.xlsx`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/)
        if (match && match[1]) {
          filename = match[1]
        }
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || 'Network error exporting attendance statement.')
    } finally {
      setExporting(false)
    }
  }

  // ── Fetch Department Timetable Slots ──
  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (semesterFilter !== 'all') params.append('semester', String(semesterFilter))
      if (dayFilter !== 'all') params.append('dayOfWeek', String(dayFilter))

      const res = await fetch(`/api/attendance/period/slots?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to load department slots.')
        setLoadingSlots(false)
        return
      }
      setSlots(data || [])
      // Auto-select first slot if none selected
      if (data && data.length > 0 && !selectedSlotId) {
        setSelectedSlotId(data[0].id)
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching slots.')
    } finally {
      setLoadingSlots(false)
    }
  }, [semesterFilter, dayFilter, selectedSlotId])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  // ── Fetch Roster for Selected Slot ──
  const fetchRoster = useCallback(async (slotId: string) => {
    setLoadingRoster(true)
    setError('')
    try {
      const res = await fetch(`/api/attendance/period/roster?slotId=${slotId}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to load roster.')
        setLoadingRoster(false)
        return
      }
      setRosterData(data)
    } catch (err: any) {
      setError(err.message || 'Network error loading roster.')
    } finally {
      setLoadingRoster(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSlotId) {
      fetchRoster(selectedSlotId)
    }
  }, [selectedSlotId, fetchRoster])

  // Filtered Slots
  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        s.course_code.toLowerCase().includes(q) ||
        s.course_title.toLowerCase().includes(q) ||
        `period ${s.period_number}`.includes(q)
      )
    })
  }, [slots, searchQuery])

  // Filtered Students in Roster
  const filteredStudents = useMemo(() => {
    if (!rosterData?.students) return []
    if (!studentSearch.trim()) return rosterData.students
    const q = studentSearch.toLowerCase()
    return rosterData.students.filter(
      (st) =>
        st.full_name.toLowerCase().includes(q) ||
        (st.cap_application_number && st.cap_application_number.toLowerCase().includes(q)) ||
        st.email.toLowerCase().includes(q)
    )
  }, [rosterData, studentSearch])

  // ── Unlock Period Submission ──
  async function handleConfirmUnlock() {
    if (!unlockSlotTarget || !unlockReason.trim()) return
    setUnlocking(true)
    setError('')
    try {
      const res = await fetch('/api/attendance/period/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timetable_slot_id: unlockSlotTarget.id,
          reason: unlockReason.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to unlock period slot.')
        return
      }
      setSuccess(`Period ${unlockSlotTarget.period_number} unlocked for late submission!`)
      setTimeout(() => setSuccess(''), 4000)
      setUnlockSlotTarget(null)
      setUnlockReason('')
      await fetchSlots()
      if (selectedSlotId === unlockSlotTarget.id) {
        await fetchRoster(selectedSlotId)
      }
    } catch (err: any) {
      setError(err.message || 'Network error.')
    } finally {
      setUnlocking(false)
    }
  }

  // Selected slot object
  const activeSlot = slots.find((s) => s.id === selectedSlotId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* ── Top Header & Stats ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#002147', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="#c9a227" /> Period Attendance Monitoring
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>
            Monitor real-time lecture period attendance, track student rosters, and authorize late-entry unlocks (15-min grace window).
          </p>
        </div>

        {/* Actions & Global Stats */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleExportStatement}
            disabled={exporting}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '12px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            title="Export official department APC statement as styled XLSX"
          >
            <FileSpreadsheet size={15} />
            {exporting ? 'Generating Statement...' : `Export Sem ${semesterFilter === 'all' ? 1 : semesterFilter} Statement (XLSX)`}
          </button>

          <div style={{ padding: '6px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px' }}>
            <span style={{ color: '#64748b' }}>Total Slots: </span>
            <strong style={{ color: '#0f172a' }}>{slots.length}</strong>
          </div>
          <div style={{ padding: '6px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '12px' }}>
            <span style={{ color: '#15803d' }}>Marked: </span>
            <strong style={{ color: '#166534' }}>{slots.filter((s) => s.is_marked).length}</strong>
          </div>
          <div style={{ padding: '6px 14px', borderRadius: '8px', background: '#faf5ff', border: '1px solid #e9d5ff', fontSize: '12px' }}>
            <span style={{ color: '#7e22ce' }}>Unlocked: </span>
            <strong style={{ color: '#6b21a8' }}>{slots.filter((s) => s.is_unlocked).length}</strong>
          </div>
        </div>
      </div>

      {/* ── Banners ── */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', fontSize: '13px' }}>
          {success}
        </div>
      )}

      {/* ── Two-Column Layout: Slots List (Left) + Roster View (Right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        {/* LEFT COLUMN: Timetable Slots Filter & List */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#002147', margin: 0 }}>Timetable Lecture Slots</h3>
            <button
              onClick={fetchSlots}
              disabled={loadingSlots}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#475569',
              }}
            >
              <RefreshCw size={12} className={loadingSlots ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', flex: 1 }}
            >
              <option value="all">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                <option key={s} value={s}>
                  Sem {s}
                </option>
              ))}
            </select>

            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', flex: 1 }}
            >
              <option value="all">All Days</option>
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {DAY_NAMES[d]}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              placeholder="Search course code, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Slots List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '560px', overflowY: 'auto' }}>
            {loadingSlots ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '13px' }}>Loading slots...</div>
            ) : filteredSlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '13px' }}>No timetable slots found.</div>
            ) : (
              filteredSlots.map((slot) => {
                const isSelected = slot.id === selectedSlotId
                return (
                  <div
                    key={slot.id}
                    onClick={() => setSelectedSlotId(slot.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#002147' }}>
                        {slot.course_code} • P{slot.period_number}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {DAY_NAMES[slot.day_of_week]} {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{slot.course_title}</div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {slot.is_marked ? (
                          <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            ✓ Marked ({slot.present_count} Pres, {slot.absent_count} Abs)
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Pending / Unmarked
                          </span>
                        )}

                        {slot.is_unlocked && (
                          <span style={{ fontSize: '10px', background: '#f3e8ff', color: '#7e22ce', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            🔓 Late Unlocked
                          </span>
                        )}
                      </div>

                      {/* Unlock button if not marked or if HOD wants to allow late entry */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setUnlockSlotTarget(slot)
                          setUnlockReason('')
                        }}
                        title="Authorize late marking unlock"
                        style={{
                          background: slot.is_unlocked ? '#f3e8ff' : '#f1f5f9',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '3px 6px',
                          color: slot.is_unlocked ? '#7e22ce' : '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                      >
                        <Unlock size={11} /> {slot.is_unlocked ? 'Re-unlock' : 'Unlock'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Slot Attendance Roster */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeSlot ? (
            <>
              {/* Header Info of Selected Slot */}
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px' }}>
                      {activeSlot.course_code} • Period {activeSlot.period_number}
                    </span>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#002147', margin: '6px 0 2px' }}>
                      {activeSlot.course_title}
                    </h3>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                      {DAY_NAMES[activeSlot.day_of_week]} • {activeSlot.start_time?.slice(0, 5)} - {activeSlot.end_time?.slice(0, 5)} • Sem {activeSlot.semester}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setUnlockSlotTarget(activeSlot)
                      setUnlockReason('')
                    }}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#002147',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Unlock size={14} color="#7e22ce" /> Authorize Late Entry
                  </button>
                </div>

                {/* Status and Statistics Strip */}
                {rosterData?.summary && (
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                      <span style={{ color: '#64748b' }}>Enrolled: </span>
                      <strong>{rosterData.summary.total_enrolled}</strong>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '11px' }}>
                      <span style={{ color: '#15803d' }}>Present: </span>
                      <strong style={{ color: '#166534' }}>{rosterData.summary.present_count}</strong>
                    </div>
                    <div style={{ background: '#fef2f2', padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '11px' }}>
                      <span style={{ color: '#dc2626' }}>Absent: </span>
                      <strong style={{ color: '#991b1b' }}>{rosterData.summary.absent_count}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                      <span style={{ color: '#64748b' }}>Turnout: </span>
                      <strong>
                        {rosterData.summary.total_enrolled > 0
                          ? Math.round((rosterData.summary.present_count / rosterData.summary.total_enrolled) * 100)
                          : 0}
                        %
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Roster Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                <input
                  type="text"
                  placeholder="Filter roster by student name or CAP number..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Student Table */}
              <div style={{ maxHeight: '460px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                {loadingRoster ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '13px' }}>Loading student roster...</div>
                ) : filteredStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '13px' }}>No students found for this lecture.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '8px 10px' }}>#</th>
                        <th style={{ padding: '8px 10px' }}>Student Name</th>
                        <th style={{ padding: '8px 10px' }}>CAP / ID</th>
                        <th style={{ padding: '8px 10px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((st, idx) => (
                        <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                            {st.full_name}
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 400 }}>{st.email}</div>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#475569', fontFamily: 'monospace' }}>
                            {st.cap_application_number || '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {st.status === 'present' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '11px' }}>
                                <CheckCircle2 size={12} /> Present
                              </span>
                            )}
                            {st.status === 'absent' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '11px' }}>
                                <XCircle size={12} /> Absent
                              </span>
                            )}
                            {st.status === 'unmarked' && (
                              <span style={{ color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                                Unmarked
                              </span>
                            )}
                            {st.is_late_entry && (
                              <span style={{ marginLeft: '4px', fontSize: '9px', background: '#f3e8ff', color: '#7e22ce', padding: '1px 4px', borderRadius: '3px' }}>
                                Late
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '13px' }}>
              Select a timetable slot from the left to view roster attendance.
            </div>
          )}
        </div>
      </div>

      {/* ── Unlock Late-Entry Period Modal ── */}
      {unlockSlotTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Authorize Late Attendance Unlock</h3>
            <p className={styles.modalSubtitle}>
              Unlocking slot <strong>{unlockSlotTarget.course_code} (Period {unlockSlotTarget.period_number})</strong> will permit the faculty member to mark or update attendance past the 15-minute grace window.
            </p>

            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <div><strong>Course:</strong> {unlockSlotTarget.course_title}</div>
              <div><strong>Scheduled:</strong> {DAY_NAMES[unlockSlotTarget.day_of_week]} {unlockSlotTarget.start_time?.slice(0, 5)} - {unlockSlotTarget.end_time?.slice(0, 5)}</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Reason for Unlock Authorization *</label>
              <textarea
                className={styles.input}
                rows={3}
                placeholder="e.g., Campus power outage during period, lab session overrun, medical justification"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setUnlockSlotTarget(null)}
                disabled={unlocking}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleConfirmUnlock}
                disabled={!unlockReason.trim() || unlocking}
              >
                {unlocking ? 'Authorizing...' : 'Authorize Unlock →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
