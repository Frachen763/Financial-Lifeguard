import dotenv from 'dotenv';
import { google } from 'googleapis';
import User from '../models/User.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const inspectRecentEmails = async () => {
  try {
    console.log('🔍 Inspecting recent emails in detail...');
    
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
    
    // Get recent messages (last 50)
    console.log('📬 Fetching recent messages...');
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
    });
    
    const messages = listResponse.data.messages || [];
    console.log(`📬 Found ${messages.length} recent messages`);
    
    // Inspect each message
    for (let i = 0; i < Math.min(messages.length, 10); i++) {
      const msg = messages[i];
      console.log(`\n📧 Email ${i + 1}: ${msg.id}`);
      
      try {
        const msgResponse = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });
        
        const headers = msgResponse.data.payload?.headers || [];
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No subject';
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'No sender';
        const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || 'No date';
        const internalDate = new Date(parseInt(msgResponse.data.internalDate)).toLocaleString();
        
        console.log(`  📅 Date: ${date}`);
        console.log(`  🕐 Internal Date: ${internalDate}`);
        console.log(`  📝 Subject: "${subject}"`);
        console.log(`  👤 From: "${from}"`);
        
        // Check body content
        let bodyContent = '';
        if (msgResponse.data.payload?.body?.data) {
          bodyContent = Buffer.from(msgResponse.data.payload.body.data, 'base64').toString('utf-8');
          console.log(`  📄 Body length: ${bodyContent.length} characters`);
          if (bodyContent.length > 0 && bodyContent.length < 200) {
            console.log(`  📄 Body preview: "${bodyContent.substring(0, 100)}..."`);
          }
        }
        
        // Check parts
        if (msgResponse.data.payload?.parts) {
          console.log(`  📦 Parts: ${msgResponse.data.payload.parts.length}`);
          msgResponse.data.payload.parts.forEach((part, index) => {
            console.log(`    Part ${index + 1}: ${part.mimeType}`);
            if (part.body?.data) {
              const partContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
              console.log(`      Length: ${partContent.length} characters`);
              if (partContent.length > 0 && partContent.length < 200) {
                console.log(`      Preview: "${partContent.substring(0, 100)}..."`);
              }
            }
          });
        }
        
        // Check snippet
        if (msgResponse.data.snippet) {
          console.log(`  📝 Snippet: "${msgResponse.data.snippet.substring(0, 100)}..."`);
        }
        
        // Check if it could be a transaction email
        const fullText = `${subject} ${from} ${bodyContent} ${msgResponse.data.snippet || ''}`.toLowerCase();
        const transactionKeywords = ['payment', 'paid', 'debited', 'credited', 'transaction', 'purchase', 'order', 'upi', 'rs', '₹', 'amount', 'bank'];
        const hasKeyword = transactionKeywords.some(keyword => fullText.includes(keyword));
        
        if (hasKeyword) {
          console.log(`  💰 POTENTIAL TRANSACTION EMAIL!`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error fetching message: ${error.message}`);
      }
    }
    
    // Also specifically check for emails after April 22
    console.log('\n🔍 Checking specifically for emails after April 22...');
    const april22 = new Date('2026-04-22T00:00:00.000Z');
    const april22Timestamp = Math.floor(april22.getTime() / 1000);
    
    const afterApril22Response = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${april22Timestamp}`,
      maxResults: 20,
    });
    
    const afterApril22Messages = afterApril22Response.data.messages || [];
    console.log(`📬 Found ${afterApril22Messages.length} emails after April 22`);
    
    if (afterApril22Messages.length > 0) {
      console.log('\n📧 Sample emails after April 22:');
      for (let i = 0; i < Math.min(afterApril22Messages.length, 5); i++) {
        const msg = afterApril22Messages[i];
        try {
          const msgResponse = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['subject', 'from', 'date'],
          });
          
          const headers = msgResponse.data.payload?.headers || [];
          const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No subject';
          const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'No sender';
          const date = new Date(parseInt(msgResponse.data.internalDate)).toLocaleString();
          
          console.log(`  ${i + 1}. ${date} - From: ${from} - Subject: ${subject}`);
        } catch (error) {
          console.error(`  ${i + 1}. Error: ${error.message}`);
        }
      }
    }
    
    console.log('\n✅ Inspection completed');
    
  } catch (error) {
    console.error('❌ Inspection failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

inspectRecentEmails();
