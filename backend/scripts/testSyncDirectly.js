import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const testSyncDirectly = async () => {
  try {
    console.log('🔄 Testing sync directly...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 User: ${user.email}`);
    console.log(`📅 Last sync: ${user.lastEmailSync}`);
    
    // Check Gmail tokens
    if (!user.gmailTokens) {
      console.log('❌ No Gmail tokens found');
      return;
    }
    
    // Check if token needs refresh
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
    
    // Test fetching emails
    console.log('\n📬 Testing email fetch...');
    try {
      const { fetchTransactionEmails } = await import('../services/gmailService.js');
      const emails = await fetchTransactionEmails(tokens, user.lastEmailSync);
      console.log(`✅ Fetched ${emails.length} emails`);
      
      if (emails.length > 0) {
        console.log('\n📧 Sample emails:');
        emails.slice(0, 3).forEach((email, index) => {
          const date = new Date(parseInt(email.internalDate));
          console.log(`  ${index + 1}. ${date.toLocaleString()} - ${email.snippet?.substring(0, 50)}...`);
        });
      }
      
      // Test parsing
      console.log('\n🔍 Testing email parsing...');
      const { parseMultipleEmails } = await import('../services/emailParser.js');
      const parsed = parseMultipleEmails(emails);
      console.log(`✅ Parsed ${parsed.length} transactions`);
      
      if (parsed.length > 0) {
        console.log('\n💰 Sample parsed transactions:');
        parsed.slice(0, 3).forEach((txn, index) => {
          console.log(`  ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Email fetch failed:', error.message);
      if (error.code === 429) {
        console.log('⚠️ Rate limited - Gmail API limit reached');
      }
    }
    
    // Check recent transactions
    console.log('\n📊 Checking recent transactions...');
    const recentTxns = await Transaction.find({ userId: user._id })
      .sort({ transactionDate: -1 })
      .limit(5);
    
    console.log('Last 5 transactions:');
    recentTxns.forEach((txn, index) => {
      console.log(`  ${index + 1}. ${txn.transactionDate.toLocaleString()} - ₹${txn.amount} to ${txn.merchant}`);
    });
    
    console.log('\n✅ Direct sync test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

testSyncDirectly();
