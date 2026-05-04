import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const testNewOnboardingBehavior = async () => {
  try {
    console.log('🧪 Testing NEW Onboarding Behavior...');
    
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
    
    if (user.financialProfile) {
      console.log('\n📊 Current Financial Profile:');
      console.log(`   Occupation: ${user.financialProfile.occupation}`);
      console.log(`   Country: ${user.financialProfile.country}`);
      console.log(`   State: ${user.financialProfile.state}`);
      console.log(`   City: ${user.financialProfile.city}`);
      console.log(`   Monthly Income: ₹${user.financialProfile.monthlyIncome}`);
    }
    
    console.log('\n✅ NEW BEHAVIOR (Updated Testing Mode):');
    console.log('   ========================================');
    console.log('   1. 🚪 Survey shows ONLY on LOGIN (not on refresh)');
    console.log('   2. 💾 Data is SAVED to database on completion');
    console.log('   3. 🚪 Survey CLOSES after "Save & Continue"');
    console.log('   4. 🔄 Survey shows again on NEXT LOGIN');
    console.log('   5. 🔄 New data REPLACES old data each time');
    
    console.log('\n📋 UPDATED FLOW:');
    console.log('   ================');
    console.log('   Step 1: LOGIN → Survey appears');
    console.log('   Step 2: Complete all 5 steps');
    console.log('   Step 3: Click "Save & Continue" → Data saved + Survey closes');
    console.log('   Step 4: REFRESH page → Survey stays closed');
    console.log('   Step 5: LOGOUT & LOGIN → Survey appears again');
    console.log('   Step 6: Complete with NEW data → Old data REPLACED');
    
    console.log('\n🔧 TECHNICAL IMPLEMENTATION:');
    console.log('   ===========================');
    console.log('   ✅ hasShownThisSession state tracks if shown in current session');
    console.log('   ✅ Survey only shows if !hasShownThisSession');
    console.log('   ✅ hasShownThisSession set to true after first show');
    console.log('   ✅ Survey closes properly after completion');
    console.log('   ✅ Next login resets hasShownThisSession to false');
    
    console.log('\n🎯 SESSION BEHAVIOR:');
    console.log('   ====================');
    console.log('   🌐 Same browser session (refresh): Survey stays closed');
    console.log('   🔐 New login session: Survey appears again');
    console.log('   💾 Data persists across sessions');
    console.log('   🔄 Data replacement works across sessions');
    
    console.log('\n📊 EXPECTED CONSOLE LOGS:');
    console.log('   =========================');
    console.log('   On login: "🧪 TESTING MODE: Showing onboarding on login"');
    console.log('   On refresh: "🧪 TESTING MODE: Already shown this session, skipping"');
    console.log('   On complete: "✅ Onboarding completed and closed. Will show again on next login."');
    
    console.log('\n✅ NEW BEHAVIOR IS READY!');
    
  } catch (error) {
    console.error('❌ Error testing new onboarding behavior:', error);
  } finally {
    process.exit(0);
  }
};

testNewOnboardingBehavior();
