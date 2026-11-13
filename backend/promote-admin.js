const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load env variables
dotenv.config({ path: '../.env' });

const regNum = process.argv[2];

if (!regNum) {
  console.error('❌ Please provide a registration number! Example: node promote-admin.js 12345678');
  process.exit(1);
}

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('❌ MONGO_URI not found in environment variables.');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('🔌 Connected to MongoDB...');
    const user = await User.findOne({ registrationNumber: regNum });
    if (!user) {
      console.error(`❌ User with registration number ${regNum} not found.`);
      process.exit(1);
    }
    
    user.role = 'admin';
    await user.save();
    console.log(`✅ Success: User "${user.name}" (${regNum}) has been promoted to ADMIN!`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection error:', err);
    process.exit(1);
  });
