import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { fetchTransactionEmails } from '../services/gmailService.js';
import { parseMultipleEmails } from '../services/emailParser.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const testSyncFlow = async () => {
  try {
    console.log('🔄 Testing sync flow for new transactions...');
    
    // Connect to database
    await connectDB();
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    console.log(`👤 User: ${user.email}`);
    console.log(`📅 Last sync: ${user.lastEmailSync}`);
    
    // Check Gmail tokens
    if (!user.gmailTokens) {
      console.log('❌ No Gmail tokens');
      return;
    }
    
    // Test 1: Fetch emails since last sync
    console.log('\n1️⃣ Testing fetch since last sync...');
    try {
      const emailsSinceLastSync = await fetchTransactionEmails(user.gmailTokens, user.lastEmailSync);
      console.log(`   Emails since last sync: ${emailsSinceLastSync.length}`);
    } catch (error) {
      console.error(`   Error: ${error.message}`);
    }
    
    // Test 2: Fetch emails from today (to ensure we get today's transactions)
    console.log('\n2️⃣ Testing fetch from today...');
    const today = new Date('2026-04-26T00:00:00+05:30');
    try {
      const emailsFromToday = await fetchTransactionEmails(user.gmailTokens, today);
      console.log(`   Emails from today: ${emailsFromToday.length}`);
      
      if (emailsFromToday.length > 0) {
        console.log('   Sample emails:');
        emailsFromToday.slice(0, 3).forEach((email, index) => {
          const date = new Date(parseInt(email.internalDate));
          console.log(`     ${index + 1}. ${date.toLocaleString()} - ${email.snippet?.substring(0, 50)}...`);
        });
      }
    } catch (error) {
      console.error(`   Error: ${error.message}`);
    }
    
    // Test 3: Fetch emails from last 1 day (more aggressive)
    console.log('\n3️⃣ Testing fetch from last 1 day...');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      const emailsFromLastDay = await fetchTransactionEmails(user.gmailTokens, oneDayAgo);
      console.log(`   Emails from last 24 hours: ${emailsFromLastDay.length}`);
    } catch (error) {
      console.error(`   Error: ${error.message}`);
    }
    
    // Test 4: Check if today's transactions have email IDs
    console.log('\n4️⃣ Checking today\'s transactions in database...');
    const todayTxnDate = new Date('2026-04-26');
    const tomorrow = new Date('2026-04-27');
    
    const todaysTxns = await Transaction.find({
      userId: user._id,
      transactionDate: {
        $gte: todayTxnDate,
        $lt: tomorrow
      }
    });
    
    console.log(`   Today's transactions in DB: ${todaysTxns.length}`);
    todaysTxns.forEach((txn, index) => {
      console.log(`     ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      console.log(`        Email ID: ${txn.emailId || 'No email ID'}`);
      console.log(`        Date: ${txn.transactionDate}`);
    });
    
    // Test 5: Check what the sync endpoint would do
    console.log('\n5️⃣ Simulating sync endpoint behavior...');
    
    // The sync endpoint uses null for lastSyncDate to get last 90 days
    console.log('   Testing with null (last 90 days):');
    try {
      const emails90Days = await fetchTransactionEmails(user.gmailTokens, null);
      console.log(`   Emails (last 90 days): ${emails90Days.length}`);
      
      // Parse them
      const parsed = parseMultipleEmails(emails90Days);
      console.log(`   Parsed transactions: ${parsed.length}`);
      
      // Check if today's transactions are in the parsed list
      const todayParsed = parsed.filter(txn => {
        const txnDate = new Date(txn.transactionDate);
        return txnDate.toDateString() === todayTxnDate.toDateString();
      });
      
      console.log(`   Today's transactions in parsed: ${todayParsed.length}`);
      todayParsed.forEach((txn, index) => {
        console.log(`     ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      });
      
    } catch (error) {
      console.error(`   Error: ${error.message}`);
    }
    
    console.log('\n✅ Sync flow test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

testSyncFlow();
