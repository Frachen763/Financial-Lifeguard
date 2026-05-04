import dotenv from 'dotenv';
import { google } from 'googleapis';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import { parseTransactionEmail } from '../services/emailParser.js';

// Load environment variables
dotenv.config();

const searchForTransactionEmails = async () => {
  try {
    console.log('🔍 Searching for actual transaction emails...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get a test user
    const testUser = await User.findOne({ gmailConnected: true });
    if (!testUser) {
      console.log('❌ No user with Gmail connected found');
      return;
    }
    
    // Check Gmail tokens
    let tokens = testUser.gmailTokens;
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      const { refreshAccessToken } = await import('../services/gmailService.js');
      tokens = await refreshAccessToken(tokens.refresh_token);
      testUser.gmailTokens = tokens;
      await testUser.save();
    }
    
    // Set up Gmail API
    const { setCredentials } = await import('../services/gmailService.js');
    const auth = setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Search for transaction emails in different time periods
    const searchPeriods = [
      { name: 'Last 7 days', days: 7 },
      { name: 'Last 14 days', days: 14 },
      { name: 'Last 30 days', days: 30 },
      { name: 'Last 90 days', days: 90 },
    ];
    
    for (const period of searchPeriods) {
      console.log(`\n📅 Searching ${period.name}...`);
      
      const since = new Date();
      since.setDate(since.getDate() - period.days);
      const sinceTimestamp = Math.floor(since.getTime() / 1000);
      
      // Try different transaction-specific queries
      const queries = [
        // Bank transaction keywords
        `subject:(debited OR credited OR "account debited" OR "account credited" OR transaction) after:${sinceTimestamp}`,
        
        // UPI and payment apps
        `subject:(UPI OR "Google Pay" OR PhonePe OR Paytm OR GPay OR payment) after:${sinceTimestamp}`,
        
        // Amount and currency
        `subject:(Rs OR Rs. OR ₹ OR "INR" OR amount) after:${sinceTimestamp}`,
        
        // Card transactions
        `subject:(card OR "debit card" OR "credit card" OR swipe) after:${sinceTimestamp}`,
        
        // Common transaction phrases
        `subject:(purchase OR order OR paid OR spent) after:${sinceTimestamp}`,
      ];
      
      let totalFound = 0;
      let transactionsFound = 0;
      
      for (let i = 0; i < queries.length; i++) {
        try {
          const response = await gmail.users.messages.list({
            userId: 'me',
            q: queries[i],
            maxResults: 50,
          });
          
          const messages = response.data.messages || [];
          totalFound += messages.length;
          
          if (messages.length > 0) {
            console.log(`  Query ${i + 1}: Found ${messages.length} emails`);
            
            // Check first few emails for actual transactions
            const checkCount = Math.min(messages.length, 5);
            for (let j = 0; j < checkCount; j++) {
              try {
                const msgResponse = await gmail.users.messages.get({
                  userId: 'me',
                  id: messages[j].id,
                  format: 'full',
                });
                
                const transaction = parseTransactionEmail(msgResponse);
                if (transaction) {
                  transactionsFound++;
                  console.log(`    ✅ Transaction: ₹${transaction.amount} to ${transaction.merchant} on ${new Date(parseInt(msgResponse.data.internalDate)).toLocaleDateString()}`);
                }
              } catch (error) {
                // Skip errors
              }
            }
          }
        } catch (error) {
          console.error(`  Query ${i + 1} error: ${error.message}`);
        }
      }
      
      console.log(`  📊 Total emails: ${totalFound}, Actual transactions: ${transactionsFound}`);
      
      if (transactionsFound > 0) {
        console.log(`  ✅ Found ${transactionsFound} transaction emails in ${period.name}!`);
        break;
      }
    }
    
    // Also check for specific senders (banks, payment apps)
    console.log('\n🏦 Checking for emails from banks and payment apps...');
    const financialSenders = [
      'from:(bank OR hdfc OR icici OR sbi OR axis OR kotak)',
      'from:(paytm OR phonepe OR gpay OR "google pay")',
      'from:(amazonpay OR "amazon pay")',
      'from:(rupay OR visa OR mastercard)',
      'from:(famapp OR fampay)',
    ];
    
    for (const senderQuery of financialSenders) {
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: `${senderQuery} after:${Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)}`,
          maxResults: 20,
        });
        
        const messages = response.data.messages || [];
        if (messages.length > 0) {
          console.log(`  📧 ${senderQuery}: Found ${messages.length} emails`);
          
          // Check a few
          for (let i = 0; i < Math.min(messages.length, 3); i++) {
            try {
              const msgResponse = await gmail.users.messages.get({
                userId: 'me',
                id: messages[i].id,
                format: 'metadata',
                metadataHeaders: ['subject', 'from', 'date'],
              });
              
              const headers = msgResponse.data.payload?.headers || [];
              const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No subject';
              const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'No sender';
              const date = new Date(parseInt(msgResponse.data.internalDate)).toLocaleString();
              
              console.log(`    ${date} - ${from} - ${subject.substring(0, 60)}...`);
            } catch (error) {
              // Skip errors
            }
          }
        }
      } catch (error) {
        console.error(`  Error with ${senderQuery}: ${error.message}`);
      }
    }
    
    // Check if transactions might be in a different email account
    console.log('\n🤔 If you made transactions after April 22nd but they\'re not showing up, it could be because:');
    console.log('  1. The transaction emails were sent to a different email address');
    console.log('  2. The transactions were made through apps that don\'t send email notifications');
    console.log('  3. The transaction emails are in a different folder/label (like Spam or Promotions)');
    console.log('  4. The transactions were very recent and haven\'t been processed yet');
    
    // Check spam folder
    console.log('\n📂 Checking Spam folder for transaction emails...');
    try {
      const spamResponse = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:spam (transaction OR payment OR debited OR credited OR UPI)',
        maxResults: 10,
      });
      
      const spamMessages = spamResponse.data.messages || [];
      console.log(`  📧 Found ${spamMessages.length} potential transaction emails in Spam`);
      
      if (spamMessages.length > 0) {
        console.log('  ⚠️ Transaction emails found in Spam! Move them to inbox to sync.');
      }
    } catch (error) {
      console.log('  Could not check spam folder');
    }
    
    console.log('\n✅ Search completed');
    
  } catch (error) {
    console.error('❌ Search failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

searchForTransactionEmails();
