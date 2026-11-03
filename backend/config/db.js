import mongoose from 'mongoose';
import { config } from './env.js';

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log(`✅ MongoDB connected: ${config.mongoUri}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
