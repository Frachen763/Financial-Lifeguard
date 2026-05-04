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
    
    // Get all emails after April 22
    console.log('\n🔍 Fetching all emails after April 22...');
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${april22Timestamp}`,
      maxResults: 50,
    });
    
    const messages = response.data.messages || [];
    console.log(`📬 Found ${messages.length} emails after April 22`);
    
    if (messages.length === 0) {
      console.log('❌ No emails found after April 22');
      return;
    }
    
    // Fetch emails in batches to avoid rate limits
    const batchSize = 10;
    let allEmails = [];
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      console.log(`📥 Fetching batch ${Math.floor(i/batchSize) + 1}...`);
      
      try {
        const emailPromises = batch.map(msg =>
          gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full',
          }).catch(error => {
            console.error(`❌ Error fetching email ${msg.id}:`, error.message);
            return null;
          })
        );
        
        const batchEmails = await Promise.all(emailPromises);
        allEmails.push(...batchEmails.filter(email => email !== null));
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully fetched ${allEmails.length} emails`);
    
    // Analyze each email
    console.log('\n📧 Analyzing emails for transaction content...');
    let transactionCount = 0;
    let potentialTransactions = [];
    
    allEmails.forEach((email, index) => {
      if (!email.payload || !email.payload.headers) {
        console.log(`⚠️ Email ${index + 1}: Missing payload data`);
        return;
      }
      
      const subject = email.payload.headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No subject';
      const from = email.payload.headers.find(h => h.name.toLowerCase() === 'from')?.value || 'No sender';
      const date = new Date(parseInt(email.internalDate)).toLocaleString();
      
      // Try to parse as transaction
      const transaction = parseTransactionEmail(email);
      
      if (transaction) {
        transactionCount++;
        potentialTransactions.push({ email, transaction });
        console.log(`\n✅ TRANSACTION FOUND ${transactionCount}:`);
        console.log(`  Date: ${date}`);
        console.log(`  From: ${from.split('<')[0].trim()}`);
        console.log(`  Subject: ${subject}`);
        console.log(`  💰 Amount: ₹${transaction.amount}`);
        console.log(`  🏪 Merchant: ${transaction.merchant}`);
        console.log(`  📧 Email ID: ${email.id}`);
      } else {
        // Check if it might be a transaction email based on subject
        const transactionKeywords = ['payment', 'paid', 'debited', 'credited', 'transaction', 'purchase', 'order', 'upi', 'rs', '₹', 'amount'];
        const hasKeyword = transactionKeywords.some(keyword => 
          subject.toLowerCase().includes(keyword)
        );
        
        if (hasKeyword) {
          console.log(`\n🔍 POTENTIAL TRANSACTION (not parsed):`);
          console.log(`  Date: ${date}`);
          console.log(`  From: ${from.split('<')[0].trim()}`);
          console.log(`  Subject: ${subject}`);
        }
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total emails analyzed: ${allEmails.length}`);
    console.log(`  Valid transactions found: ${transactionCount}`);
    console.log(`  Potential transactions in database: ${potentialTransactions.length}`);
    
    // Check if these transactions are already in the database
    if (potentialTransactions.length > 0) {
      const Transaction = (await import('../models/Transaction.js')).default;
      
      for (const { email, transaction } of potentialTransactions) {
        const existing = await Transaction.findOne({
          userId: testUser._id,
          emailId: email.id,
        });
        
        if (existing) {
          console.log(`  ⚠️ Transaction already exists: ₹${transaction.amount} to ${transaction.merchant}`);
        } else {
          console.log(`  🆕 New transaction to be added: ₹${transaction.amount} to ${transaction.merchant}`);
        }
      }
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
