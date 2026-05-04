import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

dotenv.config();

const removeSpecificTransaction = async (merchantName = null, transactionId = null) => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27091/financial-lifeguard');
    console.log('✅ Connected to MongoDB');

    // Get a test user
    const testUser = await User.findOne();
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }
    console.log(`👤 Removing transactions for user: ${testUser.email}`);

    let transactionsToRemove = [];

    if (transactionId) {
      // Remove by specific ID
      const txn = await Transaction.findOne({ _id: transactionId, userId: testUser._id });
      if (txn) {
        transactionsToRemove = [txn];
      } else {
        console.log('❌ Transaction not found with ID:', transactionId);
        return;
      }
    } else if (merchantName) {
      // Remove by merchant name (partial match)
      transactionsToRemove = await Transaction.find({
        userId: testUser._id,
        merchant: { $regex: merchantName, $options: 'i' }
      });
    } else {
      console.log('❌ Please provide either merchantName or transactionId');
      return;
    }

    if (transactionsToRemove.length === 0) {
      console.log('✅ No transactions found to remove');
      return;
    }

    console.log(`\n🗑️  Found ${transactionsToRemove.length} transactions to remove:`);

    // Show what will be removed
    for (const txn of transactionsToRemove) {
      console.log(`\n📄 Transaction to remove:`);
      console.log(`   ID: ${txn._id}`);
      console.log(`   Merchant: "${txn.merchant}"`);
      console.log(`   Amount: ₹${txn.amount}`);
      console.log(`   Date: ${txn.transactionDate.toLocaleString()}`);
      console.log(`   Email: ${txn.emailId}`);
      console.log(`   Category: ${txn.category || 'None'}`);
    }

    // For safety, let's just show what would be removed without actually deleting
    console.log('\n🛡️  SAFETY MODE: Showing what would be removed without actually deleting.');
    console.log('💡 To actually delete, uncomment the deletion code below.');
    console.log('⚠️  Make sure you want to remove these transactions!');

    /*
    // Uncomment this section to actually delete the transactions
    console.log('\n🗑️  Deleting transactions...');
    
    const deleteResults = await Promise.all(
      transactionsToRemove.map(txn => Transaction.findByIdAndDelete(txn._id))
    );

    console.log(`✅ Successfully deleted ${deleteResults.length} transactions!`);
    
    // Show remaining transactions
    const remainingCount = await Transaction.countDocuments({ userId: testUser._id });
    console.log(`📊 Remaining transactions: ${remainingCount}`);
    */

  } catch (error) {
    console.error('❌ Error removing transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Example usage:
// removeSpecificTransaction('Helvetica Neue'); // Remove by merchant name
// removeSpecificTransaction(null, '507f1f77bcf86cd799439011'); // Remove by ID

// For testing, let's look for any font-related transactions
const findFontTransactions = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27091/financial-lifeguard');
    console.log('✅ Connected to MongoDB');

    const testUser = await User.findOne();
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }

    const allTransactions = await Transaction.find({ userId: testUser._id });
    console.log(`\n📊 Found ${allTransactions.length} total transactions:`);

    for (const txn of allTransactions) {
      console.log(`   "${txn.merchant}" - ₹${txn.amount} - ${txn.transactionDate.toLocaleDateString()}`);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Run this to see all transactions
findFontTransactions();
