import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkMyntraValidity = async () => {
  try {
    console.log('🔍 Checking validity of Myntra transactions...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Find all Myntra transactions
    const myntraTxns = await Transaction.find({
      userId: user._id,
      merchant: 'Myntra',
    }).sort({ transactionDate: -1 });
    
    console.log(`\n📊 Analyzing ${myntraTxns.length} Myntra transactions:\n`);
    
    let validCount = 0;
    let invalidCount = 0;
    const invalidIds = [];
    
    for (const txn of myntraTxns) {
      console.log(`\n${'-'.repeat(60)}`);
      console.log(`Transaction: ₹${txn.amount} on ${txn.transactionDate.toLocaleString()}`);
      console.log(`Account: ${txn.accountNumber || 'NOT FOUND'}`);
      console.log(`Bank: ${txn.bankName || 'NOT FOUND'}`);
      console.log(`Payment Method: ${txn.paymentMethod}`);
      
      // Check if it has bank account details
      const hasAccount = txn.accountNumber && txn.accountNumber.length > 0;
      const hasBank = txn.bankName && txn.bankName.length > 0;
      
      if (hasAccount && hasBank) {
        console.log(`   ✅ VALID - Has bank details`);
        validCount++;
      } else {
        console.log(`   ❌ INVALID - No bank account details`);
        console.log(`   This is just a delivery notification, not a payment`);
        invalidCount++;
        invalidIds.push(txn._id);
      }
      
      console.log(`   Email Subject: ${txn.emailSubject}`);
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('\n📊 Summary:');
    console.log(`   Valid transactions (with bank details): ${validCount}`);
    console.log(`   Invalid transactions (delivery notifications): ${invalidCount}`);
    
    // Delete invalid transactions
    if (invalidIds.length > 0) {
      console.log(`\n🗑️ Deleting ${invalidIds.length} invalid transactions...`);
      await Transaction.deleteMany({
        _id: { $in: invalidIds }
      });
      console.log(`   ✅ Deleted invalid transactions`);
    }
    
    // Show remaining valid transactions
    const validTxns = await Transaction.find({
      userId: user._id,
      merchant: 'Myntra',
    }).sort({ transactionDate: -1 });
    
    if (validTxns.length > 0) {
      console.log('\n📊 Remaining valid Myntra transactions:');
      validTxns.forEach((txn, index) => {
        console.log(`   ${index + 1}. ₹${txn.amount} on ${txn.transactionDate.toLocaleString()} (A/c: ${txn.accountNumber}, ${txn.bankName})`);
      });
    } else {
      console.log('\nℹ️ No valid Myntra transactions remaining');
    }
    
    console.log('\n✅ Validation completed!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkMyntraValidity();
