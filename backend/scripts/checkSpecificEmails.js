import dotenv from 'dotenv';
import { google } from 'googleapis';
import User from '../models/User.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkSpecificEmails = async () => {
  try {
    console.log('🔍 Manually checking specific emails for transactions...');
    
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
    
    // Get recent emails with transaction keywords
    const queries = [
      'subject:(Rs OR Rs. OR ₹) after:1776432000', // Last 7 days
      'subject:(payment OR paid OR purchase) after:1776432000',
      'subject:(debited OR credited) after:1776432000',
    ];
    
    for (const query of queries) {
      console.log(`\n🔍 Query: ${query}`);
      
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 10,
        });
        
        const messages = response.data.messages || [];
        console.log(`📬 Found ${messages.length} emails`);
        
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          console.log(`\n📧 Email ${i + 1}: ${msg.id}`);
          
          try {
            const msgResponse = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'full',
            });
            
            if (!msgResponse.data.payload || !msgResponse.data.payload.headers) {
              console.log('  ⚠️ Missing payload');
              continue;
            }
            
            const headers = msgResponse.data.payload.headers;
            const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No subject';
            const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'No sender';
            const date = new Date(parseInt(msgResponse.data.internalDate)).toLocaleString();
            
            console.log(`  📅 Date: ${date}`);
            console.log(`  📝 Subject: "${subject}"`);
            console.log(`  👤 From: "${from}"`);
            
            // Get body content
            let bodyText = '';
            if (msgResponse.data.payload.body?.data) {
              bodyText = Buffer.from(msgResponse.data.payload.body.data, 'base64').toString('utf-8');
            } else if (msgResponse.data.payload.parts) {
              for (const part of msgResponse.data.payload.parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                  bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
                  break;
                }
              }
            }
            
            // Show snippet if available
            if (msgResponse.data.snippet) {
              console.log(`  📝 Snippet: "${msgResponse.data.snippet}"`);
            }
            
            // Check for transaction indicators
            const fullText = `${subject} ${from} ${bodyText} ${msgResponse.data.snippet || ''}`.toLowerCase();
            
            // Look for amounts
            const amountPatterns = [
              /(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
              /([0-9,]+(?:\.[0-9]{2})?)\s*(?:₹|rs\.?|inr|rupees)/gi,
            ];
            
            let foundAmounts = [];
            for (const pattern of amountPatterns) {
              const matches = [...fullText.matchAll(pattern)];
              foundAmounts.push(...matches);
            }
            
            if (foundAmounts.length > 0) {
              console.log(`  💰 Found amounts: ${foundAmounts.map(m => m[0]).join(', ')}`);
            }
            
            // Look for transaction keywords
            const transactionKeywords = ['debited', 'credited', 'paid', 'payment', 'purchase', 'transaction', 'upi', 'gpay', 'phonepe', 'paytm'];
            const foundKeywords = transactionKeywords.filter(keyword => fullText.includes(keyword));
            
            if (foundKeywords.length > 0) {
              console.log(`  🔍 Found keywords: ${foundKeywords.join(', ')}`);
            }
            
            // Manual assessment
            if (foundAmounts.length > 0 || foundKeywords.length > 0) {
              console.log(`  🤔 Could this be a transaction email? Check manually.`);
            }
            
          } catch (error) {
            console.error(`  ❌ Error: ${error.message}`);
          }
        }
      } catch (error) {
        console.error(`❌ Query error: ${error.message}`);
      }
    }
    
    console.log('\n✅ Manual check completed');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkSpecificEmails();
