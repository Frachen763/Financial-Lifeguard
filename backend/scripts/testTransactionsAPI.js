import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const testTransactionsAPI = async () => {
  try {
    console.log('🔍 Testing transactions API endpoint logic...');
    
    // Connect to database
    await connectDB();
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    console.log(`👤 User: ${user.email}`);
    console.log(`🆔 User ID: ${user._id}`);
    
    // Simulate the GET /api/transactions endpoint
    console.log('\n📡 Simulating GET /api/transactions...');
    
    // This is what the frontend endpoint does
    const transactions = await Transaction.find({ userId: user._id })
      .sort({ transactionDate: -1 })
      .limit(100);
    
    console.log(`\n📊 Found ${transactions.length} transactions`);
    
    // Show last 10 transactions (what the frontend would show)
    console.log('\n📊 Last 10 transactions (what frontend should show):');
    transactions.slice(0, 10).forEach((txn, index) => {
      console.log(`\n  ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      console.log(`     Date: ${txn.transactionDate.toLocaleDateString()} at ${txn.transactionDate.toLocaleTimeString()}`);
      console.log(`     Category ID: ${txn.category || 'No Category'}`);
      console.log(`     Email ID: ${txn.emailId || 'No email ID'}`);
      console.log(`     Created at: ${txn.createdAt?.toLocaleString() || 'Unknown'}`);
    });
    
    // Check specifically for today's transactions
    const today = new Date('2026-04-26');
    const tomorrow = new Date('2026-04-27');
    
    const todaysTxns = transactions.filter(txn => {
      return txn.transactionDate >= today && txn.transactionDate < tomorrow;
    });
    
    console.log(`\n📅 Today's transactions in API response: ${todaysTxns.length}`);
    if (todaysTxns.length > 0) {
      todaysTxns.forEach((txn, index) => {
        console.log(`  ${index + 1}. ₹${txn.amount} to ${txn.merchant} at ${txn.transactionDate.toLocaleTimeString()}`);
      });
    }
    
    // Check if there's any issue with the sort order
    console.log('\n🔍 Checking sort order...');
    console.log('First 5 transaction dates:');
    transactions.slice(0, 5).forEach((txn, index) => {
      console.log(`  ${index + 1}. ${txn.transactionDate.toISOString()}`);
    });
    
    // Check if transactions are properly linked to user
    console.log('\n🔍 Checking user linkage...');
    const orphanedTxns = transactions.filter(txn => !txn.userId || txn.userId.toString() !== user._id.toString());
    if (orphanedTxns.length > 0) {
      console.log(`⚠️ Found ${orphanedTxns.length} transactions not properly linked to user`);
    } else {
      console.log('✅ All transactions properly linked to user');
    }
    
    // Check if there's a date format issue
    console.log('\n🔍 Checking date formats...');
    const recentTxns = transactions.slice(0, 5);
    recentTxns.forEach((txn, index) => {
      console.log(`  ${index + 1}. DB Date: ${txn.transactionDate}`);
      console.log(`      Formatted: ${txn.transactionDate.toLocaleDateString()}`);
    });
    
    console.log('\n✅ API test completed!');
    
    console.log('\n💡 If frontend is not showing latest transactions:');
    console.log('   1. Check browser console for errors');
    console.log('   2. Try hard refresh (Ctrl+F5)');
    console.log('   3. Check if API call is being made');
    console.log('   4. Verify user is logged in correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

testTransactionsAPI();
