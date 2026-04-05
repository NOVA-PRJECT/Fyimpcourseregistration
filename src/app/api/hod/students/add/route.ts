import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { z } from 'zod'

const AddStudentSchema = z.object({
  cap_application_number: z.string().min(1, 'CAP number is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email().optional().or(z.literal('')),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: hod } = await supabase
    .from('faculty')
    .select('role, department_id, campus_id')
    .eq('id', user.id)
    .single()

  if (!hod || hod.role !== 'hod') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const result = AddStudentSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  // Get academic year from campus settings
  const { data: settings } = await supabase
    .from('campus_settings')
    .select('academic_year')
    .eq('campus_id', hod.campus_id)
    .single()

  const { error: insertError } = await supabaseAdmin
    .from('admissions_master')
    .insert({
      cap_application_number: result.data.cap_application_number,
      date_of_birth: result.data.date_of_birth,
      full_name: result.data.full_name,
      email: result.data.email || null,
      department_id: hod.department_id,
      campus_id: hod.campus_id,
      academic_year: settings?.academic_year ?? new Date().getFullYear().toString(),
      is_claimed: false,
    })

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'This CAP number already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to add student' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: 'Student added successfully' })
}