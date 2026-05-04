import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const testAuth = async () => {
  try {
    console.log('🔍 Testing Authentication...\n');

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.log('❌ JWT_SECRET is not set in environment variables');
      return;
    }
    console.log('✅ JWT_SECRET is set');

    // Get a test user
    const testUser = await User.findOne({ email: 'frachenborgohain@gmail.com' });
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }

    console.log(`👤 Found test user: ${testUser.email}`);

    // Generate a token
    const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    });

    console.log('✅ Token generated successfully');
    console.log(`🔑 Token (first 50 chars): ${token.substring(0, 50)}...`);

    // Verify the token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verification successful');
      console.log(`🆔 User ID from token: ${decoded.id}`);
      
      if (decoded.id.toString() === testUser._id.toString()) {
        console.log('✅ Token user ID matches database user ID');
      } else {
        console.log('❌ Token user ID does not match database user ID');
      }
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
    }

    // Check token expiration
    const decoded = jwt.decode(token);
    const expirationDate = new Date(decoded.exp * 1000);
    const now = new Date();
    
    console.log(`⏰ Token expires: ${expirationDate.toISOString()}`);
    console.log(`⏰ Current time: ${now.toISOString()}`);
    
    if (expirationDate > now) {
      console.log('✅ Token is not expired');
    } else {
      console.log('❌ Token is expired');
    }

    console.log('\n🔍 Checking recent login attempts...');
    
    // Check if user has any recent activity
    console.log(`📅 User created: ${testUser.createdAt}`);
    console.log(`📅 Last updated: ${testUser.updatedAt}`);

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the test
const runTest = async () => {
  await connectDB();
  await testAuth();
  process.exit(0);
};

runTest().catch(console.error);
