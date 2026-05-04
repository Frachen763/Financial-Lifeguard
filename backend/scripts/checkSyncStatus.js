import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkSyncStatus = async () => {
  try {
    console.log('🔍 Checking sync status...');
    
    // Connect to database
    await connectDB();
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    console.log(`👤 User: ${user.email}`);
    console.log(`📅 Last Email Sync: ${user.lastEmailSync}`);
    console.log(`📊 Total Transactions: ${await Transaction.countDocuments({ userId: user._id })}`);
    
    // Check today's transactions
    const today = new Date('2026-04-26');
    const tomorrow = new Date('2026-04-27');
    
    const todaysTxns = await Transaction.find({
      userId: user._id,
      transactionDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ transactionDate: -1 });
    
    console.log(`\n📅 Today's Transactions (April 26): ${todaysTxns.length}`);
    
    if (todaysTxns.length === 0) {
      console.log('   ❌ No transactions found for today in database!');
      console.log('   This means they were not synced to the database.');
    } else {
      todaysTxns.forEach((txn, index) => {
        console.log(`   ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
        console.log(`      Time: ${txn.transactionDate.toLocaleTimeString()}`);
        console.log(`      Email ID: ${txn.emailId || 'No email ID'}`);
        console.log(`      Created: ${txn.createdAt?.toLocaleString() || 'Unknown'}`);
      });
      
      // Check if transactions were created after last sync
      const lastSync = user.lastEmailSync;
      if (lastSync) {
        const createdAfterSync = todaysTxns.filter(txn => 
          txn.createdAt && new Date(txn.createdAt) > new Date(lastSync)
        );
        
        if (createdAfterSync.length > 0) {
          console.log(`\n✅ ${createdAfterSync.length} transactions were created after last sync`);
        } else {
          console.log(`\n⚠️ All today's transactions were created before last sync`);
          console.log(`   Last sync: ${lastSync}`);
        }
      }
    }
    
    // Check if there are any recent transactions not showing up
    console.log('\n🔍 Checking recent transactions (last 24 hours):');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentTxns = await Transaction.find({
      userId: user._id,
      transactionDate: {
        $gte: yesterday
      }
    }).sort({ transactionDate: -1 }).limit(10);
    
    console.log(`   Found ${recentTxns.length} transactions in last 24 hours:`);
    recentTxns.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.transactionDate.toLocaleString()} - ₹${txn.amount} to ${txn.merchant}`);
    });
    
    // Simulate what happens when you call the sync endpoint
    console.log('\n🔄 Simulating sync endpoint call...');
    console.log('   The sync endpoint will:');
    console.log('   1. Fetch emails since last sync date');
    console.log('   2. Parse them into transactions');
    console.log('   3. Check if each transaction already exists (by emailId)');
    console.log('   4. Only create NEW transactions');
    console.log('   5. Update last sync date');
    
    console.log('\n💡 If you\'re not seeing new transactions:');
    console.log('   - They may already be in the database (check above)');
    console.log('   - The frontend may have caching issues');
    console.log('   - Try a hard refresh (Ctrl+F5) on the browser');
    console.log('   - Check if the transactions appear in the database but not in UI');
    
    console.log('\n✅ Status check completed!');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkSyncStatus();
