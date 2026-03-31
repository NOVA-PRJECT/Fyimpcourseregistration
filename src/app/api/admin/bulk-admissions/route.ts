import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BulkUploadSchema } from '@/modules/admin/schemas/bulkUploadSchema'
import { processBulkUpload } from '@/modules/admin/services/processBulkUpload'

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

  const { data: admin } = await supabase
    .from('admins')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const result = BulkUploadSchema.safeParse(body)

if (!result.success) {
  return NextResponse.json(
    { error: JSON.stringify(result.error.flatten()), first_row: body[0] },
    { status: 400 }
  )
}
  const response = await processBulkUpload(result.data)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error, errors: response.errors },
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