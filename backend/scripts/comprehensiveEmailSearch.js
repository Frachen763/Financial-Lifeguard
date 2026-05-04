import dotenv from 'dotenv';
import { google } from 'googleapis';
import User from '../models/User.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const comprehensiveEmailSearch = async () => {
  try {
    console.log('🔍 Comprehensive email search for transactions...');
    
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
    
    // Search for emails in the last 30 days (not just subject)
    console.log('\n📅 Searching last 30 days for any transaction-related content...');
    
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    
    // Get all emails from last 30 days
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${thirtyDaysAgo}`,
      maxResults: 100,
    });
    
    const messages = response.data.messages || [];
    console.log(`📬 Found ${messages.length} emails in last 30 days`);
    
    let potentialTransactions = [];
    let checkedCount = 0;
    
    // Check each email
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      checkedCount++;
      
      // Show progress
      if (checkedCount % 10 === 0) {
        console.log(`  Checking email ${checkedCount}/${messages.length}...`);
      }
      
      try {
        const msgResponse = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['subject', 'from', 'date'],
        });
        
        if (!msgResponse.data.payload || !msgResponse.data.payload.headers) {
          continue;
        }
        
        const headers = msgResponse.data.payload.headers;
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const date = new Date(parseInt(msgResponse.data.internalDate)).toLocaleDateString();
        
        // Get snippet for content checking
        const snippet = msgResponse.data.snippet || '';
        
        // Check for transaction indicators in subject, from, or snippet
        const searchText = `${subject} ${from} ${snippet}`.toLowerCase();
        
        // Financial keywords
        const financialKeywords = [
          'debited', 'credited', 'payment', 'paid', 'purchase', 'transaction',
          'upi', 'gpay', 'phonepe', 'paytm', 'google pay', 'amazon pay',
          'rs', 'rs.', '₹', 'inr', 'rupee', 'amount', 'balance',
          'bank', 'account', 'card', 'swipe', 'order', 'invoice', 'receipt'
        ];
        
        const hasFinancialKeyword = financialKeywords.some(keyword => 
          searchText.includes(keyword)
        );
        
        // Check for actual amounts
        const hasAmount = /(?:₹|rs\.?|inr)\s*[0-9,]+/i.test(searchText) || 
                         /[0-9,]+\s*(?:₹|rs\.?|inr|rupees)/i.test(searchText);
        
        // Check if from financial institution
        const financialSenders = [
          'bank', 'paytm', 'phonepe', 'gpay', 'amazonpay', 'hdfc', 'icici', 
          'sbi', 'axis', 'kotak', 'visa', 'mastercard', 'rupay', 'famapp'
        ];
        
        const fromFinancial = financialSenders.some(sender => 
          from.toLowerCase().includes(sender)
        );
        
        if (hasFinancialKeyword || hasAmount || fromFinancial) {
          potentialTransactions.push({
            date,
            from,
            subject,
            snippet: snippet.substring(0, 100),
            hasKeyword: hasFinancialKeyword,
            hasAmount,
            fromFinancial,
          });
          
          console.log(`\n💰 Potential transaction email found:`);
          console.log(`  Date: ${date}`);
          console.log(`  From: ${from}`);
          console.log(`  Subject: ${subject}`);
          console.log(`  Snippet: ${snippet.substring(0, 150)}...`);
          console.log(`  Indicators: Keyword=${hasFinancialKeyword}, Amount=${hasAmount}, Financial Sender=${fromFinancial}`);
        }
        
      } catch (error) {
        // Skip errors
      }
      
      // Small delay to avoid rate limiting
      if (i % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total emails checked: ${checkedCount}`);
    console.log(`  Potential transactions found: ${potentialTransactions.length}`);
    
    if (potentialTransactions.length > 0) {
      console.log('\n🔍 These emails might contain transactions:');
      potentialTransactions.forEach((email, index) => {
        console.log(`\n${index + 1}. ${email.date} - ${email.from}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Snippet: ${email.snippet}...`);
      });
    } else {
      console.log('\n⚠️ No potential transaction emails found in the last 30 days.');
      console.log('\nPossible reasons:');
      console.log('1. Transactions were made through apps that don\'t send email notifications');
      console.log('2. Transaction emails went to a different email address');
      console.log('3. Transaction emails are in Spam/Promotions folders');
      console.log('4. Transactions were made more than 30 days ago');
    }
    
    // Also check if user has multiple email accounts
    console.log('\n📧 Current connected email: frachenborgohain@gmail.com');
    console.log('❓ Did you make transactions using a different email address?');
    
    console.log('\n✅ Search completed');
    
  } catch (error) {
    console.error('❌ Search failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

comprehensiveEmailSearch();
