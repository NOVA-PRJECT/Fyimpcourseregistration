'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  UserCheck,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Edit2,
  Plus,
  Search,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import styles from './hod-dashboard.module.css'

interface Teacher {
  id: string
  full_name: string
  email: string
  role: string
}

interface CourseAssignment {
  assignment_id: string
  teacher_id: string
  teacher_name: string
  teacher_email: string
  assigned_at: string
}

interface Course {
  id: string
  course_code: string
  title: string
  credits: number
  category: string
  semester: number
  assignments: CourseAssignment[]
  is_assigned: boolean
}

// ── Custom Node Components for React Flow ──
function TeacherNode({ data }: { data: { teacher: Teacher; assignmentCount: number } }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1.5px solid #002147',
        borderRadius: '10px',
        padding: '10px 14px',
        minWidth: '220px',
        boxShadow: '0 4px 12px rgba(0, 33, 71, 0.08)',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#e6f0fa',
            color: '#002147',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '13px',
          }}
        >
          {data.teacher.full_name.charAt(0)}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', color: '#002147', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {data.teacher.full_name}
          </div>
          <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {data.teacher.email}
          </div>
        </div>
      </div>
      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', background: '#f0f4f8', padding: '2px 6px', borderRadius: '4px', color: '#444' }}>
          {data.teacher.role}
        </span>
        <span style={{ fontSize: '10px', fontWeight: 600, color: data.assignmentCount > 0 ? '#16a34a' : '#9ca3af' }}>
          {data.assignmentCount} {data.assignmentCount === 1 ? 'Course' : 'Courses'}
        </span>
      </div>
      {/* Target handle on right for connecting to courses */}
      <Handle
        type="source"
        position={Position.Right}
        id="teacher-source"
        style={{
          background: '#002147',
          width: '10px',
          height: '10px',
          border: '2px solid #fff',
        }}
      />
    </div>
  )
}

