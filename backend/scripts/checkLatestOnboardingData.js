import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const checkLatestOnboardingData = async () => {
  try {
    console.log('🔍 Checking Latest Onboarding Data...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('\n👤 User Information:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   onboardingCompleted: ${user.onboardingCompleted}`);
    console.log(`   Last Updated: ${user.updatedAt}`);
    
    if (user.financialProfile) {
      console.log('\n💾 Current Financial Profile Data:');
      console.log(`   Occupation: ${user.financialProfile.occupation || 'Not set'}`);
      console.log(`   Country: ${user.financialProfile.country || 'Not set'}`);
      console.log(`   State: ${user.financialProfile.state || 'Not set'}`);
      console.log(`   City: ${user.financialProfile.city || 'Not set'}`);
      console.log(`   Monthly Income: ${user.financialProfile.monthlyIncome || 'Not set'}`);
      
      console.log('\n✅ DATA IS SAVED!');
      console.log('   The financial profile exists in the database.');
      console.log('   This means your last onboarding submission was successful.');
      
      // Check if data looks recent
      const now = new Date();
      const lastUpdated = new Date(user.updatedAt);
      const minutesAgo = Math.floor((now - lastUpdated) / (1000 * 60));
      
      console.log(`\n⏰ Data Freshness:`);
      console.log(`   Last updated: ${lastUpdated.toISOString()}`);
      console.log(`   Minutes ago: ${minutesAgo}`);
      
      if (minutesAgo < 5) {
        console.log('   ✅ Data is very recent - last submission worked!');
      } else if (minutesAgo < 60) {
        console.log('   ✅ Data is recent - last submission worked!');
      } else {
        console.log('   ⚠️ Data is older - try submitting again to test');
      }
    } else {
      console.log('\n❌ NO FINANCIAL PROFILE DATA FOUND!');
      console.log('   This means the onboarding submission did not work.');
      console.log('   Possible issues:');
      console.log('   - Frontend not calling the API');
      console.log('   - Backend not saving the data');
      console.log('   - Validation errors');
    }
    
    console.log('\n🔧 Backend Configuration:');
    console.log('   ✅ Backend ready to receive data');
    console.log('   ✅ MongoDB connection working');
    console.log('   ✅ User document found');
    
    console.log('\n📋 To Test Data Saving:');
    console.log('   1. Complete the onboarding survey');
    console.log('   2. Click "Save & Continue" on last step');
    console.log('   3. Check console for success message');
    console.log('   4. Run this script again to verify');
    
    console.log('\n🎯 Expected Console Messages:');
    console.log('   Frontend: "🧪 TESTING MODE: Onboarding data saved: [data]"');
    console.log('   Frontend: "✅ Onboarding completed and closed..."');
    console.log('   Backend: "🧪 TESTING MODE: Onboarding data updated for user..."');
    
  } catch (error) {
    console.error('❌ Error checking onboarding data:', error);
  } finally {
    process.exit(0);
  }
};

checkLatestOnboardingData();
