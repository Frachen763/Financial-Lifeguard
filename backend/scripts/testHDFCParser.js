import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const testHDFCParser = async () => {
  try {
    console.log('🧪 Testing HDFC UPI parser on existing transactions...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    const emailParser = await import('../services/emailParser.js');
    const parseHDFCUPIEmail = emailParser.default.parseHDFCUPIEmail || emailParser.parseHDFCUPIEmail;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Find all "More Details" transactions
    const moreDetailsTxns = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp('More Details', 'i') },
    }).sort({ transactionDate: -1 }).limit(5);
    
    console.log(`\n📊 Testing ${moreDetailsTxns.length} "More Details" transactions:\n`);
    
    for (const txn of moreDetailsTxns) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Testing transaction: ₹${txn.amount} on ${txn.transactionDate.toLocaleString()}`);
      console.log(`Current merchant: ${txn.merchant}`);
      
      // Test the new parser
      const result = parseHDFCUPIEmail(
        txn.emailSubject || '',
        txn.emailBody || txn.description || '',
        txn.emailSnippet || ''
      );
      
      console.log(`\n🔍 Parser Result:`);
      console.log(`   Amount: ${result.amount}`);
      console.log(`   Merchant: ${result.merchant}`);
      
      if (result.merchant !== 'UPI Payment' && result.merchant !== 'More Details') {
        console.log(`\n✅ SUCCESS: Found better merchant name!`);
        console.log(`   Old: ${txn.merchant}`);
        console.log(`   New: ${result.merchant}`);
        
        // Update the transaction
        await Transaction.findByIdAndUpdate(txn._id, {
          merchant: result.merchant,
          description: txn.description
        });
        
        console.log(`   ✅ Updated in database!`);
      } else {
        console.log(`\n⚠️ Could not find better merchant name`);
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

testHDFCParser();
