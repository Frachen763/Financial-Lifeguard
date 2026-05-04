import dotenv from 'dotenv';
import { google } from 'googleapis';
import User from '../models/User.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkOtherAccount = async () => {
  try {
    console.log('🔍 Checking borgohain9435@gmail.com for transactions...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Check if there's a user with this email
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ No user found with email: borgohain9435@gmail.com');
      console.log('💡 This email needs to be connected to the app first');
      return;
    }
    
    console.log(`👤 Found user: ${user.email}`);
    console.log(`📧 Gmail connected: ${user.gmailConnected}`);
    
    if (!user.gmailConnected || !user.gmailTokens) {
      console.log('❌ Gmail not connected for this account');
      console.log('💡 This account needs Gmail OAuth connection first');
      return;
    }
    
    // Check Gmail tokens
    let tokens = user.gmailTokens;
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
    
    // Set up Gmail API
    const { setCredentials } = await import('../services/gmailService.js');
    const auth = setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Test basic access
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(`✅ Connected to Gmail: ${profile.data.emailAddress}`);
      console.log(`📧 Total messages: ${profile.data.messagesTotal}`);
    } catch (error) {
      console.error('❌ Failed to access Gmail:', error.message);
      return;
    }
    
    // Search for transaction emails after April 22nd
    console.log('\n📅 Searching for transaction emails after April 22nd...');
    
    const april22 = new Date('2026-04-22T00:00:00.000Z');
    const april22Timestamp = Math.floor(april22.getTime() / 1000);
    
    // Search with various transaction-related queries
    const queries = [
      `subject:(transaction OR payment OR debited OR credited OR UPI OR spent OR purchase OR order OR paid OR received OR transferred OR withdrawn OR charged OR refunded OR cashback) after:${april22Timestamp}`,
      `subject:(Rs OR Rs. OR ₹ OR amount OR debit OR credit) after:${april22Timestamp}`,
      `(Rs OR Rs. OR ₹ OR rupee OR amount OR paid OR payment) after:${april22Timestamp}`,
      `after:${april22Timestamp}` // All emails after April 22
    ];
    
    let totalTransactions = 0;
    
    for (let i = 0; i < queries.length; i++) {
      console.log(`\n🔍 Query ${i + 1}: ${queries[i].substring(0, 80)}...`);
      
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: queries[i],
          maxResults: 50,
        });
        
        const messages = response.data.messages || [];
        console.log(`📬 Found ${messages.length} emails`);
        
        if (messages.length > 0) {
          // Check first 10 emails for transactions
          const checkCount = Math.min(messages.length, 10);
          let foundTransactions = 0;
          
          for (let j = 0; j < checkCount; j++) {
            try {
              const msgResponse = await gmail.users.messages.get({
                userId: 'me',
                id: messages[j].id,
                format: 'metadata',
                metadataHeaders: ['subject', 'from', 'date'],
              });
              
              if (!msgResponse.data.payload || !msgResponse.data.payload.headers) {
                continue;
              }
              
              const headers = msgResponse.data.payload.headers;
              const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
              const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
              const date = new Date(parseInt(msgResponse.data.internalDate)).toLocaleString();
              const snippet = msgResponse.data.snippet || '';
              
              // Check if it looks like a transaction
              const searchText = `${subject} ${from} ${snippet}`.toLowerCase();
              const hasTransactionKeywords = [
                'debited', 'credited', 'payment', 'paid', 'purchase', 'transaction',
                'upi', 'gpay', 'phonepe', 'paytm', 'rs', '₹', 'amount'
              ].some(keyword => searchText.includes(keyword));
              
              if (hasTransactionKeywords) {
                foundTransactions++;
                console.log(`  💰 Transaction ${foundTransactions}:`);
                console.log(`    Date: ${date}`);
                console.log(`    From: ${from}`);
                console.log(`    Subject: ${subject}`);
                console.log(`    Snippet: ${snippet.substring(0, 100)}...`);
              }
              
            } catch (error) {
              // Skip errors
            }
          }
          
          totalTransactions += foundTransactions;
          if (foundTransactions > 0) {
            console.log(`  ✅ Found ${foundTransactions} potential transactions in this query`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Total potential transactions found: ${totalTransactions}`);
    
    if (totalTransactions > 0) {
      console.log('\n✅ Found transaction emails in borgohain9435@gmail.com!');
      console.log('💡 To sync these transactions:');
      console.log('1. Connect this account in the Financial Lifeguard app');
      console.log('2. Run the sync function');
    } else {
      console.log('\n⚠️ No transaction emails found in borgohain9435@gmail.com after April 22nd');
      console.log('\nPossible reasons:');
      console.log('1. Transactions might be older than April 22nd');
      console.log('2. Emails might be in Spam/Promotions folders');
      console.log('3. Transaction notifications might be disabled');
    }
    
    console.log('\n✅ Check completed');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkOtherAccount();
