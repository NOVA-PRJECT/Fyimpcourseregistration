import { NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Blueprint } from '@/core/database/models/Blueprint'
import { Course } from '@/core/database/models/Course'
import { Preference } from '@/core/database/models/Preference'
import { User } from '@/core/database/models/User'
import { Department } from '@/core/database/models/Department'
import { verifyRole } from '@/core/security/auth'
import { SLOT_RULES } from '@/core/constants/courseCategories'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { user, error } = await verifyRole(['student'])
  if (error) return error

  await connectDB()

  // 1. Get student details
  const student = await User.findById(user.id).lean()
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const semester = student.current_semester ?? 1
  const department_id = student.department_id

  if (!department_id) {
    return NextResponse.json({ error: 'Student has no department assigned' }, { status: 400 })
  }

  // 2. Parallel fetch: Blueprint + all Departments
  const [blueprint, allDepartments] = await Promise.all([
    Blueprint.findOne({
      department_id: new mongoose.Types.ObjectId(department_id),
      semester,
    }).lean(),
    Department.find().lean(),
  ])

  if (!blueprint) {
    return NextResponse.json({ error: 'No blueprint configured for your semester yet' }, { status: 404 })
  }

  // 3. Build department code → _id map for O(1) lookup
  const deptMap = new Map(allDepartments.map(d => [d.code, d._id.toString()]))

  // 4. Parse slots — filter out unconfigured ones
  const slotsInfo = blueprint.slots
    .map(s => ({
      slot: s.slot,
      rule: s.rule,
      target: s.target,
      name: s.name ?? `Paper ${s.slot}`,
    }))
    .filter(s => s.rule && s.target)

  if (slotsInfo.length === 0) {
    return NextResponse.json(
      { error: 'Blueprint has no configured slots for this semester' },
      { status: 400 }
    )
  }

  // 5. Batch-fetch all FIXED courses first
  const fixedTargets = slotsInfo
    .filter(s => s.rule === SLOT_RULES.FIXED)
    .map(s => s.target)

  let fixedCourseIds: mongoose.Types.ObjectId[] = []
  const fixedCoursesMap: Record<string, any> = {}

  if (fixedTargets.length > 0) {
    const fixedCourses = await Course.find({
      course_code: { $in: fixedTargets },
    }).lean()

    fixedCourseIds = fixedCourses.map(c => c._id)
    for (const c of fixedCourses) {
      fixedCoursesMap[c.course_code] = c
    }
  }

  // 6. Helper — shape a course for the response
  function shapeCourse(c: any) {
    return {
      id: c._id.toString(),
      course_code: c.course_code,
      title: c.title,
      credits: c.credits,
    }
  }

  // 7. Base exclusion filter for elective queries
  const baseExclude = fixedCourseIds.length > 0
    ? { _id: { $nin: fixedCourseIds } }
    : {}

  // 8. Resolve all slots + existing preference in parallel
  const [existingPreference, ...resolvedSlots] = await Promise.all([

    Preference.findOne({
      student_id: new mongoose.Types.ObjectId(user.id),
      semester,
    }).lean(),

    ...slotsInfo.map(async ({ slot, rule, target, name }) => {

      // FIXED — already resolved from batch fetch
      if (rule === SLOT_RULES.FIXED) {
        const course = fixedCoursesMap[target] ?? null
        return {
          slot,
          rule,
          name,
          course: course ? shapeCourse(course) : null,
        }
      }

      // DEPT_RESTRICTED — specific dept, DSC/DSE only
      if (rule === SLOT_RULES.DEPT_RESTRICTED) {
        const deptId = deptMap.get(target)
        if (!deptId) return { slot, rule, name, options: [] }
        const options = await Course.find({
          ...baseExclude,
          department_id: new mongoose.Types.ObjectId(deptId),
          semester,
          category: { $in: ['DSC', 'DSE'] },
        }).lean()
        return { slot, rule, name, options: options.map(shapeCourse) }
      }

      // EXCLUDE_DEPT — NOT from specific dept, DSC/DSE only
      if (rule === SLOT_RULES.EXCLUDE_DEPT) {
        const deptId = deptMap.get(target)
        if (!deptId) return { slot, rule, name, options: [] }
        const options = await Course.find({
          ...baseExclude,
          department_id: { $ne: new mongoose.Types.ObjectId(deptId) },
          semester,
          category: { $in: ['DSC', 'DSE'] },
        }).lean()
        return { slot, rule, name, options: options.map(shapeCourse) }
      }

      // POOL_RESTRICTED — own dept, filtered by tag
      if (rule === SLOT_RULES.POOL_RESTRICTED) {
        const options = await Course.find({
          ...baseExclude,
          department_id: new mongoose.Types.ObjectId(department_id),
          tag: target,
        }).lean()
        return { slot, rule, name, options: options.map(shapeCourse) }
      }

      // GLOBAL_BASKET — other depts by tag (exclude own dept only if MDC tag)
      if (rule === SLOT_RULES.GLOBAL_BASKET) {
        const filter: any = { ...baseExclude, tag: target }
        if (target.includes('MDC')) {
          filter.department_id = { $ne: new mongoose.Types.ObjectId(department_id) }
        }
        const options = await Course.find(filter).lean()
        return { slot, rule, name, options: options.map(shapeCourse) }
      }

      return { slot, rule, name, options: [] }
    }),
  ])

  return NextResponse.json({
    data: {
      min_credits: blueprint.min_credits,
      max_credits: blueprint.max_credits,
      slots: resolvedSlots,
    },
    existing: existingPreference ?? null,
  })
}
