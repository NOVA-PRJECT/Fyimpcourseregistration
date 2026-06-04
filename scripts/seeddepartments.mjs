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
  
  // 1. Fetch campuses to get their _ids
  const campuses = await db.collection('campuses').find({}).toArray();
  if (campuses.length === 0) {
    console.error('ERROR: No campuses found! Please run seedcampus.mjs first.');
    process.exit(1);
  }

  // Helper to find campus ID by partial name match
  const getCampusId = (keyword) => {
    const campus = campuses.find(c => c.name.includes(keyword));
    if (!campus) throw new Error(`Campus matching "${keyword}" not found.`);
    return campus._id;
  };

  const departmentsData = [
    // 1. Dr. Janaki Ammal Campus (Thalassery)
    { name: 'Department of Studies in English', code: 'ENG', campus_id: getCampusId('Janaki') },
    { name: 'Department of Anthropology', code: 'ANT', campus_id: getCampusId('Janaki') },
    { name: 'Department of Biotechnology & Microbiology', code: 'BTM', campus_id: getCampusId('Janaki') },
    { name: 'Department of Management Studies', code: 'MGT', campus_id: getCampusId('Janaki') },
    { name: 'Department of Applied Economics', code: 'ECO', campus_id: getCampusId('Janaki') },
    { name: 'Department of Law (School of Legal Studies 1)', code: 'LAW1', campus_id: getCampusId('Janaki') }, // Changed from LAW to LAW1 due to unique constraint
    { name: 'Department of Health Sciences', code: 'HSC', campus_id: getCampusId('Janaki') },

    // 2. Mangattuparamba Campus
    { name: 'School of Physical Education and Sports Sciences', code: 'PED', campus_id: getCampusId('Mangattuparamba') },
    { name: 'Department of Mathematical Sciences', code: 'MAT', campus_id: getCampusId('Mangattuparamba') },
    { name: 'Department of Statistical Sciences', code: 'STA', campus_id: getCampusId('Mangattuparamba') },
    { name: 'School of Behavioural Sciences (Clinical Psychology)', code: 'PSY', campus_id: getCampusId('Mangattuparamba') },
    { name: 'Department of Environmental Studies', code: 'ENV', campus_id: getCampusId('Mangattuparamba') },
    { name: 'Department of Journalism and Media Studies', code: 'JMS', campus_id: getCampusId('Mangattuparamba') },
    { name: 'Department of Information Science & Technology', code: 'IST', campus_id: getCampusId('Mangattuparamba') },
    { name: 'School of Wood Science & Technology', code: 'WST', campus_id: getCampusId('Mangattuparamba') },

    // 3. Swami Anandatheertha Campus (Payyanur)
    { name: 'Department of Physics', code: 'PHY', campus_id: getCampusId('Anandatheertha') },
    { name: 'Department of Chemistry', code: 'CHE', campus_id: getCampusId('Anandatheertha') },
    { name: 'Department of Geography', code: 'GEO', campus_id: getCampusId('Anandatheertha') },
    { name: 'Department of Music', code: 'MUS', campus_id: getCampusId('Anandatheertha') },

    // 4. Kasaragod Campus
    { name: 'Teacher Education Centre', code: 'EDU', campus_id: getCampusId('Kasaragod') },

    // 5. Mananthavady Campus
    { name: 'Department of Zoology', code: 'ZOO', campus_id: getCampusId('Mananthavady') },
    { name: 'Department of Botany', code: 'BOT', campus_id: getCampusId('Mananthavady') },
    { name: 'Department of Rural and Tribal Sociology', code: 'RTS', campus_id: getCampusId('Mananthavady') },

    // 6. Dr. P.K. Rajan Memorial Campus (Nileshwaram)
    { name: 'Department of Malayalam', code: 'MAL', campus_id: getCampusId('Rajan') },
    { name: 'Department of Hindi', code: 'HIN', campus_id: getCampusId('Rajan') },
    { name: 'Department of Molecular Biology', code: 'MBI', campus_id: getCampusId('Rajan') },

    // 7. Thavakkara Campus
    { name: 'Department of Library and Information Science', code: 'LIS', campus_id: getCampusId('Thavakkara') },
    { name: 'Centre for Management Studies', code: 'CMS', campus_id: getCampusId('Thavakkara') },

    // 8. Manjeswaram Campus
    { name: 'School of Legal Studies (Department of Law 2)', code: 'LAW2', campus_id: getCampusId('Manjeswaram') }, // Changed from LAW to LAW2 due to unique constraint
  ].map(d => ({ ...d, createdAt: new Date(), updatedAt: new Date() }));

  const deptCollection = db.collection('departments');
  
  console.log('Clearing old departments...');
  await deptCollection.deleteMany({});

  console.log(`Inserting ${departmentsData.length} fresh departments...`);
  await deptCollection.insertMany(departmentsData);
  
  console.log('\n✅ Database seeded with departments!');
  process.exit(0);
}

seed().catch(console.error);
