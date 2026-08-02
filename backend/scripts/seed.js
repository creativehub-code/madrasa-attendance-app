const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../src/models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedDB = async () => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: false,
    });
    console.log('MongoDB connected for seeding.');

    // Check if admin exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists.');
    } else {
      await User.create({
        username: 'admin',
        password: 'password123',
        role: 'Admin',
        mustChangePassword: true, // Will force them to change it on first login
      });
      console.log('Admin user created successfully! Username: admin, Password: password123');
    }

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDB();
