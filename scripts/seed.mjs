import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<db_password>')) {
    console.error('ERROR: MONGODB_URI in .env.local is missing or invalid. Please set the correct password.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected!');

  const db = mongoose.connection.db;

  const passwordHash = await bcrypt.hash('password123', 12);

  const users = [
    {
      full_name: 'Super Admin',
      email: 'admin@kannuruniversity.ac.in',
      password: passwordHash,
      role: 'superadmin',
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      full_name: 'Campus Director',
      email: 'director@kannuruniversity.ac.in',
      password: passwordHash,
      role: 'campus_director',
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      full_name: 'Computer Science HOD',
      email: 'hod.cs@kannuruniversity.ac.in',
      password: passwordHash,
      role: 'hod',
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      full_name: 'John Doe (Teacher)',
      email: 'teacher@kannuruniversity.ac.in',
      password: passwordHash,
      role: 'teaching_staff',
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      full_name: 'Jane Smith (Student)',
      email: 'student@kannuruniversity.ac.in',
      password: passwordHash,
      role: 'student',
      current_semester: 1,
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const usersCollection = db.collection('users');
  
  console.log('Clearing old test users...');
  await usersCollection.deleteMany({ email: { $in: users.map(u => u.email) } });

  console.log('Inserting fresh test users...');
  await usersCollection.insertMany(users);
  
  console.log('\n✅ Database seeded with test users!');
  console.log('--------------------------------------------------');
  console.log('All test accounts use the same password: password123');
  console.log('--------------------------------------------------');
  users.forEach(u => console.log(`Role: ${u.role.padEnd(16)} | Email: ${u.email}`));
  console.log('--------------------------------------------------');

  process.exit(0);
}

seed().catch(console.error);
