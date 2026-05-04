import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkUnknownMerchants = async () => {
  try {
    console.log('🔍 Checking transactions with "Unknown" merchant...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Find all transactions with "Unknown" merchant
    const unknownTxns = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp('Unknown', 'i') },
    }).sort({ transactionDate: -1 });
    
    console.log(`\n📊 Found ${unknownTxns.length} transactions with "Unknown" merchant:\n`);
    
    if (unknownTxns.length === 0) {
      console.log('   No transactions found with "Unknown" merchant');
      return;
    }
    
    unknownTxns.forEach((txn, index) => {
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
    
    // Also check if we can find the original email from Gmail for a few samples
    console.log('\n🔍 Trying to fetch original emails from Gmail (first 3)...');
    
    if (user.gmailTokens && unknownTxns.length > 0) {
      try {
        const { gmail } = await import('googleapis');
        const auth = new google.auth.OAuth2();
        auth.setCredentials(user.gmailTokens);
        const gmailClient = gmail.google({ version: 'v1', auth });
        
        for (let i = 0; i < Math.min(3, unknownTxns.length); i++) {
          const txn = unknownTxns[i];
          if (txn.emailId) {
            try {
              console.log(`\n📬 Fetching email ID: ${txn.emailId}`);
              
              const response = await gmailClient.users.messages.get({
                userId: 'me',
                id: txn.emailId,
                format: 'full'
              });
              
              const message = response.data;
              const subject = message.payload.headers.find(h => h.name === 'Subject')?.value;
              const from = message.payload.headers.find(h => h.name === 'From')?.value;
              const date = message.payload.headers.find(h => h.name === 'Date')?.value;
              
              console.log(`\n📧 Original Email Details (${i + 1}):`);
              console.log(`   From: ${from}`);
              console.log(`   Date: ${date}`);
              console.log(`   Subject: ${subject}`);
              
              // Extract email body
              if (message.payload.parts) {
                for (const part of message.payload.parts) {
                  if (part.mimeType === 'text/plain' && part.body.data) {
                    const body = Buffer.from(part.body.data, 'base64').toString();
                    console.log(`\n📧 Original Email Body (${i + 1}):`);
                    console.log(body.substring(0, 500) + (body.length > 500 ? '...' : ''));
                    break;
                  }
                }
              } else if (message.payload.body.data) {
                const body = Buffer.from(message.payload.body.data, 'base64').toString();
                console.log(`\n📧 Original Email Body (${i + 1}):`);
                console.log(body.substring(0, 500) + (body.length > 500 ? '...' : ''));
              }
              
            } catch (error) {
              console.error(`❌ Failed to fetch email ${i + 1}:`, error.message);
            }
          }
        }
        
      } catch (error) {
        console.error('❌ Failed to initialize Gmail client:', error.message);
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

checkUnknownMerchants();
