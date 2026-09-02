import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { verifyHod, handleAuthError } from '@/core/auth/verifyRole'
import { z } from 'zod'
import { logServerError } from '@/core/logging/logger'
import { adminCrudLimiter } from '@/core/security/rateLimiter'

export const dynamic = 'force-dynamic'

const CourseSchema = z.object({
  course_code: z.string().min(1, 'Course code is required').max(20, 'Course code must not exceed 20 characters'),
  title: z.string().min(1, 'Title is required').max(150, 'Title must not exceed 150 characters'),
  semester: z.number().int().min(1).max(10),
  credits: z.number().int().min(1),
  category: z.enum(['DSC','DSE','MDC','VAC','SEC','AEC','MOC','MOOC','INT','RPH','FWD','DSS','DMP','CIP']),
  tag: z.string().optional().or(z.literal('')),
})

const UpdateCourseSchema = z.object({
  id: z.string().uuid('Invalid course ID'),
  course_code: z.string().min(1, 'Course code is required').max(20, 'Course code must not exceed 20 characters'),
  title: z.string().min(1, 'Title is required').max(150, 'Title must not exceed 150 characters'),
  credits: z.number().int().min(1),
  category: z.enum(['DSC','DSE','MDC','VAC','SEC','AEC','MOC','MOOC','INT','RPH','FWD','DSS','DMP','CIP']),
  tag: z.string().optional().or(z.literal('')),
})

const DeleteCourseSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
})

// GET — fetch courses for campus depts + AEC for semester
export async function GET(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) return handleAuthError(auth)

  const { searchParams } = new URL(request.url)
  const semester = searchParams.get('semester')
  if (!semester) {
    return NextResponse.json({ error: 'Semester required' }, { status: 400 })
  }

  const supabase = await getSupabaseServerClient()

  // Fetch all department IDs in HOD's campus
  const { data: depts } = await supabase
    .from('departments')
    .select('id')
    .eq('campus_id', auth.campus_id)

  const campusDeptIds = depts && depts.length > 0 ? depts.map(d => d.id) : [auth.department_id]

  const { data, error } = await supabase
    .from('courses')
    .select('*, departments(name, code, campus_id)')
    .or(`department_id.in.(${campusDeptIds.join(',')}),category.eq.AEC`)
    .eq('semester', Number(semester))
    .order('category')

  if (error) {
    logServerError('/api/hod/courses', error, { userId: auth.userId, method: 'GET', semester })
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }

  const mapped = (data ?? []).map((c: any) => ({
    ...c,
    department_name: c.departments?.name ?? '',
    department_code: c.departments?.code ?? '',
    is_own_campus: campusDeptIds.includes(c.department_id),
  }))

  return NextResponse.json(mapped)
}

// POST — add new course
export async function POST(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) return handleAuthError(auth)

  const { success: withinLimit } = await adminCrudLimiter.limit(auth.userId)
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CourseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const supabase = await getSupabaseServerClient()
  const { error } = await supabase
    .from('courses')
    .insert({
      course_code: parsed.data.course_code,
      title: parsed.data.title,
      department_id: auth.department_id,
      semester: parsed.data.semester,
      credits: parsed.data.credits,
      category: parsed.data.category,
      tag: parsed.data.tag || null,
    })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Course code already exists' }, { status: 409 })
    }
    logServerError('/api/hod/courses', error, { userId: auth.userId, method: 'POST', body: parsed.data })
    return NextResponse.json({ error: 'Failed to add course' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Course added successfully' })
}

// PUT — edit course
export async function PUT(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) return handleAuthError(auth)

  const { success: withinLimit } = await adminCrudLimiter.limit(auth.userId)
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = UpdateCourseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { id, ...rest } = parsed.data

  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from('courses')
    .update({
      course_code: rest.course_code,
      title: rest.title,
      credits: rest.credits,
      category: rest.category,
      tag: rest.tag || null,
    })
    .eq('id', id)
    .eq('department_id', auth.department_id)
    .select()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Course code already exists' }, { status: 409 })
    }
    logServerError('/api/hod/courses', error, { userId: auth.userId, method: 'PUT', courseId: id })
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'Course updated successfully' })
}

// DELETE — delete course
export async function DELETE(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) return handleAuthError(auth)

  const { success: withinLimit } = await adminCrudLimiter.limit(auth.userId)
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = DeleteCourseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { course_id } = parsed.data

  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from('courses')
    .delete()
    .eq('id', course_id)
    .eq('department_id', auth.department_id)
    .select()

  if (error) {
    logServerError('/api/hod/courses', error, { userId: auth.userId, method: 'DELETE', courseId: course_id })
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'Course deleted successfully' })
}
