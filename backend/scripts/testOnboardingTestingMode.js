import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const testOnboardingTestingMode = async () => {
  try {
    console.log('🧪 Testing Onboarding Testing Mode...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('\n👤 Current User State:');
    console.log(`   Email: ${user.email}`);
    console.log(`   onboardingCompleted: ${user.onboardingCompleted}`);
    console.log(`   Financial Profile: ${user.financialProfile ? 'Exists' : 'None'}`);
    
    if (user.financialProfile) {
      console.log('\n📊 Current Financial Profile:');
      console.log(`   Occupation: ${user.financialProfile.occupation || 'Not set'}`);
      console.log(`   Country: ${user.financialProfile.country || 'Not set'}`);
      console.log(`   State: ${user.financialProfile.state || 'Not set'}`);
      console.log(`   City: ${user.financialProfile.city || 'Not set'}`);
      console.log(`   Monthly Income: ${user.financialProfile.monthlyIncome || 'Not set'}`);
    }
    
    console.log('\n🎯 Testing Mode Configuration:');
    console.log('   ✅ Frontend: Always shows onboarding survey');
    console.log('   ✅ Backend: Always replaces data, keeps onboardingCompleted = false');
    
    console.log('\n📋 Expected Behavior:');
    console.log('   1. Survey appears every time you log in or refresh');
    console.log('   2. Each submission replaces previous data');
    console.log('   3. Survey will appear again on next login/refresh');
    console.log('   4. Console logs show "TESTING MODE" messages');
    
    console.log('\n🔧 To Disable Testing Mode:');
    console.log('   1. Frontend: Uncomment original logic in useOnboarding.js');
    console.log('   2. Backend: Change onboardingCompleted back to true');
    
  } catch (error) {
    console.error('❌ Error testing onboarding mode:', error);
  } finally {
    process.exit(0);
  }
};

testOnboardingTestingMode();
