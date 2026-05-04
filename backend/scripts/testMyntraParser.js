import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const testMyntraParser = async () => {
  try {
    console.log('🧪 Testing Myntra parser on "Viewport" transactions...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    const emailParser = await import('../services/emailParser.js');
    const parseMyntraEmail = emailParser.default.parseMyntraEmail || emailParser.parseMyntraEmail;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Find all "Viewport" transactions
    const viewportTxns = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp('Viewport', 'i') },
    }).sort({ transactionDate: -1 });
    
    console.log(`\n📊 Testing ${viewportTxns.length} "Viewport" transactions:\n`);
    
    for (const txn of viewportTxns) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Testing transaction: ₹${txn.amount} on ${txn.transactionDate.toLocaleString()}`);
      console.log(`Current merchant: ${txn.merchant}`);
      
      // Test the new parser
      const result = parseMyntraEmail(
        txn.emailSubject || '',
        txn.emailBody || txn.description || '',
        txn.emailSnippet || ''
      );
      
      console.log(`\n🔍 Parser Result:`);
      console.log(`   Amount: ${result.amount}`);
      console.log(`   Merchant: ${result.merchant}`);
      
      if (result.merchant === 'Myntra') {
        console.log(`\n✅ SUCCESS: Found correct merchant name!`);
        console.log(`   Old: ${txn.merchant}`);
        console.log(`   New: ${result.merchant}`);
        
        // Update the transaction
        await Transaction.findByIdAndUpdate(txn._id, {
          merchant: result.merchant,
          // Also update amount if it's wrong
          ...(result.amount && result.amount !== txn.amount ? { amount: result.amount } : {})
        });
        
        console.log(`   ✅ Updated in database!`);
      } else {
        console.log(`\n⚠️ Parser did not return Myntra`);
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

testMyntraParser();
