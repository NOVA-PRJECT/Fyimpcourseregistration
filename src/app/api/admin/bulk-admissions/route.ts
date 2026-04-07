import { NextRequest, NextResponse } from 'next/server'
import { processBulkUpload } from '@/modules/admin/services/processBulkUpload'
import { verifyHod } from '@/core/auth/verifyRole'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {

  // Auth — verified HOD only
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Use session client so RLS applies — HOD can only read their own campus settings
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

  // Get academic year from campus settings
  const { data: settings } = await supabase
    .from('campus_settings')
    .select('academic_year')
    .eq('campus_id', auth.campus_id)
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
    auth.department_id,
    auth.campus_id,
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
