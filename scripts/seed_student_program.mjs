import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'

// Inline .env file parser to avoid third-party dependencies
try {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)?$/)
      if (match) {
        const key = match[1].trim()
        let val = (match[2] || '').trim()
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
        process.env[key] = val
      }
    }
  }
} catch (e) {
  console.log('Note: Failed to parse .env file natively', e)
}

async function seed() {
  const uri = process.env.MONGODB_URI
  if (!uri || uri.includes('<db_password>')) {
    console.error('ERROR: MONGODB_URI in .env is missing or invalid.')
    process.exit(1)
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri)
  console.log('Connected!')

  const db = mongoose.connection.db

  // 1. Fetch Mangattuparamba campus
  const campus = await db.collection('campuses').findOne({ name: /Mangattuparamba/i })
  if (!campus) {
    console.error('ERROR: Mangattuparamba campus not found. Please run seedcampus.mjs first.')
    process.exit(1)
  }

  // 2. Fetch IST department
  const department = await db.collection('departments').findOne({ code: 'IST' })
  if (!department) {
    console.error('ERROR: Department of Information Science & Technology (IST) not found. Please run seeddepartments.mjs first.')
    process.exit(1)
  }

  // 3. Update HOD user
  console.log('Updating Computer Science HOD user...')
  await db.collection('users').updateOne(
    { email: 'hod.cs@kannuruniversity.ac.in' },
    {
      $set: {
        department_id: department._id,
        campus_id: campus._id,
        updatedAt: new Date()
      }
    }
  )

  // 4. Create/Update program MSCCS
  console.log('Creating/Updating program MSCCS...')
  await db.collection('programs').deleteOne({ code: 'MSCCS' })
  const programResult = await db.collection('programs').insertOne({
    name: 'M.Sc. Computer Science',
    code: 'MSCCS',
    department_id: department._id,
    semesters: 4,
    papers_per_semester: 3, // exactly 3 papers per semester to choose
    eligibility: JSON.stringify(['B.Sc. Computer Science or BCA or equivalent', 'Minimum 55% marks or CGPA 5.5']),
    createdAt: new Date(),
    updatedAt: new Date()
  })
  const programId = programResult.insertedId

  // 5. Create courses for MSCCS Sem 1
  console.log('Inserting test courses for MSCCS Sem 1...')
  const coursesData = [
    {
      course_code: 'MSCCS101DSC',
      title: 'Mathematical Foundations of Computer Science',
      department_id: department._id,
      program_id: programId,
      semester: 1,
      credits: 4,
      category: 'DSC',
      tag: null,
      seat_limit: 30,
      prerequisites: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      course_code: 'MSCCS102DSC',
      title: 'Advanced Data Structures and Algorithms',
      department_id: department._id,
      program_id: programId,
      semester: 1,
      credits: 4,
      category: 'DSC',
      tag: null,
      seat_limit: 30,
      prerequisites: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      course_code: 'MSCCS103DSC',
      title: 'Advanced Database Management Systems',
      department_id: department._id,
      program_id: programId,
      semester: 1,
      credits: 4,
      category: 'DSC',
      tag: null,
      seat_limit: 30,
      prerequisites: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      course_code: 'MSCCS104DSC',
      title: 'Modern Software Engineering',
      department_id: department._id,
      program_id: programId,
      semester: 1,
      credits: 3,
      category: 'DSC',
      tag: null,
      seat_limit: 30,
      prerequisites: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      course_code: 'MSCCS105DSC',
      title: 'Artificial Intelligence & Neural Networks',
      department_id: department._id,
      program_id: programId,
      semester: 1,
      credits: 3,
      category: 'DSC',
      tag: null,
      seat_limit: 30,
      prerequisites: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  await db.collection('courses').deleteMany({ program_id: programId })
  await db.collection('courses').insertMany(coursesData)

  // 6. Update student user Jane Smith
  console.log('Updating test student Jane Smith...')
  await db.collection('users').updateOne(
    { email: 'student@kannuruniversity.ac.in' },
    {
      $set: {
        department_id: department._id,
        campus_id: campus._id,
        program_id: programId,
        current_semester: 1,
        roll_number: 'MSCCS-2026-001',
        cap_application_number: 'CAP202698765',
        updatedAt: new Date()
      }
    }
  )

  console.log('\n✅ New Seed completed successfully!')
  console.log('Mapped: HOD & Jane Smith (Student) to IST department & MSCCS program.')
  console.log('Created: Program MSCCS with 3 papers per semester and 5 courses in Sem 1.')
  process.exit(0)
}

seed().catch(console.error)
