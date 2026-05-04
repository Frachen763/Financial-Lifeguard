import dotenv from 'dotenv';
import { fetchTransactionEmails } from '../services/gmailService.js';
import { parseMultipleEmails } from '../services/emailParser.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const testSyncIssue = async () => {
  try {
    console.log('🔍 Testing sync issue...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get a test user (you may need to adjust this)
    const testUser = await User.findOne({ gmailConnected: true });
    if (!testUser) {
      console.log('❌ No user with Gmail connected found');
      return;
    }
    
    console.log(`👤 Testing with user: ${testUser.email}`);
    console.log(`📅 Last sync: ${testUser.lastEmailSync || 'Never'}`);
    
    // Check current transaction count
    const currentTxnCount = await Transaction.countDocuments({ userId: testUser._id });
    console.log(`📊 Current transaction count: ${currentTxnCount}`);
    
    // Check Gmail tokens
    if (!testUser.gmailTokens) {
      console.log('❌ No Gmail tokens found');
      return;
    }
    
    let tokens = testUser.gmailTokens;
    
    // Check if token needs refresh
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      console.log('🔄 Token expired, refreshing...');
      try {
        const { refreshAccessToken } = await import('../services/gmailService.js');
        tokens = await refreshAccessToken(tokens.refresh_token);
        testUser.gmailTokens = tokens;
        await testUser.save();
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Token refresh failed:', error.message);
        return;
      }
    }
    
    // Test fetching emails
    console.log('📬 Testing email fetch...');
    const emails = await fetchTransactionEmails(tokens, null);
    console.log(`✅ Fetched ${emails.length} emails`);
    
    if (emails.length === 0) {
      console.log('⚠️ No emails found - this might be the issue');
      return;
    }
    
    // Test parsing emails
    console.log('🔍 Testing email parsing...');
    const parsedTransactions = parseMultipleEmails(emails);
    console.log(`✅ Parsed ${parsedTransactions.length} transactions`);
    
    // Check for duplicates
    console.log('🔍 Checking for duplicates...');
    let newCount = 0;
    let existingCount = 0;
    
    for (const txn of parsedTransactions) {
      const existing = await Transaction.findOne({
        userId: testUser._id,
        emailId: txn.emailId,
      });
      
      if (existing) {
        existingCount++;
      } else {
        newCount++;
      }
    }
    
    console.log(`📊 Results:`);
    console.log(`  - New transactions: ${newCount}`);
    console.log(`  - Existing transactions: ${existingCount}`);
    console.log(`  - Total parsed: ${parsedTransactions.length}`);
    
    // Get recent transactions to check if they're up to date
    const recentTxns = await Transaction.find({ userId: testUser._id })
      .sort({ transactionDate: -1 })
      .limit(5);
    
    console.log('\n📅 Recent transactions:');
    recentTxns.forEach(txn => {
      console.log(`  - ${txn.transactionDate.toISOString().split('T')[0]}: ₹${txn.amount} to ${txn.merchant}`);
    });
    
    // Check if there are any very recent transactions that should be synced
    const today = new Date();
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    const veryRecentTxns = await Transaction.find({
      userId: testUser._id,
      transactionDate: { $gte: threeDaysAgo }
    }).sort({ transactionDate: -1 });
    
    console.log(`\n📅 Transactions in last 3 days: ${veryRecentTxns.length}`);
    veryRecentTxns.forEach(txn => {
      console.log(`  - ${txn.transactionDate.toISOString().split('T')[0]}: ₹${txn.amount} to ${txn.merchant}`);
    });
    
    console.log('\n✅ Sync test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

testSyncIssue();
