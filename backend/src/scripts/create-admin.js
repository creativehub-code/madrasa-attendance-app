require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not defined in your .env file.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const adminUsername = ''; // You can change this
    const adminPassword = ''; // You can change this

    // Check if an admin already exists
    const existingAdmin = await User.findOne({ role: 'Admin' });
    if (existingAdmin) {
      console.log(`⚠️ An Admin already exists with username: ${existingAdmin.username}`);
      process.exit(0);
    }

    // Create the admin user
    const adminUser = await User.create({
      username: adminUsername,
      password: adminPassword,
      role: 'Admin',
      mustChangePassword: false // Prevent the UI from forcing a password change immediately
    });

    console.log(`🎉 Admin created successfully!`);
    console.log(`👤 Username: ${adminUser.username}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`⚠️ Please make sure to change this password in production!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
