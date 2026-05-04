import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkUserAccount = async () => {
  try {
    console.log('🔍 Checking user account details...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Find all users
    const users = await User.find({});
    console.log(`\n👥 Found ${users.length} users in database:`);
    
    for (const user of users) {
      console.log(`\n📧 Email: ${user.email}`);
      console.log(`🆔 ID: ${user._id}`);
      console.log(`🔗 Gmail Connected: ${user.gmailConnected}`);
      console.log(`📅 Last Email Sync: ${user.lastEmailSync || 'Never'}`);
      console.log(`🔑 Has Gmail Tokens: ${!!user.gmailTokens}`);
      
      if (user.gmailTokens) {
        console.log(`⏰ Token Expiry: ${user.gmailTokens.expiry_date ? new Date(user.gmailTokens.expiry_date).toISOString() : 'Not set'}`);
      }
    }
    
    // Check transactions for each user
    console.log('\n📊 Checking transactions for each user...');
    
    for (const user of users) {
      const transactions = await Transaction.find({ userId: user._id })
        .sort({ transactionDate: -1 })
        .limit(10);
      
      console.log(`\n💳 Transactions for ${user.email}:`);
      console.log(`   Total count: ${transactions.length}`);
      
      if (transactions.length > 0) {
        console.log('   Recent transactions:');
        transactions.forEach((txn, index) => {
          console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} to ${txn.merchant}`);
        });
        
        // Check last transaction date
        const lastTxn = transactions[0];
        const lastTxnDate = lastTxn.transactionDate.toISOString().split('T')[0];
        console.log(`   📅 Last transaction: ${lastTxnDate}`);
        
        if (lastTxn.merchant.toLowerCase().includes('google')) {
          console.log(`   🔍 Found Google transaction: ${lastTxn.merchant}`);
        }
      } else {
        console.log('   No transactions found');
      }
    }
    
    // Specifically check for borgohain9435@gmail.com
    console.log('\n🎯 Detailed check for borgohain9435@gmail.com...');
    const borgohainUser = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    if (borgohainUser) {
      console.log('✅ User found in database');
      
      // Check if Gmail is properly connected
      if (!borgohainUser.gmailConnected) {
        console.log('❌ Gmail is NOT connected for this user');
      } else {
        console.log('✅ Gmail is connected');
        
        // Check last sync
        if (borgohainUser.lastEmailSync) {
          console.log(`📅 Last sync: ${borgohainUser.lastEmailSync}`);
          
          // Check if there are emails after last sync
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          
          const recentTxns = await Transaction.find({
            userId: borgohainUser._id,
            transactionDate: { $gte: threeDaysAgo }
          });
          
          console.log(`📊 Transactions since ${threeDaysAgo.toISOString().split('T')[0]}: ${recentTxns.length}`);
        } else {
          console.log('⚠️ Never synced before');
        }
      }
    } else {
      console.log('❌ User borgohain9435@gmail.com NOT found in database');
      console.log('💡 This means the login might be creating a new user or using a different email');
    }
    
    // Check what happens when we search for Google transaction
    console.log('\n🔍 Searching for "Google" transactions...');
    const googleTxns = await Transaction.find({
      merchant: { $regex: /google/i }
    }).sort({ transactionDate: -1 });
    
    console.log(`Found ${googleTxns.length} Google transactions:`);
    googleTxns.forEach((txn, index) => {
      const user = users.find(u => u._id.toString() === txn.userId.toString());
      console.log(`  ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} to ${txn.merchant} (User: ${user?.email || 'Unknown'})`);
    });
    
    console.log('\n✅ Account check completed');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkUserAccount();
