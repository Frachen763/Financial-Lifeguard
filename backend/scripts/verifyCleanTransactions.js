import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const verifyCleanTransactions = async () => {
  try {
    await connectDB();
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Count total transactions
    const totalCount = await Transaction.countDocuments({ userId: user._id });
    
    // Count transactions with valid accounts
    const validCount = await Transaction.countDocuments({ 
      userId: user._id,
      accountNumber: { $in: ['0633', '5830'] }
    });
    
    // Count transactions without valid accounts
    const invalidCount = totalCount - validCount;
    
    console.log('📊 Transaction Summary:');
    console.log(`   Total transactions: ${totalCount}`);
    console.log(`   Valid transactions (with 0633/5830): ${validCount}`);
    console.log(`   Invalid transactions: ${invalidCount}`);
    
    if (invalidCount > 0) {
      console.log('\n⚠️ Invalid transactions still exist:');
      const invalidTxns = await Transaction.find({
        userId: user._id,
        $or: [
          { accountNumber: { $ne: '0633', $ne: '5830' } },
          { accountNumber: { $exists: false } },
          { accountNumber: null }
        ]
      }).limit(5);
      
      invalidTxns.forEach((txn, i) => {
        console.log(`   ${i+1}. ₹${txn.amount} to ${txn.merchant} (Account: ${txn.accountNumber || 'NONE'})`);
      });
    } else {
      console.log('\n✅ All transactions have valid bank accounts!');
    }
    
    // Show sample of valid transactions
    console.log('\n📊 Sample of valid transactions:');
    const validTxns = await Transaction.find({
      userId: user._id,
      accountNumber: { $in: ['0633', '5830'] }
    }).sort({ transactionDate: -1 }).limit(5);
    
    validTxns.forEach((txn, i) => {
      console.log(`   ${i+1}. ₹${txn.amount} to ${txn.merchant} (A/c: ${txn.accountNumber}, ${txn.bankName})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifyCleanTransactions();
