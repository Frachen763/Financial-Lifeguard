import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkMoreDetailsTransactions = async () => {
  try {
    console.log('🔍 Checking transactions to "More Details" merchant...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Find all transactions to "More Details"
    const moreDetailsTxns = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp('More Details', 'i') },
    }).sort({ transactionDate: -1 });
    
    console.log(`\n📊 Found ${moreDetailsTxns.length} transactions to "More Details":`);
    
    if (moreDetailsTxns.length === 0) {
      console.log('   No transactions found for "More Details" merchant');
      return;
    }
    
    moreDetailsTxns.forEach((txn, index) => {
      console.log(`\n${index + 1}. Transaction Details:`);
      console.log(`   Date: ${txn.transactionDate.toLocaleString()}`);
      console.log(`   Amount: ₹${txn.amount}`);
      console.log(`   Merchant: ${txn.merchant}`);
      console.log(`   Payment Method: ${txn.paymentMethod}`);
      console.log(`   Account: ${txn.accountNumber || 'N/A'}`);
      console.log(`   Bank: ${txn.bankName || 'N/A'}`);
      console.log(`   Email ID: ${txn.emailId || 'N/A'}`);
      console.log(`   Description: ${txn.description || 'N/A'}`);
      
      if (txn.emailSubject) {
        console.log(`\n   📧 Email Subject:`);
        console.log(`   ${txn.emailSubject}`);
      }
      
      if (txn.emailSnippet) {
        console.log(`\n   📧 Email Snippet:`);
        console.log(`   ${txn.emailSnippet}`);
      }
      
      if (txn.emailBody) {
        console.log(`\n   📧 Full Email Body (parsed):`);
        console.log(`   ${txn.emailBody}`);
      }
      
      console.log('\n' + '='.repeat(80));
    });
    
    // Also check if we can find the original email from Gmail
    console.log('\n🔍 Trying to fetch original email from Gmail...');
    
    if (user.gmailTokens && moreDetailsTxns.length > 0 && moreDetailsTxns[0].emailId) {
      try {
        const { gmail } = await import('googleapis');
        const auth = new google.auth.OAuth2();
        auth.setCredentials(user.gmailTokens);
        const gmailClient = gmail.google({ version: 'v1', auth });
        
        // Get the first transaction's email
        const emailId = moreDetailsTxns[0].emailId;
        console.log(`\n📬 Fetching email ID: ${emailId}`);
        
        const response = await gmailClient.users.messages.get({
          userId: 'me',
          id: emailId,
          format: 'full'
        });
        
        const message = response.data;
        const subject = message.payload.headers.find(h => h.name === 'Subject')?.value;
        const from = message.payload.headers.find(h => h.name === 'From')?.value;
        const date = message.payload.headers.find(h => h.name === 'Date')?.value;
        
        console.log(`\n📧 Original Email Details:`);
        console.log(`   From: ${from}`);
        console.log(`   Date: ${date}`);
        console.log(`   Subject: ${subject}`);
        
        // Extract email body
        if (message.payload.parts) {
          for (const part of message.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body.data) {
              const body = Buffer.from(part.body.data, 'base64').toString();
              console.log(`\n📧 Original Email Body:`);
              console.log(body);
              break;
            }
          }
        } else if (message.payload.body.data) {
          const body = Buffer.from(message.payload.body.data, 'base64').toString();
          console.log(`\n📧 Original Email Body:`);
          console.log(body);
        }
        
      } catch (error) {
        console.error('❌ Failed to fetch original email:', error.message);
      }
    }
    
    console.log('\n✅ Check completed!');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkMoreDetailsTransactions();
