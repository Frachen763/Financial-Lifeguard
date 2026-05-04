import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkDateFilter = async () => {
  try {
    console.log('🔍 Checking date range filtering...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Simulate frontend date range
    const marchFirst = new Date(new Date().getFullYear(), 2, 1); // March 1st of current year
    const today = new Date();
    
    console.log('\n📅 Frontend date range:');
    console.log(`   March 1st: ${marchFirst.toISOString()}`);
    console.log(`   Today: ${today.toISOString()}`);
    console.log(`   March 1st (formatted): ${marchFirst.toISOString().split('T')[0]}`);
    console.log(`   Today (formatted): ${today.toISOString().split('T')[0]}`);
    
    // Query with date range (like frontend does)
    const query = { 
      userId: user._id,
      transactionDate: {
        $gte: new Date(marchFirst.toISOString().split('T')[0]),
        $lte: new Date(today.toISOString().split('T')[0] + 'T23:59:59.999Z')
      }
    };
    
    console.log('\n📋 MongoDB query:', JSON.stringify(query, null, 2));
    
    const transactions = await Transaction.find(query)
      .sort({ transactionDate: -1 })
      .limit(10);
    
    console.log(`\n📊 Transactions with date filter: ${transactions.length}`);
    
    transactions.forEach((txn, index) => {
      console.log(`\n  ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      console.log(`     Transaction Date: ${txn.transactionDate.toISOString()}`);
      console.log(`     Local Date: ${txn.transactionDate.toLocaleString()}`);
    });
    
    // Now check without date filter
    console.log('\n🔍 Checking without date filter...');
    const allTransactions = await Transaction.find({ userId: user._id })
      .sort({ transactionDate: -1 })
      .limit(10);
    
    console.log(`\n📊 Transactions without date filter: ${allTransactions.length}`);
    
    allTransactions.forEach((txn, index) => {
      console.log(`\n  ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      console.log(`     Transaction Date: ${txn.transactionDate.toISOString()}`);
      console.log(`     Local Date: ${txn.transactionDate.toLocaleString()}`);
    });
    
    // Check if today's transactions are being filtered out
    const todayTxns = allTransactions.filter(txn => {
      const txnDate = new Date(txn.transactionDate);
      return txnDate.toDateString() === today.toDateString();
    });
    
    console.log(`\n📅 Today's transactions: ${todayTxns.length}`);
    todayTxns.forEach((txn, index) => {
      console.log(`   ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      console.log(`      Date: ${txn.transactionDate.toISOString()}`);
    });
    
    // Check if the date filter is excluding today's transactions
    const filteredTodayTxns = transactions.filter(txn => {
      const txnDate = new Date(txn.transactionDate);
      return txnDate.toDateString() === today.toDateString();
    });
    
    console.log(`\n📅 Today's transactions after filter: ${filteredTodayTxns.length}`);
    
    if (todayTxns.length !== filteredTodayTxns.length) {
      console.log('\n❌ ISSUE: Date filter is excluding today\'s transactions!');
      console.log('The problem might be:');
      console.log('1. Timezone conversion issue');
      console.log('2. Date format issue');
      console.log('3. End date not inclusive');
    }
    
    console.log('\n✅ Check completed!');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkDateFilter();
