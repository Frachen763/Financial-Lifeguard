import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

dotenv.config();

const removeSuspiciousTransactions = async () => {
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
    console.log(`👤 Cleaning transactions for user: ${testUser.email}`);

    // Define suspicious patterns
    const suspiciousPatterns = [
      /helvetica|arial|times|calibri|verdana|georgia|palatino|garamond|bookman|comic sans/i,
      /font|typeface|typography/i,
      /undefined|null|none|unknown/i,
      /purchase verification|settings|confirmation/i,
      /^[a-z\s]+$/i, // Only lowercase letters and spaces
      /^\d+$/, // Only numbers
      /^.{1,2}$/, // Very short names
    ];

    // Find suspicious transactions
    const suspiciousTransactions = await Transaction.find({ userId: testUser._id });
    const toRemove = [];

    for (const txn of suspiciousTransactions) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(txn.merchant)) {
          toRemove.push(txn);
          break;
        }
      }
    }

    console.log(`\n🗑️  Found ${toRemove.length} suspicious transactions to remove:`);

    if (toRemove.length === 0) {
      console.log('✅ No suspicious transactions to remove!');
      return;
    }

    // Show what will be removed
    for (const txn of toRemove) {
      console.log(`\n📄 Transaction to remove:`);
      console.log(`   ID: ${txn._id}`);
      console.log(`   Merchant: "${txn.merchant}"`);
      console.log(`   Amount: ₹${txn.amount}`);
      console.log(`   Date: ${txn.transactionDate.toLocaleString()}`);
      console.log(`   Email: ${txn.emailId}`);
    }

    // Ask for confirmation (in real script, you might want to add this)
    console.log('\n⚠️  WARNING: This will permanently delete these transactions!');
    console.log('💡 Make sure you want to remove them before proceeding.');

    // For safety, let's just show what would be removed without actually deleting
    console.log('\n🛡️  SAFETY MODE: Showing what would be removed without actually deleting.');
    console.log('💡 To actually delete, uncomment the deletion code below.');

    /*
    // Uncomment this section to actually delete the transactions
    console.log('\n🗑️  Deleting suspicious transactions...');
    
    const deleteResults = await Promise.all(
      toRemove.map(txn => Transaction.findByIdAndDelete(txn._id))
    );

    console.log(`✅ Successfully deleted ${deleteResults.length} suspicious transactions!`);
    
    // Show remaining transactions
    const remainingCount = await Transaction.countDocuments({ userId: testUser._id });
    console.log(`📊 Remaining transactions: ${remainingCount}`);
    */

  } catch (error) {
    console.error('❌ Error removing suspicious transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

removeSuspiciousTransactions();
