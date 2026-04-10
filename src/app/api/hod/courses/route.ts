import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { verifyHod } from '@/core/auth/verifyRole'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CourseSchema = z.object({
  course_code: z.string().min(1, 'Course code is required'),
  title: z.string().min(1, 'Title is required'),
  semester: z.number().int().min(1).max(10),
  credits: z.number().int().min(1),
  category: z.enum(['INT','FWD','RPH','CIP','DSS','DSC','DSE','VAC','SEC','MDC','MOOC','AEC']),
  tag: z.string().optional().or(z.literal('')),
})

// GET — fetch courses for dept + semester
export async function GET(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const semester = searchParams.get('semester')
  if (!semester) {
    return NextResponse.json({ error: 'Semester required' }, { status: 400 })
  }

  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('department_id', auth.department_id)
    .eq('semester', Number(semester))
    .order('category')

  if (error) {
    console.error('hod/courses GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST — add new course
export async function POST(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
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
    console.error('hod/courses POST failed:', error)
    return NextResponse.json({ error: 'Failed to add course' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Course added successfully' })
}

// PUT — edit course
export async function PUT(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const { id, ...rest } = body

  if (!id) {
    return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
  }

  const supabase = await getSupabaseServerClient()

  // Verify course belongs to HOD's department
  const { data: course } = await supabase
    .from('courses')
    .select('department_id')
    .eq('id', id)
    .single()

  if (!course || course.department_id !== auth.department_id) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('courses')
    .update({
      title: rest.title,
      credits: rest.credits,
      category: rest.category,
      tag: rest.tag || null,
    })
    .eq('id', id)

  if (error) {
    console.error('hod/courses PUT failed:', error)
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Course updated successfully' })
}

// DELETE — delete course
export async function DELETE(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { course_id } = await request.json()
  if (!course_id) {
    return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
  }

  const supabase = await getSupabaseServerClient()

  // Verify course belongs to HOD's department
  const { data: course } = await supabase
    .from('courses')
    .select('department_id')
    .eq('id', course_id)
    .single()

  if (!course || course.department_id !== auth.department_id) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', course_id)

  if (error) {
    console.error('hod/courses DELETE failed:', error)
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Course deleted successfully' })
}
