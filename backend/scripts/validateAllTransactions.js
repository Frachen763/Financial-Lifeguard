import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const validateAllTransactions = async () => {
  try {
    console.log('🔍 Validating all transactions based on bank account numbers...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Define valid bank accounts for this user
    const validAccounts = ['0633', '5830'];
    
    // Find all transactions
    const allTxns = await Transaction.find({
      userId: user._id,
    }).sort({ transactionDate: -1 });
    
    console.log(`\n📊 Analyzing ${allTxns.length} total transactions:\n`);
    
    let validCount = 0;
    let invalidCount = 0;
    const invalidIds = [];
    const invalidReasons = [];
    
    for (const txn of allTxns) {
      const hasValidAccount = validAccounts.includes(txn.accountNumber);
      
      console.log(`\n${'-'.repeat(60)}`);
      console.log(`Transaction: ₹${txn.amount} to ${txn.merchant}`);
      console.log(`Date: ${txn.transactionDate.toLocaleString()}`);
      console.log(`Account: ${txn.accountNumber || 'NOT FOUND'}`);
      console.log(`Bank: ${txn.bankName || 'NOT FOUND'}`);
      console.log(`Email: ${txn.emailSubject}`);
      
      if (hasValidAccount) {
        console.log(`   ✅ VALID - Has valid account (${txn.accountNumber})`);
        validCount++;
      } else {
        console.log(`   ❌ INVALID - No valid bank account`);
        console.log(`   Expected accounts: ${validAccounts.join(', ')}`);
        invalidCount++;
        invalidIds.push(txn._id);
        invalidReasons.push({
          id: txn._id,
          merchant: txn.merchant,
          amount: txn.amount,
          date: txn.transactionDate.toLocaleString(),
          reason: txn.accountNumber ? `Invalid account: ${txn.accountNumber}` : 'No account found'
        });
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('\n📊 Summary:');
    console.log(`   Valid transactions: ${validCount}`);
    console.log(`   Invalid transactions: ${invalidCount}`);
    
    // Show details of invalid transactions
    if (invalidIds.length > 0) {
      console.log(`\n❌ Invalid transactions to be deleted:`);
      invalidReasons.forEach((item, index) => {
        console.log(`   ${index + 1}. ₹${item.amount} to ${item.merchant} on ${item.date}`);
        console.log(`      Reason: ${item.reason}`);
      });
      
      console.log(`\n🗑️ Deleting ${invalidIds.length} invalid transactions...`);
      await Transaction.deleteMany({
        _id: { $in: invalidIds }
      });
      console.log(`   ✅ Deleted invalid transactions`);
    }
    
    // Show remaining valid transactions summary
    const remainingTxns = await Transaction.find({
      userId: user._id,
    }).sort({ transactionDate: -1 }).limit(10);
    
    console.log(`\n📊 Sample of valid transactions remaining:`);
    remainingTxns.forEach((txn, index) => {
      console.log(`   ${index + 1}. ₹${txn.amount} to ${txn.merchant} (A/c: ${txn.accountNumber}, ${txn.bankName})`);
    });
    
    console.log('\n✅ Validation completed!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

validateAllTransactions();
