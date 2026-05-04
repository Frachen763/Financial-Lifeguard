import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const verifyUpdatedTransactions = async () => {
  try {
    console.log('✅ Verifying updated transactions...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Find the transactions that were updated
    const updatedTxns = await Transaction.find({
      userId: user._id,
      $or: [
        { merchant: 'Coursera' },
        { merchant: 'Swiggy' },
        { merchant: 'Blinkit' },
        { merchant: 'Airtel' },
        { merchant: 'Jorhat' },
        { merchant: 'Msopulenceresort.Eazypay' },
        { merchant: 'Eazypay.Ntb1100067907' },
        { merchant: '2306655907914 01' }
      ]
    }).sort({ transactionDate: -1 });
    
    console.log(`\n📊 Found ${updatedTxns.length} recently updated transactions:\n`);
    
    updatedTxns.forEach((txn, index) => {
      console.log(`${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      console.log(`   Date: ${txn.transactionDate.toLocaleString()}`);
      console.log(`   Account: ${txn.accountNumber || 'N/A'} (${txn.bankName || 'N/A'})`);
      console.log(`   Email: ${txn.emailSubject}`);
      console.log('');
    });
    
    // Check if any "More Details" remain
    const remainingMoreDetails = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp('More Details', 'i') },
    });
    
    if (remainingMoreDetails.length > 0) {
      console.log(`\n⚠️ Still found ${remainingMoreDetails.length} "More Details" transactions:`);
      remainingMoreDetails.forEach((txn, index) => {
        console.log(`   ${index + 1}. ₹${txn.amount} on ${txn.transactionDate.toLocaleString()}`);
      });
    } else {
      console.log(`\n✅ SUCCESS: No "More Details" transactions remaining!`);
    }
    
    console.log('\n✅ Verification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

verifyUpdatedTransactions();
