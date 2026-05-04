import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const testOnboarding = async () => {
  try {
    console.log('🧪 Testing onboarding functionality...');
    
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
    
    console.log(`👤 Found user: ${user.email}`);
    console.log(`📊 Current onboarding status: ${user.onboardingCompleted || false}`);
    console.log(`💰 Financial profile:`, user.financialProfile || 'Not set');
    
    // Simulate completing onboarding
    console.log('\n🔄 Simulating onboarding completion...');
    
    const testFinancialProfile = {
      occupation: 'Employee',
      country: 'India',
      state: 'Assam',
      city: 'Jorhat',
      monthlyIncome: 50000
    };
    
    // Update user with onboarding data
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        onboardingCompleted: true,
        financialProfile: testFinancialProfile,
      },
      { new: true, runValidators: true }
    );
    
    console.log('✅ Onboarding completed successfully!');
    console.log('📊 Updated onboarding status:', updatedUser.onboardingCompleted);
    console.log('💰 Updated financial profile:', updatedUser.financialProfile);
    
    // Reset for testing (optional)
    console.log('\n🔄 Resetting onboarding for testing...');
    await User.findByIdAndUpdate(
      user._id,
      {
        onboardingCompleted: false,
        $unset: { financialProfile: 1 }
      }
    );
    
    console.log('✅ Onboarding reset for testing');
    
  } catch (error) {
    console.error('❌ Onboarding test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

testOnboarding();
