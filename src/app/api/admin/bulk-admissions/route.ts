import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { processBulkUpload } from '@/modules/admin/services/processBulkUpload'

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
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify HOD
  const { data: hod } = await supabase
    .from('faculty')
    .select('role, department_id, campus_id')
    .eq('id', user.id)
    .single()

  if (!hod || hod.role !== 'hod') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!hod.department_id) {
    return NextResponse.json({ error: 'HOD has no department assigned' }, { status: 400 })
  }

  // Get academic year from campus settings
  const { data: settings } = await supabase
    .from('campus_settings')
    .select('academic_year')
    .eq('campus_id', hod.campus_id)
    .single()

  const academic_year = settings?.academic_year ?? new Date().getFullYear().toString()

  const body = await request.json()

  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Payload must be an array of rows' },
      { status: 400 }
    )
  }

  const response = await processBulkUpload(
    body,
    hod.department_id,
    hod.campus_id,
    academic_year
  )

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json({
    success: true,
    inserted_count: response.inserted_count,
    error_count: response.error_count,
    errors: response.errors,
  })
}