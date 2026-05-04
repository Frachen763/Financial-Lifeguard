import dotenv from 'dotenv';
import { fetchTransactionEmails } from '../services/gmailService.js';
import { parseMultipleEmails } from '../services/emailParser.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const syncBorgohainAccount = async () => {
  try {
    console.log('🔄 Syncing borgohain9435@gmail.com account...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User borgohain9435@gmail.com not found');
      return;
    }
    
    console.log(`👤 User: ${user.email}`);
    console.log(`📅 Last sync: ${user.lastEmailSync || 'Never'}`);
    
    // Check current transaction count
    const currentTxnCount = await Transaction.countDocuments({ userId: user._id });
    console.log(`📊 Current transaction count: ${currentTxnCount}`);
    
    // Check Gmail tokens
    if (!user.gmailTokens) {
      console.log('❌ No Gmail tokens found');
      return;
    }
    
    let tokens = user.gmailTokens;
    
    // Check if token needs refresh
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      console.log('🔄 Token expired, refreshing...');
      try {
        const { refreshAccessToken } = await import('../services/gmailService.js');
        tokens = await refreshAccessToken(tokens.refresh_token);
        user.gmailTokens = tokens;
        await user.save();
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Token refresh failed:', error.message);
        return;
      }
    }
    
    // Test 1: Fetch emails since last sync
    console.log('\n📧 Test 1: Fetching emails since last sync...');
    const emailsSinceLastSync = await fetchTransactionEmails(tokens, user.lastEmailSync);
    console.log(`✅ Fetched ${emailsSinceLastSync.length} emails since last sync`);
    
    // Test 2: Fetch all emails from last 7 days
    console.log('\n📧 Test 2: Fetching emails from last 7 days...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const emails7Days = await fetchTransactionEmails(tokens, sevenDaysAgo);
    console.log(`✅ Fetched ${emails7Days.length} emails from last 7 days`);
    
    // Test 3: Fetch all emails from last 30 days
    console.log('\n📧 Test 3: Fetching emails from last 30 days...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const emails30Days = await fetchTransactionEmails(tokens, thirtyDaysAgo);
    console.log(`✅ Fetched ${emails30Days.length} emails from last 30 days`);
    
    // Parse emails from last 7 days
    if (emails7Days.length > 0) {
      console.log('\n🔍 Parsing emails from last 7 days...');
      const parsedTransactions = parseMultipleEmails(emails7Days);
      console.log(`✅ Parsed ${parsedTransactions.length} transactions from last 7 days`);
      
      if (parsedTransactions.length > 0) {
        console.log('\n📊 Parsed transactions:');
        parsedTransactions.forEach((txn, index) => {
          console.log(`  ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} to ${txn.merchant}`);
        });
        
        // Check which ones are new
        console.log('\n🔍 Checking for new transactions...');
        let newCount = 0;
        let existingCount = 0;
        
        for (const txn of parsedTransactions) {
          const existing = await Transaction.findOne({
            userId: user._id,
            emailId: txn.emailId,
          });
          
          if (existing) {
            existingCount++;
          } else {
            newCount++;
            console.log(`  🆕 New: ₹${txn.amount} to ${txn.merchant} on ${txn.transactionDate.toISOString().split('T')[0]}`);
          }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`  New transactions: ${newCount}`);
        console.log(`  Existing transactions: ${existingCount}`);
        
        if (newCount > 0) {
          console.log('\n💡 There are new transactions to sync! The sync function needs to be run.');
        }
      }
    }
    
    // Check recent transactions in database
    console.log('\n📊 Recent transactions in database:');
    const recentTxns = await Transaction.find({ userId: user._id })
      .sort({ transactionDate: -1 })
      .limit(10);
    
    recentTxns.forEach((txn, index) => {
      console.log(`  ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} to ${txn.merchant}`);
    });
    
    console.log('\n✅ Sync test completed');
    
  } catch (error) {
    console.error('❌ Sync test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

syncBorgohainAccount();
