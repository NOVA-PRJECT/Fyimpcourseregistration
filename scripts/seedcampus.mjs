import mongoose from 'mongoose';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<db_password>')) {
    console.error('ERROR: MONGODB_URI in .env.local is missing or invalid.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected!');

  const db = mongoose.connection.db;

  const campusData = [
    { name: 'Dr. Janaki Ammal Campus', code: 'THALAS', createdAt: new Date(), updatedAt: new Date() },
    { name: 'Mangattuparamba Campus', code: 'MANGAT', createdAt: new Date(), updatedAt: new Date() },
    { name: 'Swami Anandatheertha Campus', code: 'PAYYAN', createdAt: new Date(), updatedAt: new Date() },
    { name: 'Kasaragod Campus', code: 'KASARA', createdAt: new Date(), updatedAt: new Date() },
    { name: 'Mananthavady Campus', code: 'MANANT', createdAt: new Date(), updatedAt: new Date() },
    { name: 'Dr. P.K. Rajan Memorial Campus', code: 'NILESH', createdAt: new Date(), updatedAt: new Date() },
    { name: 'Thavakkara Campus', code: 'THAVAK', createdAt: new Date(), updatedAt: new Date() },
    { name: 'Manjeswaram Campus', code: 'MANJES', createdAt: new Date(), updatedAt: new Date() },
  ];

  // Point to the 'campuses' collection instead of 'users'
  const campusCollection = db.collection('campuses');
  
  console.log('Clearing old campuses...');
  await campusCollection.deleteMany({});

  console.log('Inserting fresh campuses...');
  await campusCollection.insertMany(campusData);
  
  console.log('\n✅ Database seeded with campuses!');
  process.exit(0);
}

seed().catch(console.error);
