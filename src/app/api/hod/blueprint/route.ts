import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function verifyHod(cookieStore: any) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: any) {
          cookiesToSet.forEach(({ name, value, options }: any) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: hod } = await supabase
    .from('faculty')
    .select('role, department_id, campus_id')
    .eq('id', user.id)
    .single()
  if (!hod || hod.role !== 'hod') return null
  return { user, hod }
}

// GET — fetch blueprint for dept + semester
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const result = await verifyHod(cookieStore)
  if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const semester = searchParams.get('semester')
  if (!semester) return NextResponse.json({ error: 'Semester required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('semester_blueprints')
    .select('*')
    .eq('department_id', result.hod.department_id)
    .eq('semester', Number(semester))
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Failed to fetch blueprint' }, { status: 500 })
  }

  return NextResponse.json(data ?? null)
}

// PUT — save blueprint changes (upsert)
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const result = await verifyHod(cookieStore)
  if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { semester, min_credits, max_credits, slots } = body

  if (!semester || !slots) {
    return NextResponse.json({ error: 'Semester and slots are required' }, { status: 400 })
  }

  // Build upsert payload
  const payload: Record<string, any> = {
    department_id: result.hod.department_id,
    semester: Number(semester),
    min_credits: min_credits ?? 18,
    max_credits: max_credits ?? 26,
  }

  // slots is array of { slot, rule, target, name }
  for (let i = 1; i <= 6; i++) {
    const slot = slots.find((s: any) => s.slot === i)
    payload[`slot_${i}_rule`] = slot?.rule || null
    payload[`slot_${i}_target`] = slot?.target || null
    payload[`slot_${i}_name`] = slot?.name || null
  }

  const { error } = await supabaseAdmin
    .from('semester_blueprints')
    .upsert(payload, { onConflict: 'department_id,semester' })

  if (error) return NextResponse.json({ error: 'Failed to save blueprint' }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Blueprint saved successfully' })
}