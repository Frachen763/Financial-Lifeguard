import dotenv from 'dotenv';
import { fetchTransactionEmails } from '../services/gmailService.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkRecentEmails = async () => {
  try {
    console.log('🔍 Checking for recent emails...');
    
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
    
    // Test 1: Last 30 days
    console.log('\n📅 Checking last 30 days...');
    const emails30Days = await fetchTransactionEmails(tokens, 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    console.log(`Found ${emails30Days.length} emails in last 30 days`);
    
    // Test 2: Last 7 days
    console.log('\n📅 Checking last 7 days...');
    const emails7Days = await fetchTransactionEmails(tokens,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    console.log(`Found ${emails7Days.length} emails in last 7 days`);
    
    // Test 3: Last 3 days
    console.log('\n📅 Checking last 3 days...');
    const emails3Days = await fetchTransactionEmails(tokens,
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());
    console.log(`Found ${emails3Days.length} emails in last 3 days`);
    
    // Test 4: Last 1 day
    console.log('\n📅 Checking last 1 day...');
    const emails1Day = await fetchTransactionEmails(tokens,
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString());
    console.log(`Found ${emails1Day.length} emails in last 1 day`);
    
    // If we found any recent emails, show their details
    if (emails3Days.length > 0) {
      console.log('\n📧 Recent emails (last 3 days):');
      emails3Days.slice(0, 5).forEach((email, index) => {
        const subject = email.payload.headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No subject';
        const from = email.payload.headers.find(h => h.name.toLowerCase() === 'from')?.value || 'No sender';
        const date = new Date(parseInt(email.internalDate)).toLocaleString();
        console.log(`  ${index + 1}. ${date} - From: ${from.split('<')[0].trim()} - Subject: ${subject.substring(0, 80)}...`);
      });
    }
    
    // Test with a broader query to see if we're missing emails
    console.log('\n🔍 Testing with broader query...');
    const { google } = await import('googleapis');
    const { setCredentials } = await import('../services/gmailService.js');
    
    const auth = setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Very broad query - just look for any emails with money-related terms
    const broadQuery = '(Rs OR Rs. OR ₹ OR rupee OR amount OR paid OR payment OR debit OR credit)';
    const broadResponse = await gmail.users.messages.list({
      userId: 'me',
      q: `${broadQuery} after:${Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60)}`, // Last 7 days
      maxResults: 50,
    });
    
    const broadMessages = broadResponse.data.messages || [];
    console.log(`📬 Found ${broadMessages.length} emails with money-related terms in last 7 days`);
    
    if (broadMessages.length > 0) {
      console.log('\n📧 Sample emails with money terms:');
      // Fetch first 5 emails
      const samplePromises = broadMessages.slice(0, 5).map(msg =>
        gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['subject', 'from', 'date'],
        })
      );
      
      const sampleEmails = await Promise.all(samplePromises);
      sampleEmails.forEach((email, index) => {
        if (!email.payload || !email.payload.headers) {
          console.log(`  ${index + 1}. Email with missing payload data`);
          return;
        }
        const subject = email.payload.headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No subject';
        const from = email.payload.headers.find(h => h.name.toLowerCase() === 'from')?.value || 'No sender';
        const date = new Date(parseInt(email.internalDate)).toLocaleString();
        console.log(`  ${index + 1}. ${date} - From: ${from.split('<')[0].trim()} - Subject: ${subject}`);
      });
    }
    
    console.log('\n✅ Email check completed');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkRecentEmails();
