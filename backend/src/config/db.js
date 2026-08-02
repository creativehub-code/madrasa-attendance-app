const mongoose = require('mongoose');
const { mongoUri } = require('./env');

const connectDB = async () => {
  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri, {
    autoIndex: process.env.NODE_ENV !== 'production',
  });

  console.log('MongoDB connected');
};

module.exports = connectDB;
