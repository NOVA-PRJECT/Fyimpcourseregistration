import mongoose from 'mongoose'
import { Preference } from '@/core/database/models/Preference'
import { Allocation } from '@/core/database/models/Allocation'
import { Course } from '@/core/database/models/Course'
import { Marks } from '@/core/database/models/Marks'
import { User } from '@/core/database/models/User'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentMarks {
  [course_code: string]: number
}

interface CourseInfo {
  _id: string
  course_code: string
  title: string
  credits: number
  seat_limit: number
  prerequisites: {
    type: string
    course_code?: string
    min_score?: number
    department_code?: string
  }[]
}

interface SlotResult {
  slot: number
  type: 'FIXED' | 'ELECTIVE'
  status: 'ALLOCATED' | 'UNALLOCATED'
  course_id?: string
  preference_rank_given?: number
  score?: number
  allocated_by: 'SYSTEM' | 'ALGORITHM'
}

export type SemesterType = 'ODD' | 'EVEN'

const ODD_SEMESTERS = [1, 3, 5, 7, 9]
const EVEN_SEMESTERS = [2, 4, 6, 8, 10]

// ── Prerequisite Scorer ───────────────────────────────────────────────────────

function scoreStudent(
  departmentId: string,
  marks: StudentMarks,
  prerequisites: CourseInfo['prerequisites']
): number {
  if (!prerequisites || prerequisites.length === 0) return 0

  let score = 0
  for (const prereq of prerequisites) {
    if (prereq.type === 'PAPER_REQUIRED') {
      if (prereq.course_code && (marks[prereq.course_code] ?? 0) > 0) score++
    } else if (prereq.type === 'PAPER_MIN_SCORE') {
      if (prereq.course_code && prereq.min_score !== undefined) {
        if ((marks[prereq.course_code] ?? 0) >= prereq.min_score) score++
      }
    } else if (prereq.type === 'DEPT_REQUIRED') {
      if (prereq.department_code && departmentId === prereq.department_code) score++
    } else if (prereq.type === 'DEPT_EXCLUDED') {
      if (prereq.department_code && departmentId !== prereq.department_code) score++
    }
  }
  return score
}

// ── Main Engine ───────────────────────────────────────────────────────────────

