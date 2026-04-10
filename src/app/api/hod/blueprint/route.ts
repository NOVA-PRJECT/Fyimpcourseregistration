import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { verifyHod } from '@/core/auth/verifyRole'

export const dynamic = 'force-dynamic'

// GET — fetch blueprint for dept + semester
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
    .from('semester_blueprints')
    .select('*')
    .eq('department_id', auth.department_id)
    .eq('semester', Number(semester))
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('hod/blueprint GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch blueprint' }, { status: 500 })
  }

  return NextResponse.json(data ?? null)
}

// PUT — save blueprint changes (upsert)
export async function PUT(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const { semester, min_credits, max_credits, slots } = body

  if (!semester || !slots) {
    return NextResponse.json({ error: 'Semester and slots are required' }, { status: 400 })
  }

  const payload: Record<string, any> = {
    department_id: auth.department_id,
    semester: Number(semester),
    min_credits: min_credits ?? 18,
    max_credits: max_credits ?? 26,
  }

  for (let i = 1; i <= 6; i++) {
    const slot = slots.find((s: any) => s.slot === i)
    payload[`slot_${i}_rule`] = slot?.rule || null
    payload[`slot_${i}_target`] = slot?.target || null
    payload[`slot_${i}_name`] = slot?.name || null
  }

  const supabase = await getSupabaseServerClient()
  const { error } = await supabase
    .from('semester_blueprints')
    .upsert(payload, { onConflict: 'department_id,semester' })

  if (error) {
    console.error('hod/blueprint PUT failed:', error)
    return NextResponse.json({ error: 'Failed to save blueprint' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Blueprint saved successfully' })
}