function CourseNode({
  data,
}: {
  data: {
    course: Course
    onReassign: (assignment: CourseAssignment) => void
    onRemove: (assignmentId: string) => void
  }
}) {
  const isAssigned = data.course.is_assigned
  return (
    <div
      style={{
        background: '#ffffff',
        border: isAssigned ? '1.5px solid #0284c7' : '2px dashed #f59e0b',
        borderRadius: '10px',
        padding: '10px 14px',
        minWidth: '240px',
        boxShadow: isAssigned ? '0 4px 12px rgba(2, 132, 199, 0.08)' : '0 4px 12px rgba(245, 158, 11, 0.12)',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="course-target"
        style={{
          background: isAssigned ? '#0284c7' : '#f59e0b',
          width: '10px',
          height: '10px',
          border: '2px solid #fff',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            background: isAssigned ? '#e0f2fe' : '#fef3c7',
            color: isAssigned ? '#0369a1' : '#b45309',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          {data.course.course_code}
        </span>
        <span style={{ fontSize: '10px', color: '#64748b' }}>
          Sem {data.course.semester} • {data.course.credits} Cr
        </span>
      </div>

      <div style={{ fontWeight: 600, fontSize: '12px', color: '#1e293b', marginTop: '4px', lineHeight: '1.3' }}>
        {data.course.title}
      </div>

      <div style={{ marginTop: '8px' }}>
        {data.course.assignments.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#d97706',
              fontWeight: 500,
            }}
          >
            <AlertTriangle size={12} />
            <span>Drop teacher here to assign</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {data.course.assignments.map((a) => (
              <div
                key={a.assignment_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '3px 6px',
                  fontSize: '11px',
                }}
              >
                <span style={{ fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                  {a.teacher_name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      data.onReassign(a)
                    }}
                    title="Reassign to another teacher"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#0284c7',
                      padding: '2px',
                    }}
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      data.onRemove(a.assignment_id)
                    }}
                    title="Remove assignment"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ef4444',
                      padding: '2px',
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const nodeTypes = {
  teacherNode: TeacherNode,
  courseNode: CourseNode,
}

export default function TeacherAssignmentTab() {
  const [loading, setLoading] = useState(true)
  const [faculty, setFaculty] = useState<Teacher[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [semesterFilter, setSemesterFilter] = useState<number | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isMobileView, setIsMobileView] = useState(false)

  // Reassignment Modal State
  const [reassignTarget, setReassignTarget] = useState<CourseAssignment | null>(null)
  const [reassignTeacherId, setReassignTeacherId] = useState('')
  const [reassigning, setReassigning] = useState(false)

  // Manual Add Modal State (for list view)
  const [assignCourseTarget, setAssignCourseTarget] = useState<Course | null>(null)
  const [assignTeacherId, setAssignTeacherId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Detect viewport width for >= 1024px canvas vs < 1024px list
  useEffect(() => {
    function checkWidth() {
      setIsMobileView(window.innerWidth < 1024)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  // ── Fetch Courses and Faculty Data ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/assignments/courses')
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to load assignment data.')
        setLoading(false)
        return
      }
      setCourses(data.courses || [])
      setFaculty(data.faculty || [])
    } catch (err: any) {
      setError(err.message || 'Network error fetching assignments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSem = semesterFilter === 'all' || c.semester === semesterFilter
      const matchQuery =
        searchQuery.trim() === '' ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.course_code.toLowerCase().includes(searchQuery.toLowerCase())
      return matchSem && matchQuery
    })
  }, [courses, semesterFilter, searchQuery])

  // ── Compute React Flow Nodes and Edges ──
  useEffect(() => {
    if (isMobileView) return

    // Calculate teacher assignment count
    const teacherCountMap = new Map<string, number>()
    for (const c of courses) {
      for (const a of c.assignments) {
        teacherCountMap.set(a.teacher_id, (teacherCountMap.get(a.teacher_id) || 0) + 1)
      }
    }

    // Filter faculty matching search query if relevant
    const matchingFaculty = faculty.filter(
      (f) =>
        searchQuery.trim() === '' ||
        f.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Place Teacher nodes on the Left (X: 50)
    matchingFaculty.forEach((teacher, idx) => {
      newNodes.push({
        id: `teacher-${teacher.id}`,
        type: 'teacherNode',
        position: { x: 50, y: 50 + idx * 110 },
        data: {
          teacher,
          assignmentCount: teacherCountMap.get(teacher.id) || 0,
        },
      })
    })

    // Place Course nodes on the Right (X: 520)
    filteredCourses.forEach((course, idx) => {
      newNodes.push({
        id: `course-${course.id}`,
        type: 'courseNode',
        position: { x: 520, y: 50 + idx * 130 },
        data: {
          course,
          onReassign: (a: CourseAssignment) => {
            setReassignTarget(a)
            setReassignTeacherId('')
          },
          onRemove: (assignmentId: string) => handleRemoveAssignment(assignmentId),
        },
      })

      // Add edges for active assignments
      course.assignments.forEach((assignment) => {
        newEdges.push({
          id: `edge-${assignment.assignment_id}`,
          source: `teacher-${assignment.teacher_id}`,
          target: `course-${course.id}`,
          sourceHandle: 'teacher-source',
          targetHandle: 'course-target',
          animated: true,
          style: { stroke: '#0284c7', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#0284c7',
          },
        })
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }, [faculty, courses, filteredCourses, isMobileView, searchQuery])

  // ── Handle Connection Drag on Canvas ──
  const onConnect = useCallback(
    async (params: Connection) => {
      const sourceId = params.source
      const targetId = params.target

      if (!sourceId?.startsWith('teacher-') || !targetId?.startsWith('course-')) {
        setError('Please drag from a Teacher node to a Course node.')
        return
      }

      const teacherId = sourceId.replace('teacher-', '')
      const courseId = targetId.replace('course-', '')

      try {
        const res = await fetch('/api/assignments/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teacher_id: teacherId, course_id: courseId }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.message || 'Failed to assign teacher.')
          return
        }
        setSuccess('Teacher assigned successfully!')
        setTimeout(() => setSuccess(''), 3000)
        await fetchData()
      } catch (err: any) {
        setError(err.message || 'Network error.')
      }
    },
    [fetchData]
  )

  // ── Handle Mid-Semester Reassignment ──
  async function handleConfirmReassign() {
    if (!reassignTarget || !reassignTeacherId) return
    setReassigning(true)
    setError('')
    try {
      const res = await fetch(`/api/assignments/${reassignTarget.assignment_id}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_teacher_id: reassignTeacherId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to reassign teacher.')
        return
      }
      setSuccess('Course successfully reassigned to new teacher!')
      setTimeout(() => setSuccess(''), 3000)
      setReassignTarget(null)
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Network error.')
    } finally {
      setReassigning(false)
    }
  }

  // ── Handle Removing an Assignment ──
  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm('Are you sure you want to remove this teacher from the course?')) return
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to remove assignment.')
        return
      }
      setSuccess('Assignment removed successfully.')
      setTimeout(() => setSuccess(''), 3000)
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Network error.')
    }
  }

  // ── Handle Manual Assignment (List View) ──
  async function handleConfirmAssign() {
    if (!assignCourseTarget || !assignTeacherId) return
    setAssigning(true)
    setError('')
    try {
      const res = await fetch('/api/assignments/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: assignTeacherId, course_id: assignCourseTarget.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to assign teacher.')
        return
      }
      setSuccess('Teacher assigned successfully.')
      setTimeout(() => setSuccess(''), 3000)
      setAssignCourseTarget(null)
      setAssignTeacherId('')
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Network error.')
    } finally {
      setAssigning(false)
    }
  }

  // Statistics
  const totalCourses = courses.length
  const assignedCourses = courses.filter((c) => c.is_assigned).length
  const unassignedCourses = totalCourses - assignedCourses

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* ── Top Bar with Stats & Filter ── */}
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
            <Sparkles size={20} color="#c9a227" /> Faculty Course Assignment
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>
            Assign faculty to department courses. Connect teachers to courses on canvas or list view.
          </p>
        </div>

        {/* Stats Pill Strip */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#64748b' }}>Total Courses: </span>
            <strong style={{ color: '#0f172a' }}>{totalCourses}</strong>
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#15803d' }}>Assigned: </span>
            <strong style={{ color: '#166534' }}>{assignedCourses}</strong>
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: unassignedCourses > 0 ? '#fffbeb' : '#f8fafc',
              border: unassignedCourses > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
              fontSize: '12px',
            }}
          >
            <span style={{ color: unassignedCourses > 0 ? '#b45309' : '#64748b' }}>Unassigned: </span>
            <strong style={{ color: unassignedCourses > 0 ? '#b45309' : '#0f172a' }}>{unassignedCourses}</strong>
          </div>
        </div>
      </div>

      {/* ── Filters and Search ── */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search faculty or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                minWidth: '240px',
                outline: 'none',
              }}
            />
          </div>

          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: '#fff',
              outline: 'none',
            }}
          >
            <option value="all">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#475569',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Canvas / List view toggle hint on desktop */}
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          {isMobileView ? (
            <span>📱 Showing Touch List View</span>
          ) : (
            <span>🖥️ Canvas View (Drag node handle to assign)</span>
          )}
        </div>
      </div>

      {/* ── Banners ── */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#fee2e2',
            border: '1px solid #f87171',
            color: '#b91c1c',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#dcfce7',
            border: '1px solid #86efac',
            color: '#15803d',
            fontSize: '13px',
          }}
        >
          {success}
        </div>
      )}

      {/* ── Main View: Interactive Node Canvas (>= 1024px) ── */}
      {!isMobileView ? (
        <div
          style={{
            height: '650px',
            width: '100%',
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 10,
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(4px)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '11px',
              color: '#475569',
            }}
          >
            <strong>Tip:</strong> Drag from right handle of <b>Teacher</b> to left handle of <b>Course</b>.
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background gap={16} size={1} color="#cbd5e1" />
            <Controls />
          </ReactFlow>
        </div>
      ) : (
        /* ── Fallback View: Touch-Friendly Card List (< 1024px) ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: course.is_assigned ? '1.5px solid #e2e8f0' : '2px dashed #f59e0b',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: course.is_assigned ? '#e0f2fe' : '#fef3c7',
                    color: course.is_assigned ? '#0369a1' : '#b45309',
                  }}
                >
                  {course.course_code}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Sem {course.semester} • {course.credits} Credits
                </span>
              </div>

              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{course.title}</h4>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>Category: {course.category}</p>
              </div>

              {/* Assigned Teachers List */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Assigned Faculty:
                </div>
                {course.assignments.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: '#d97706',
                      padding: '4px 0',
                    }}
                  >
                    <AlertTriangle size={14} />
                    <span>No faculty assigned yet</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {course.assignments.map((a) => (
                      <div
                        key={a.assignment_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '6px 10px',
                        }}
                      >
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{a.teacher_name}</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>{a.teacher_email}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setReassignTarget(a)
                              setReassignTeacherId('')
                            }}
                            title="Reassign"
                            style={{
                              background: '#e0f2fe',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              color: '#0284c7',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Edit2 size={12} /> Reassign
                          </button>
                          <button
                            onClick={() => handleRemoveAssignment(a.assignment_id)}
                            title="Remove"
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              color: '#dc2626',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assign Faculty Button */}
              <button
                onClick={() => {
                  setAssignCourseTarget(course)
                  setAssignTeacherId('')
                }}
                style={{
                  marginTop: 'auto',
                  background: '#f0f4f8',
                  border: '1px dashed #002147',
                  borderRadius: '8px',
                  padding: '8px',
                  color: '#002147',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={14} /> Assign Faculty Member
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Mid-Semester Reassignment Modal ── */}
      {reassignTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Mid-Semester Faculty Reassignment</h3>
            <p className={styles.modalSubtitle}>
              Reassigning an existing assignment row updates the teacher for subsequent period attendance marking.
            </p>

            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Currently Assigned To:</div>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{reassignTarget.teacher_name}</strong>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{reassignTarget.teacher_email}</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Select New Teacher *</label>
              <select
                className={styles.input}
                value={reassignTeacherId}
                onChange={(e) => setReassignTeacherId(e.target.value)}
              >
                <option value="">— Select Replacement Faculty —</option>
                {faculty
                  .filter((f) => f.id !== reassignTarget.teacher_id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name} ({f.email})
                    </option>
                  ))}
              </select>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setReassignTarget(null)}
                disabled={reassigning}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleConfirmReassign}
                disabled={!reassignTeacherId || reassigning}
              >
                {reassigning ? 'Reassigning...' : 'Confirm Reassignment →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Faculty Member Modal (List View) ── */}
      {assignCourseTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Assign Faculty to Course</h3>
            <p className={styles.modalSubtitle}>
              Assign faculty member to <strong>{assignCourseTarget.course_code}: {assignCourseTarget.title}</strong>
            </p>

            <div className={styles.field}>
              <label className={styles.label}>Select Faculty Member *</label>
              <select
                className={styles.input}
                value={assignTeacherId}
                onChange={(e) => setAssignTeacherId(e.target.value)}
              >
                <option value="">— Choose Faculty Member —</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.full_name} ({f.email})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setAssignCourseTarget(null)}
                disabled={assigning}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleConfirmAssign}
                disabled={!assignTeacherId || assigning}
              >
                {assigning ? 'Assigning...' : 'Assign Faculty →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
