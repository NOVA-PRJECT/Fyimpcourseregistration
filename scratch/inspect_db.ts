import fs from 'fs'
import path from 'path'

// Manually load env variables from root .env
try {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf-8')
  envContent.split('\n').forEach(line => {
    const parts = line.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const value = parts.slice(1).join('=').trim()
      process.env[key] = value
    }
  })
} catch (e) {
  console.error("Failed to load env:", e)
}

import { supabaseAdmin } from '../src/core/database/supabaseAdmin'

async function main() {
  console.log("=== Auth Users ===")
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  if (authError) {
    console.error("Auth error:", authError)
  } else {
    users.forEach(u => {
      console.log(`User ID: ${u.id}, Email: ${u.email}, Role in metadata: ${u.app_metadata?.role}`)
    })
  }

  console.log("\n=== Admins Table ===")
  const { data: admins } = await supabaseAdmin.from('admins').select('*')
  console.log(admins)

  console.log("\n=== Faculty Table ===")
  const { data: faculty } = await supabaseAdmin.from('faculty').select('*')
  console.log(faculty)

  console.log("\n=== Students Table ===")
  const { data: students } = await supabaseAdmin.from('students').select('*')
  console.log(students)
}

main().catch(console.error)
