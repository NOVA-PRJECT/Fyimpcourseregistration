import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

export async function POST() {

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

  const { data: director } = await supabase
    .from('faculty')
    .select('role, campus_id')
    .eq('id', user.id)
    .single()

  if (!director || director.role !== 'campus_director') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data: promotedCount, error } = await supabaseAdmin
    .rpc('promote_campus_students', { p_campus_id: director.campus_id })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to promote students', details: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    promoted_count: promotedCount,
    message: `${promotedCount} students promoted to next semester`,
  })
}