import dotenv from 'dotenv';
import { autoSyncTransactions } from '../services/syncService.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const testAutoSync = async () => {
  try {
    console.log('🧪 Testing automatic transaction sync...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log(`👤 Testing auto-sync for user: ${user.email}`);
    console.log(`📅 Last sync: ${user.lastEmailSync || 'Never'}`);
    console.log(`🔗 Gmail connected: ${user.gmailConnected}`);
    
    // Test the auto-sync function
    const result = await autoSyncTransactions(user._id);
    
    console.log('\n📊 Auto-sync Results:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Message: ${result.message}`);
    console.log(`  New transactions: ${result.newTransactions}`);
    console.log(`  Updated transactions: ${result.updatedTransactions}`);
    console.log(`  Total processed: ${result.totalProcessed || 0}`);
    
    // Check user's last sync date after auto-sync
    const updatedUser = await User.findById(user._id);
    console.log(`\n📅 Updated last sync: ${updatedUser.lastEmailSync}`);
    
    console.log('\n✅ Auto-sync test completed!');
    
  } catch (error) {
    console.error('❌ Auto-sync test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

testAutoSync();
