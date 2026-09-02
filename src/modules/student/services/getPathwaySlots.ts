import { Pathway } from '@/core/types/course.types'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { VerifiedStudent } from '@/core/auth/verifyRole'
import { resolvePathwaySlots } from './getBlueprint'

export async function getPathwaySlots(auth: VerifiedStudent, pathwayId: string) {
  const supabase = await getSupabaseServerClient()

  // Parallel fetch: Blueprint + Departments
  const [
    { data: blueprint, error: blueprintError },
    { data: departmentsData }
  ] = await Promise.all([
    supabase
      .from('semester_blueprints')
      .select('*')
      .eq('department_id', auth.department_id)
      .eq('semester', auth.current_semester)
      .single(),
    supabase
      .from('departments')
      .select('id, name, code')
  ])

  if (blueprintError || !blueprint) {
    return { success: false, error: 'Blueprint not found for this semester', status: 404 }
  }

  const pathways = blueprint.pathways as Pathway[] | null
  if (!pathways || pathways.length === 0) {
    return { success: false, error: 'Blueprint not configured', status: 400 }
  }

  const pathway = pathways.find(p => p.id === pathwayId)
  if (!pathway) {
    return { success: false, error: 'Pathway not found', status: 400 }
  }

  const deptMap = new Map(departmentsData?.map(d => [d.code, d.id]) || [])
  const deptIdToName = new Map(departmentsData?.map(d => [d.id, d.name]) || [])

  const resolved = await resolvePathwaySlots(pathway, auth, supabase, deptMap, deptIdToName)

  if (!resolved.success) {
    return { success: false, error: resolved.error, status: resolved.status }
  }

  return {
    success: true,
    data: {
      pathway_id: pathway.id,
      pathway_name: pathway.name,
      slots: resolved.slots,
    }
  }
}
