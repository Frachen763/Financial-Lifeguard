import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkAPIEndpoint = async () => {
  try {
    console.log('🔍 Checking API endpoint directly...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 User: ${user.email} (ID: ${user._id})`);
    
    // Check if there's any issue with the transaction dates
    console.log('\n🔍 Checking transaction dates in detail...');
    
    const transactions = await Transaction.find({ userId: user._id })
      .sort({ transactionDate: -1 })
      .limit(10);
    
    console.log('\n📊 Last 10 transactions from database:');
    transactions.forEach((txn, index) => {
      const txnDate = new Date(txn.transactionDate);
      const createdDate = txn.createdAt ? new Date(txn.createdAt) : null;
      
      console.log(`\n  ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      console.log(`     Transaction Date: ${txnDate.toISOString()}`);
      console.log(`     Local Date: ${txnDate.toLocaleString()}`);
      console.log(`     Created At: ${createdDate ? createdDate.toISOString() : 'No createdAt'}`);
      console.log(`     Email ID: ${txn.emailId || 'No email ID'}`);
    });
    
    // Check if there's a timezone issue
    console.log('\n🌍 Checking timezone handling...');
    const now = new Date();
    console.log(`   Current time: ${now.toISOString()}`);
    console.log(`   Local time: ${now.toLocaleString()}`);
    
    // Check today's transactions with different date comparisons
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`   Today (midnight): ${today.toISOString()}`);
    console.log(`   Tomorrow (midnight): ${tomorrow.toISOString()}`);
    
    const todaysTxns = transactions.filter(txn => {
      const txnDate = new Date(txn.transactionDate);
      return txnDate >= today && txnDate < tomorrow;
    });
    
    console.log(`\n📅 Today's transactions: ${todaysTxns.length}`);
    todaysTxns.forEach((txn, index) => {
      console.log(`   ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
    });
    
    // Let's also check if the frontend query might be different
    console.log('\n🔍 Checking if frontend uses different query...');
    
    // Maybe frontend is using createdAt instead of transactionDate?
    const byCreatedAt = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('\n📊 Sorted by createdAt (not transactionDate):');
    byCreatedAt.forEach((txn, index) => {
      console.log(`  ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      console.log(`     Created: ${txn.createdAt?.toISOString()}`);
      console.log(`     Transaction: ${txn.transactionDate.toISOString()}`);
    });
    
    // Check if there's any aggregation or pipeline issue
    console.log('\n🔍 Checking for any aggregation issues...');
    
    const pipeline = [
      { $match: { userId: user._id } },
      { $sort: { transactionDate: -1 } },
      { $limit: 5 },
      {
        $project: {
          amount: 1,
          merchant: 1,
          transactionDate: 1,
          createdAt: 1,
          emailId: 1
        }
      }
    ];
    
    const aggregated = await Transaction.aggregate(pipeline);
    console.log('\n📊 Using aggregation pipeline:');
    aggregated.forEach((txn, index) => {
      console.log(`  ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      console.log(`     Transaction Date: ${txn.transactionDate}`);
      console.log(`     Created At: ${txn.createdAt}`);
    });
    
    console.log('\n💡 Possible solutions:');
    console.log('   1. Check if frontend is using createdAt instead of transactionDate');
    console.log('   2. Check if there\'s a timezone conversion issue');
    console.log('   3. Check if frontend has client-side filtering');
    console.log('   4. Try accessing the API directly in browser');
    
    console.log('\n✅ Check completed!');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkAPIEndpoint();
