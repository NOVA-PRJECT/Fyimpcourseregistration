import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './core/database/supabaseAdmin'

async function test() {
  console.log('Resetting vaika\'s password...');
  await supabaseAdmin.auth.admin.updateUserById('999076cd-9223-4373-85bc-72a79cd3a1e0', {
    password: 'SecurePassword123'
  })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  
  console.log('Signing in as vaika...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'vaika@gmail.com',
    password: 'SecurePassword123'
  })

  if (authError || !authData.session) {
    console.error('Auth error:', authError)
    return
  }

  console.log('Successfully authenticated as vaika! Access Token length:', authData.session.access_token.length)

  // Set the session on our client
  const { data: courses, error: coursesError } = await supabase.from('courses').select('id, course_code').limit(5)
  console.log('Courses data:', courses, 'Err:', coursesError)

  const { data: depts, error: deptsError } = await supabase.from('departments').select('id, code').limit(5)
  console.log('Departments data:', depts, 'Err:', deptsError)

  const { data: blueprints, error: blueprintsError } = await supabase.from('semester_blueprints').select('id').limit(5)
  console.log('Blueprints data:', blueprints, 'Err:', blueprintsError)
}

test().catch(console.error)
