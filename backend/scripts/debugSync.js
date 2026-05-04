import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { fetchTransactionEmails } from '../services/gmailService.js';
import { parseMultipleEmails } from '../services/emailParser.js';

// Load environment variables
dotenv.config();

console.log('=== Debug Gmail Sync Process ===\n');

const debugSync = async () => {
  try {
    // Connect to MongoDB
    console.log('1. Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get user with Gmail connected
    console.log('2. Finding user with Gmail connected...');
    const user = await User.findOne({ gmailConnected: true });

    if (!user) {
      console.log('❌ No user found with Gmail connected');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`   Gmail connected: ${user.gmailConnected}\n`);

    // Check tokens
    console.log('3. Checking Gmail tokens...');
    if (!user.gmailTokens || !user.gmailTokens.access_token) {
      console.log('❌ No valid Gmail tokens found');
      process.exit(1);
    }
    console.log('✅ Gmail tokens found\n');

    // Fetch emails
    console.log('4. Fetching transaction emails...');
    const emails = await fetchTransactionEmails(user.gmailTokens, null);
    console.log(`✅ Fetched ${emails.length} emails\n`);

    if (emails.length === 0) {
      console.log('ℹ️ No emails to parse');
      process.exit(0);
    }

    // Parse emails
    console.log('5. Parsing emails for transactions...');
    const transactions = parseMultipleEmails(emails);
    console.log(`✅ Parsed ${transactions.length} transactions\n`);

    if (transactions.length > 0) {
      console.log('Sample transactions:');
      transactions.slice(0, 3).forEach((txn, index) => {
        console.log(`\n${index + 1}. Transaction:`);
        console.log(`   Merchant: ${txn.merchant}`);
        console.log(`   Amount: ₹${txn.amount}`);
        console.log(`   Type: ${txn.transactionType}`);
        console.log(`   Date: ${txn.transactionDate}`);
        console.log(`   Email Subject: ${txn.emailSubject?.substring(0, 50)}...`);
      });
    } else {
      console.log('⚠️ No transactions could be parsed from emails');
      console.log('\nThis could mean:');
      console.log('- Email patterns are not recognized');
      console.log('- Parser needs updates for your email formats');
      console.log('- Emails don\'t contain transaction information');
      
      console.log('\nSample email for debugging:');
      const firstEmail = emails[0];
      const subject = firstEmail.payload.headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      console.log(`Subject: ${subject}`);
      console.log(`Snippet: ${firstEmail.snippet}`);
    }

    console.log('\n=== Debug Complete ===');

  } catch (error) {
    console.error('\n❌ Debug Failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

debugSync();
