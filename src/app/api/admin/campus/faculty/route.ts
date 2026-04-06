import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AddFacultySchema } from '@/modules/admin/schemas/addFacultySchema'
import { createFacultyUser } from '@/modules/admin/services/createFacultyUser'

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

  const { data: superadmin } = await supabase
    .from('admins')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!superadmin || superadmin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const result = AddFacultySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const response = await createFacultyUser({
    ...result.data,
    campus_id: director.campus_id,
  })

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json({
    success: true,
    message: response.message,
  })
}