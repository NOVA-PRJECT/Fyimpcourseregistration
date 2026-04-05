import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const semester = searchParams.get('semester')

  if (!semester) {
    return NextResponse.json({ error: 'Semester required' }, { status: 400 })
  }

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

  const { data: students, error } = await supabase
    .from('students')
    .select('id, full_name, current_semester, cap_application_number')
    .eq('department_id', hod.department_id)
    .eq('campus_id', hod.campus_id)
    .eq('current_semester', Number(semester))
    .order('full_name')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }

  return NextResponse.json(students ?? [])
}