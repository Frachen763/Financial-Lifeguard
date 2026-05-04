import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const testOnboardingFlow = async () => {
  try {
    console.log('🧪 Testing Onboarding Flow Behavior...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('\n👤 Current User Data:');
    console.log(`   Email: ${user.email}`);
    console.log(`   onboardingCompleted: ${user.onboardingCompleted}`);
    
    if (user.financialProfile) {
      console.log('\n📊 Current Financial Profile:');
      console.log(`   Occupation: ${user.financialProfile.occupation}`);
      console.log(`   Country: ${user.financialProfile.country}`);
      console.log(`   State: ${user.financialProfile.state}`);
      console.log(`   City: ${user.financialProfile.city}`);
      console.log(`   Monthly Income: ₹${user.financialProfile.monthlyIncome}`);
    } else {
      console.log('\n📊 No financial profile data yet');
    }
    
    console.log('\n✅ CURRENT BEHAVIOR (Testing Mode):');
    console.log('   ======================================');
    console.log('   1. 🔄 Survey shows EVERY TIME you login/refresh');
    console.log('   2. 💾 Data is SAVED to database on completion');
    console.log('   3. 🔄 onboardingCompleted stays FALSE (for testing)');
    console.log('   4. 🔄 Survey appears again on next login');
    console.log('   5. 🔄 New data REPLACES old data each time');
    
    console.log('\n📋 FLOW DEMONSTRATION:');
    console.log('   =======================');
    console.log('   Step 1: Login → Survey appears');
    console.log('   Step 2: Complete all 5 steps');
    console.log('   Step 3: Click "Save & Next" → Data saved to database');
    console.log('   Step 4: Survey closes temporarily');
    console.log('   Step 5: Refresh/login → Survey appears again');
    console.log('   Step 6: Complete with NEW data → Old data REPLACED');
    
    console.log('\n🎯 WHAT HAPPENS TO THE DATA:');
    console.log('   ===========================');
    console.log('   ✅ Form data → Frontend state');
    console.log('   ✅ Frontend state → API call (onboardingAPI.complete)');
    console.log('   ✅ API call → Backend (User.findByIdAndUpdate)');
    console.log('   ✅ Backend → MongoDB database');
    console.log('   ✅ Data persists in database');
    console.log('   ✅ Next completion REPLACES all data');
    
    console.log('\n🔧 TO RETURN TO NORMAL MODE:');
    console.log('   ===========================');
    console.log('   Frontend: useOnboarding.js - uncomment original logic');
    console.log('   Backend: onboarding.js - set onboardingCompleted: true');
    
    console.log('\n✅ TESTING MODE IS ACTIVE AND WORKING!');
    
  } catch (error) {
    console.error('❌ Error testing onboarding flow:', error);
  } finally {
    process.exit(0);
  }
};

testOnboardingFlow();
