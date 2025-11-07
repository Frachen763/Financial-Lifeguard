import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { fetchTransactionEmails } from '../services/gmailService.js';

// Load environment variables
dotenv.config();

console.log('=== Gmail API Access Test ===\n');

const testGmailAccess = async () => {
  try {
    // Connect to MongoDB
    console.log('1. Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get user email from command line or use first user with Gmail connected
    const userEmail = process.argv[2];
    
    let user;
    if (userEmail) {
      console.log(`2. Looking for user: ${userEmail}`);
      user = await User.findOne({ email: userEmail });
    } else {
      console.log('2. Looking for any user with Gmail connected...');
      user = await User.findOne({ gmailConnected: true });
    }

    if (!user) {
      console.log('❌ No user found with Gmail connected');
      console.log('\nUsage: node scripts/testGmailAccess.js [user@email.com]');
      console.log('Or connect Gmail for at least one user first.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`   Gmail connected: ${user.gmailConnected}`);
    console.log(`   Last sync: ${user.lastEmailSync || 'Never'}\n`);

    // Check tokens
    console.log('3. Checking Gmail tokens...');
    if (!user.gmailTokens) {
      console.log('❌ No Gmail tokens found for this user');
      console.log('   Please reconnect Gmail for this user.');
      process.exit(1);
    }

    if (!user.gmailTokens.access_token) {
      console.log('❌ Access token is missing');
      console.log('   Please reconnect Gmail for this user.');
      process.exit(1);
    }

    console.log('✅ Access token found');
    
    if (user.gmailTokens.refresh_token) {
      console.log('✅ Refresh token found');
    } else {
      console.log('⚠️  No refresh token (token cannot be auto-refreshed)');
    }

    if (user.gmailTokens.expiry_date) {
      const expiryDate = new Date(user.gmailTokens.expiry_date);
      const now = new Date();
      const isExpired = expiryDate < now;
      
      console.log(`   Token expiry: ${expiryDate.toISOString()}`);
      console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
      
      if (isExpired && !user.gmailTokens.refresh_token) {
        console.log('\n❌ Token is expired and cannot be refreshed');
        console.log('   Please reconnect Gmail for this user.');
        process.exit(1);
      }
    }

    console.log();

    // Test Gmail API access
    console.log('4. Testing Gmail API access...');
    console.log('   This may take a few seconds...\n');

    const emails = await fetchTransactionEmails(user.gmailTokens, null);

    console.log('✅ Gmail API access successful!');
    console.log(`   Found ${emails.length} transaction-related emails\n`);

    if (emails.length > 0) {
      console.log('Sample emails:');
      emails.slice(0, 3).forEach((email, index) => {
        console.log(`   ${index + 1}. ${email.snippet.substring(0, 60)}...`);
      });
    } else {
      console.log('ℹ️  No transaction emails found in your Gmail');
      console.log('   This could mean:');
      console.log('   - You don\'t have transaction emails');
      console.log('   - Your emails don\'t match the search keywords');
      console.log('   - Your emails are older than 90 days');
    }

    console.log('\n=== Test Complete ===');
    console.log('✅ Gmail API is working correctly for this user');

  } catch (error) {
    console.error('\n❌ Test Failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('token')) {
      console.error('\nToken-related error. Try:');
      console.error('1. Disconnect Gmail in the app');
      console.error('2. Reconnect Gmail');
      console.error('3. Run this test again');
    } else if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\nAuthentication error. The token is invalid or expired.');
      console.error('Please reconnect Gmail for this user.');
    } else if (error.message.includes('400')) {
      console.error('\nBad request error. Check:');
      console.error('1. Gmail API is enabled in Google Cloud Console');
      console.error('2. OAuth scopes include gmail.readonly');
    } else {
      console.error('\nFull error details:');
      console.error(error);
    }
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

testGmailAccess();
