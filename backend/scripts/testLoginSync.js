import dotenv from 'dotenv';
import User from '../models/User.js';
import { autoSyncTransactions } from '../services/syncService.js';
import connectDB from '../config/db.js';

dotenv.config();

const testLoginSync = async () => {
  try {
    console.log('🧪 Testing login sync flow...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Simulate user login
    const userEmail = 'borgohain9435@gmail.com';
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 Simulating login for: ${userEmail}`);
    console.log(`📅 Last sync before login: ${user.lastEmailSync || 'Never'}`);
    console.log(`🔗 Gmail connected: ${user.gmailConnected}`);
    
    // Simulate the auto-sync that happens during login
    console.log('\n🔄 Simulating auto-sync during login...');
    
    // Run auto-sync (this would normally run in background during login)
    const syncPromise = autoSyncTransactions(user._id);
    
    // Simulate login response being sent immediately (not waiting for sync)
    console.log('📤 Login response sent (sync continues in background)');
    
    // Wait for sync to complete to show results
    const syncResult = await syncPromise;
    
    console.log('\n📊 Background sync completed:');
    console.log(`  Success: ${syncResult.success}`);
    console.log(`  Message: ${syncResult.message}`);
    console.log(`  New transactions: ${syncResult.newTransactions}`);
    console.log(`  Updated transactions: ${syncResult.updatedTransactions}`);
    
    // Check updated user
    const updatedUser = await User.findById(user._id);
    console.log(`\n📅 Last sync after login: ${updatedUser.lastEmailSync}`);
    
    console.log('\n✅ Login sync flow test completed!');
    console.log('💡 In production, the user gets immediate login response while sync happens in background');
    
  } catch (error) {
    console.error('❌ Login sync test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

testLoginSync();
