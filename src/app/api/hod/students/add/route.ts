import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { verifyHod } from '@/core/auth/verifyRole'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const AddStudentSchema = z.object({
  cap_application_number: z.string().min(1, 'CAP number is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email().optional().or(z.literal('')),
})

export async function POST(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const result = AddStudentSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  // Use session client for campus_settings read — RLS applies
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  )

  const { data: settings } = await supabase
    .from('campus_settings')
    .select('academic_year')
    .eq('campus_id', auth.campus_id)
    .single()

  const { error: insertError } = await supabase
    .from('admissions_master')
    .insert({
      cap_application_number: result.data.cap_application_number,
      date_of_birth: result.data.date_of_birth,
      full_name: result.data.full_name,
      email: result.data.email || null,
      department_id: auth.department_id,
      campus_id: auth.campus_id,
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
    console.error('hod/students/add POST failed:', insertError)
    return NextResponse.json({ error: 'Failed to add student' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Student added successfully' })
}
