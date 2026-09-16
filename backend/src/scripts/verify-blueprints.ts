import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { DataSeedService } from '../modules/admin/data-seed.service'
import { RegistrationsService } from '../modules/registrations/registrations.service'
import { SupabaseService } from '../core/database/supabase.service'
import { SLOT_RULES } from '../core/constants/courseCategories'
import { Pathway } from '../core/types/course.types'

async function run() {
  console.log('🚀 Bootstrapping NestJS application context...')
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] })
  
  const seedService = app.get(DataSeedService)
  const regService = app.get(RegistrationsService)
  const supabaseService = app.get(SupabaseService)

  console.log('\n📦 Step 1: Force syncing courses (64) and blueprints (13)...')
  await seedService.seedCoursesAndBlueprints(true)

  console.log('\n🔍 Step 2: Fetching authoritative reference data from Supabase...')
  const [{ data: depts }, { data: blueprints }, { data: allCourses }] = await Promise.all([
    supabaseService.admin.from('departments').select('id, name, code'),
    supabaseService.admin.from('semester_blueprints').select('*').order('semester', { ascending: true }),
    supabaseService.admin.from('courses').select('id, course_code, title, department_id, semester, credits, category, tag'),
  ])

  if (!depts || !blueprints || !allCourses) {
    console.error('❌ Failed to fetch database entities.')
    await app.close()
    process.exit(1)
  }

  console.log(`✅ Loaded ${depts.length} departments, ${blueprints.length} blueprints, and ${allCourses.length} courses.`)

  const deptMap = new Map(depts.map(d => [d.code, d.id]))
  const deptIdToName = new Map(depts.map(d => [d.id, d.name]))
  const deptIdToCode = new Map(depts.map(d => [d.id, d.code]))

  console.log('\n🧪 Step 3: Simulating dynamic slot resolution for all 13 blueprints across all 7 departments...')

  let totalSlotsTested = 0
  let totalPassed = 0
  let totalFailed = 0
  const failureDetails: string[] = []

  for (let idx = 0; idx < blueprints.length; idx++) {
    const bp = blueprints[idx]
    const deptCode = deptIdToCode.get(bp.department_id) || 'UNKNOWN'
    const deptName = deptIdToName.get(bp.department_id) || 'UNKNOWN'
    const pathways = (bp.pathways as Pathway[]) || []
    
    console.log(`\n─────────────────────────────────────────────────────────────────────────────`)
    console.log(`[Blueprint ${idx + 1}/13] Dept: ${deptName} (${deptCode}) | Sem: ${bp.semester} | Credit Limits: ${bp.min_credits}–${bp.max_credits}`)

    if (pathways.length === 0) {
      console.error(`  ❌ ERROR: Blueprint has no pathways configured!`)
      totalFailed++
      continue
    }

    const pathway = pathways[0]
    const mockStudent: any = {
      userId: '00000000-0000-0000-0000-000000000000',
      campus_id: 'feed55c6-deea-46b7-9fa1-a97cfabf0838',
      department_id: bp.department_id,
      current_semester: bp.semester,
      role: 'student',
    }

    try {
      const resolved = await regService.resolvePathwaySlots(pathway, mockStudent, deptMap, deptIdToName)
      let simulatedTotalCredits = 0

      for (const slot of resolved) {
        totalSlotsTested++
        const isFixed = slot.rule === SLOT_RULES.FIXED || slot.rule === SLOT_RULES.CAMPUS_FIXED || slot.rule === SLOT_RULES.AEC_ELECT

        if (isFixed) {
          if (!slot.course) {
            const msg = `❌ [${deptCode} S${bp.semester}] Slot "${slot.name}" (${slot.rule}) FAILED: Fixed course not found!`
            console.error(`    ${msg}`)
            failureDetails.push(msg)
            totalFailed++
          } else {
            simulatedTotalCredits += slot.course.credits
            console.log(`    ✓ Slot ${slot.slot} [${slot.name}]: FIXED -> ${slot.course.course_code} - ${slot.course.title} (${slot.course.credits} cr)`)
            totalPassed++
          }
        } else {
          // Elective slot
          const opts = slot.options || []
          if (opts.length === 0) {
            const msg = `❌ [${deptCode} S${bp.semester}] Slot "${slot.name}" (${slot.rule}) FAILED: 0 available course options!`
            console.error(`    ${msg}`)
            failureDetails.push(msg)
            totalFailed++
          } else {
            const topChoice = opts[0]
            simulatedTotalCredits += topChoice.credits
            console.log(`    ✓ Slot ${slot.slot} [${slot.name}]: ${slot.rule} -> ${opts.length} options available. Top: ${topChoice.course_code} (${topChoice.credits} cr)`)
            totalPassed++
          }
        }
      }

      console.log(`  📊 Simulated Total Registered Credits: ${simulatedTotalCredits} (Allowed: ${bp.min_credits}–${bp.max_credits})`)
      if (simulatedTotalCredits < bp.min_credits || simulatedTotalCredits > bp.max_credits) {
        const msg = `❌ [${deptCode} S${bp.semester}] Credit bounds mismatch! Got ${simulatedTotalCredits}, expected ${bp.min_credits}–${bp.max_credits}`
        console.error(`  ${msg}`)
        failureDetails.push(msg)
        totalFailed++
      } else {
        console.log(`  🎉 Credit boundary check PASSED!`)
      }

    } catch (err: any) {
      const msg = `❌ [${deptCode} S${bp.semester}] Exception resolving slots: ${err.message}`
      console.error(`  ${msg}`)
      failureDetails.push(msg)
      totalFailed++
    }
  }

  console.log(`\n═════════════════════════════════════════════════════════════════════════════`)
  console.log(`                       BLUEPRINT RESOLUTION VERIFICATION SUMMARY`)
  console.log(`═════════════════════════════════════════════════════════════════════════════`)
  console.log(`  Total Slot Validations Tested : ${totalSlotsTested}`)
  console.log(`  Total Checks Passed           : ${totalPassed}`)
  console.log(`  Total Failures                : ${totalFailed}`)

  if (failureDetails.length > 0) {
    console.log(`\n  Failure Details:`)
    failureDetails.forEach(f => console.log(`    ${f}`))
  }

  console.log(`═════════════════════════════════════════════════════════════════════════════\n`)

  await app.close()
  if (totalFailed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err)
  process.exit(1)
})