export async function runAllocation({
  academic_year,
  semester_type,
  allocation_run_id,
}: {
  academic_year: string
  semester_type: SemesterType
  allocation_run_id: mongoose.Types.ObjectId
}) {

  const validSemesters = semester_type === 'ODD' ? ODD_SEMESTERS : EVEN_SEMESTERS

  // 1. Fetch ALL preferences for this academic year + semester cycle
  const preferences = await Preference.find({
    academic_year,
    semester: { $in: validSemesters },
  }).lean()

  if (preferences.length === 0) {
    throw new Error(`No preferences submitted for ${academic_year} ${semester_type} semester`)
  }

  const studentIds = preferences.map(p => p.student_id)

  // 2. Fetch all students + all marks in parallel
  const [students, allMarks] = await Promise.all([
    User.find({ _id: { $in: studentIds } }).lean(),
    Marks.find({ student_id: { $in: studentIds } }).lean(),
  ])

  const studentMap = new Map(students.map(s => [s._id.toString(), s]))

  const marksMap = new Map<string, StudentMarks>()
  for (const mark of allMarks) {
    const sid = mark.student_id.toString()
    if (!marksMap.has(sid)) marksMap.set(sid, {})
    marksMap.get(sid)![mark.course_code] = mark.score
  }

  // 3. Collect all unique course IDs across all preferences
  const allCourseIds = new Set<string>()
  for (const pref of preferences) {
    for (const slot of pref.slots) {
      if (slot.type === 'FIXED' && slot.course_id) {
        allCourseIds.add(slot.course_id.toString())
      } else if (slot.type === 'ELECTIVE' && slot.preferences) {
        for (const p of slot.preferences) {
          allCourseIds.add(p.course_id.toString())
        }
      }
    }
  }

  // 4. Fetch all courses in one query
  const courses = await Course.find({
    _id: { $in: Array.from(allCourseIds).map(id => new mongoose.Types.ObjectId(id)) },
  }).lean()

  const courseMap = new Map<string, CourseInfo>(
    courses.map(c => [c._id.toString(), {
      _id: c._id.toString(),
      course_code: c.course_code,
      title: c.title,
      credits: c.credits,
      seat_limit: c.seat_limit,
      prerequisites: c.prerequisites ?? [],
    }])
  )

  // 5. Initialise result slots for every student
  // student_id → slot_number → SlotResult
  const results = new Map<string, Map<number, SlotResult>>()

  for (const pref of preferences) {
    const sid = pref.student_id.toString()
    const slotMap = new Map<number, SlotResult>()
    for (const slot of pref.slots) {
      slotMap.set(slot.slot, {
        slot: slot.slot,
        type: slot.type,
        status: 'UNALLOCATED',
        allocated_by: 'ALGORITHM',
      })
    }
    results.set(sid, slotMap)
  }

  // 6. ── PHASE 1: Fixed slots ────────────────────────────────────────────────
  // Every student gets their fixed course — seats consumed globally
  const seatsFilled = new Map<string, number>()

  for (const pref of preferences) {
    const sid = pref.student_id.toString()
    const slotMap = results.get(sid)!

    for (const slot of pref.slots) {
      if (slot.type !== 'FIXED' || !slot.course_id) continue

      const courseId = slot.course_id.toString()
      seatsFilled.set(courseId, (seatsFilled.get(courseId) ?? 0) + 1)

      const slotResult = slotMap.get(slot.slot)!
      slotResult.status = 'ALLOCATED'
      slotResult.course_id = courseId
      slotResult.allocated_by = 'SYSTEM'
    }
  }

  // 7. ── PHASE 2: Elective slots — university-wide, course-centric ──────────
  // Find max rank depth across entire university
  let maxRank = 0
  for (const pref of preferences) {
    for (const slot of pref.slots) {
      if (slot.type === 'ELECTIVE' && slot.preferences) {
        for (const p of slot.preferences) {
          if (p.rank > maxRank) maxRank = p.rank
        }
      }
    }
  }

  // Process rank by rank — rank 1 first, then 2, then 3...
  for (let rank = 1; rank <= maxRank; rank++) {

    // Build global course pool for this rank:
    // courseId → [ { student_id, slot_number, submitted_at } ]
    const coursePool = new Map<string, {
      student_id: string
      slot: number
      submitted_at: Date
    }[]>()

    for (const pref of preferences) {
      const sid = pref.student_id.toString()

      for (const slot of pref.slots) {
        if (slot.type !== 'ELECTIVE' || !slot.preferences) continue

        // Skip if student already allocated in this slot
        if (results.get(sid)?.get(slot.slot)?.status === 'ALLOCATED') continue

        const prefAtRank = slot.preferences.find(p => p.rank === rank)
        if (!prefAtRank) continue

        const courseId = prefAtRank.course_id.toString()
        if (!coursePool.has(courseId)) coursePool.set(courseId, [])
        coursePool.get(courseId)!.push({
          student_id: sid,
          slot: slot.slot,
          submitted_at: pref.submitted_at,
        })
      }
    }

    // For each course — score, sort, allocate
    for (const [courseId, candidates] of coursePool) {
      const course = courseMap.get(courseId)
      if (!course || course.seat_limit === 0) continue

      const filled = seatsFilled.get(courseId) ?? 0
      const remainingSeats = course.seat_limit - filled
      if (remainingSeats <= 0) continue

      // Score each candidate
      const scored = candidates.map(candidate => {
        const student = studentMap.get(candidate.student_id)
        const marks = marksMap.get(candidate.student_id) ?? {}
        const score = scoreStudent(
          student?.department_id?.toString() ?? '',
          marks,
          course.prerequisites
        )
        return { ...candidate, score }
      })

      // Descending score, tie-break earliest submission
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.submitted_at.getTime() - b.submitted_at.getTime()
      })

      // Allocate top N — guard against slot already filled
      let allocated = 0
      for (const winner of scored) {
        if (allocated >= remainingSeats) break

        const slotResult = results.get(winner.student_id)?.get(winner.slot)
        if (!slotResult || slotResult.status === 'ALLOCATED') continue

        slotResult.status = 'ALLOCATED'
        slotResult.course_id = courseId
        slotResult.preference_rank_given = rank
        slotResult.score = winner.score
        slotResult.allocated_by = 'ALGORITHM'
        allocated++
      }

      seatsFilled.set(courseId, filled + allocated)
    }
  }

  // 8. ── Save to DB ──────────────────────────────────────────────────────────
  const allocationDocs = []

  for (const pref of preferences) {
    const sid = pref.student_id.toString()
    const student = studentMap.get(sid)
    if (!student) continue

    const slots = Array.from(results.get(sid)!.values())

    const totalCredits = slots.reduce((sum, slot) => {
      if (slot.status === 'ALLOCATED' && slot.course_id) {
        return sum + (courseMap.get(slot.course_id)?.credits ?? 0)
      }
      return sum
    }, 0)

    allocationDocs.push({
      student_id: new mongoose.Types.ObjectId(sid),
      department_id: pref.department_id,
      campus_id: pref.campus_id,
      semester: pref.semester,
      semester_type,
      academic_year,
      allocation_run_id,
      total_credits: totalCredits,
      slots: slots.map(slot => ({
        slot: slot.slot,
        type: slot.type,
        status: slot.status,
        course_id: slot.course_id ? new mongoose.Types.ObjectId(slot.course_id) : undefined,
        preference_rank_given: slot.preference_rank_given,
        score: slot.score,
        allocated_by: slot.allocated_by,
      })),
    })
  }

  await Allocation.insertMany(allocationDocs)

  // 9. Summary
  const totalStudents = allocationDocs.length
  const fullyAllocated = allocationDocs.filter(d =>
    d.slots.every(s => s.type === 'FIXED' || s.status === 'ALLOCATED')
  ).length
  const unallocatedCount = allocationDocs.filter(d =>
    d.slots.some(s => s.type === 'ELECTIVE' && s.status === 'UNALLOCATED')
  ).length

  return {
    total_students: totalStudents,
    fully_allocated: fullyAllocated,
    unallocated_count: unallocatedCount,
    allocation_run_id: allocation_run_id.toString(),
  }
}
