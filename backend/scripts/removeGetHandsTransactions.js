import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const removeGetHandsTransactions = async () => {
  try {
    console.log('🗑️ Removing invalid "Get Hands" transactions...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Find all "Get Hands" transactions
    const getHandsTxns = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp('Get Hands', 'i') },
    }).sort({ transactionDate: -1 });
    
    console.log(`\n📊 Found ${getHandsTxns.length} "Get Hands" transactions to remove:\n`);
    
    for (const txn of getHandsTxns) {
      console.log(`- ₹${txn.amount} on ${txn.transactionDate.toLocaleString()}`);
      console.log(`  Email: ${txn.emailSubject}`);
    }
    
    // Delete all "Get Hands" transactions
    if (getHandsTxns.length > 0) {
      console.log(`\n🗑️ Deleting ${getHandsTxns.length} invalid transactions...`);
      await Transaction.deleteMany({
        userId: user._id,
        merchant: { $regex: new RegExp('Get Hands', 'i') },
      });
      console.log(`   ✅ Deleted all "Get Hands" transactions`);
    }
    
    // Verify removal
    const remainingTxns = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp('Get Hands', 'i') },
    });
    
    if (remainingTxns.length === 0) {
      console.log(`\n✅ SUCCESS: All "Get Hands" transactions removed!`);
    } else {
      console.log(`\n⚠️ Still found ${remainingTxns.length} "Get Hands" transactions`);
    }
    
    console.log('\n✅ Correction completed!');
    
  } catch (error) {
    console.error('❌ Removal failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

removeGetHandsTransactions();
