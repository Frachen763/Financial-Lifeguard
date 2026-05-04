import dotenv from 'dotenv';
import { google } from 'googleapis';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import { parseTransactionEmail } from '../services/emailParser.js';

// Load environment variables
dotenv.config();

const checkPostApril22 = async () => {
  try {
    console.log('🔍 Checking for transactions after April 22nd...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get a test user
    const testUser = await User.findOne({ gmailConnected: true });
    if (!testUser) {
      console.log('❌ No user with Gmail connected found');
      return;
    }
    
    console.log(`👤 Checking emails for: ${testUser.email}`);
    
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
    
    // Set up Gmail API
    const { setCredentials } = await import('../services/gmailService.js');
    const auth = setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    
    // April 22, 2026 in Unix timestamp
    const april22 = new Date('2026-04-22T00:00:00.000Z');
    const april22Timestamp = Math.floor(april22.getTime() / 1000);
    
    console.log(`📅 Searching for emails after: ${april22.toISOString()}`);
    
    // Try multiple queries to find transaction emails
    const queries = [
      // Query 1: Standard transaction keywords
      `subject:(transaction OR payment OR debited OR credited OR UPI OR spent OR purchase OR order OR paid OR received OR transferred OR withdrawn OR charged OR refunded OR cashback) after:${april22Timestamp}`,
      
      // Query 2: Money-related terms
      `subject:(Rs OR Rs. OR ₹ OR amount OR debit OR credit OR balance OR account) after:${april22Timestamp}`,
      
      // Query 3: Very broad - any email with money symbols
      `(Rs OR Rs. OR ₹ OR rupee OR amount OR paid OR payment) after:${april22Timestamp}`,
      
      // Query 4: Bank-related
      `subject:(bank OR account OR debit OR credit OR transaction) after:${april22Timestamp}`,
      
      // Query 5: No subject filter - just date
      `after:${april22Timestamp}`
    ];
    
    for (let i = 0; i < queries.length; i++) {
      console.log(`\n🔍 Query ${i + 1}: ${queries[i].substring(0, 100)}...`);
      
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: queries[i],
          maxResults: 50,
        });
        
        const messages = response.data.messages || [];
        console.log(`📬 Found ${messages.length} emails`);
        
        if (messages.length > 0) {
          // Fetch first 10 emails to analyze
          const emailPromises = messages.slice(0, 10).map(msg =>
            gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'full',
            })
          );
          
          const emails = await Promise.all(emailPromises);
          
          console.log('\n📧 Sample emails:');
          emails.forEach((email, index) => {
            const subject = email.payload.headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No subject';
            const from = email.payload.headers.find(h => h.name.toLowerCase() === 'from')?.value || 'No sender';
            const date = new Date(parseInt(email.internalDate)).toLocaleString();
            
            // Try to parse as transaction
            const transaction = parseTransactionEmail(email);
            const isTxn = transaction ? '✅' : '❌';
            
            console.log(`  ${index + 1}. ${isTxn} ${date}`);
            console.log(`     From: ${from.split('<')[0].trim()}`);
            console.log(`     Subject: ${subject.substring(0, 80)}...`);
            if (transaction) {
              console.log(`     💰 Transaction: ₹${transaction.amount} to ${transaction.merchant}`);
            }
            console.log('');
          });
          
          // If we found transaction emails, break
          const hasTransactions = emails.some(email => parseTransactionEmail(email));
          if (hasTransactions) {
            console.log('✅ Found transaction emails in this query!');
            break;
          }
        }
      } catch (error) {
        console.error(`❌ Error with query ${i + 1}:`, error.message);
      }
    }
    
    // Also check if there are any emails at all after April 22
    console.log('\n🔍 Checking if there are ANY emails after April 22...');
    try {
      const allEmailsResponse = await gmail.users.messages.list({
        userId: 'me',
        q: `after:${april22Timestamp}`,
        maxResults: 10,
      });
      
      const allEmails = allEmailsResponse.data.messages || [];
      console.log(`📬 Found ${allEmails.length} total emails after April 22`);
      
      if (allEmails.length === 0) {
        console.log('⚠️ No emails found after April 22. This could mean:');
        console.log('  - Gmail API is not returning recent emails');
        console.log('  - There might be an issue with the date calculation');
        console.log('  - The emails might be in a different folder/label');
      }
    } catch (error) {
      console.error('❌ Error checking all emails:', error.message);
    }
    
    console.log('\n✅ Check completed');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkPostApril22();
