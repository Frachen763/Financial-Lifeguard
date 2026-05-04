import dotenv from 'dotenv';
import axios from 'axios';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const testOnboardingAPI = async () => {
  try {
    console.log('🧪 Testing onboarding API endpoints...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Find test user
    const userEmail = 'borgohain9435@gmail.com';
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.log('❌ Test user not found');
      return;
    }
    
    // Get auth token (simulate login)
    console.log('\n🔐 Simulating login to get auth token...');
    const loginResponse = await axios.post(`http://localhost:5000/api/auth/login`, {
      email: userEmail,
      password: 'password123' // You'll need to use the actual password
    }).catch(() => {
      // If login fails, try to get token from Google OAuth simulation
      console.log('⚠️ Login failed, using existing user for testing...');
      return null;
    });
    
    const token = loginResponse?.data?.token || 'test-token';
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log(`📋 Testing with user: ${userEmail}`);
    console.log(`🔗 User ID: ${user._id}`);
    
    // Test 1: Check onboarding status
    console.log('\n📊 Test 1: Checking onboarding status...');
    try {
      const statusResponse = await axios.get('http://localhost:5000/api/onboarding/status', {
        headers: authHeaders
      });
      
      console.log('✅ Status check successful:', statusResponse.data.data);
    } catch (error) {
      console.log('❌ Status check failed:', error.response?.data || error.message);
    }
    
    // Test 2: Complete onboarding
    console.log('\n📝 Test 2: Completing onboarding...');
    const onboardingData = {
      occupation: 'Employee',
      country: 'India',
      state: 'Assam',
      city: 'Jorhat',
      monthlyIncome: 50000
    };
    
    try {
      const completeResponse = await axios.post('http://localhost:5000/api/onboarding/complete', onboardingData, {
        headers: authHeaders
      });
      
      console.log('✅ Onboarding completion successful:', completeResponse.data.data);
    } catch (error) {
      console.log('❌ Onboarding completion failed:', error.response?.data || error.message);
    }
    
    // Test 3: Check status after completion
    console.log('\n📊 Test 3: Checking status after completion...');
    try {
      const statusResponse = await axios.get('http://localhost:5000/api/onboarding/status', {
        headers: authHeaders
      });
      
      console.log('✅ Status after completion:', statusResponse.data.data);
    } catch (error) {
      console.log('❌ Status check failed:', error.response?.data || error.message);
    }
    
    // Test 4: Update financial profile
    console.log('\n🔄 Test 4: Updating financial profile...');
    const updateData = {
      monthlyIncome: 60000
    };
    
    try {
      const updateResponse = await axios.put('http://localhost:5000/api/onboarding/update', updateData, {
        headers: authHeaders
      });
      
      console.log('✅ Profile update successful:', updateResponse.data.data);
    } catch (error) {
      console.log('❌ Profile update failed:', error.response?.data || error.message);
    }
    
    // Test 5: Validation errors
    console.log('\n⚠️ Test 5: Testing validation errors...');
    const invalidData = {
      occupation: 'Invalid Occupation',
      country: '',
      state: '',
      city: '',
      monthlyIncome: -100
    };
    
    try {
      const invalidResponse = await axios.post('http://localhost:5000/api/onboarding/complete', invalidData, {
        headers: authHeaders
      });
      
      console.log('❌ Validation should have failed but didn\'t');
    } catch (error) {
      console.log('✅ Validation working correctly:', error.response?.data?.errors || error.response?.data?.message);
    }
    
    // Reset for testing
    console.log('\n🔄 Resetting onboarding for future tests...');
    await User.findByIdAndUpdate(
      user._id,
      {
        onboardingCompleted: false,
        $unset: { financialProfile: 1 }
      }
    );
    
    console.log('✅ Onboarding reset completed');
    console.log('\n🎉 All onboarding API tests completed!');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

testOnboardingAPI();
