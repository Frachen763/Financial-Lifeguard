import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

dotenv.config();

const findAllStoreTransactions = async () => {
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

    // Use raw MongoDB collection to see exact data
    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');

    // Find all transactions with "store" in the name
    const storeTransactions = await transactionsCollection
      .find({
        userId: testUser._id,
        merchant: { $regex: /store/i }
      })
      .toArray();

    console.log(`🔍 Found ${storeTransactions.length} transactions with "store" in name:`);
    
    storeTransactions.forEach((txn, index) => {
      console.log(`\n${index + 1}. Merchant: "${txn.merchant}"`);
      console.log(`   Category: ${txn.category || 'NULL'}`);
      console.log(`   Category Type: ${typeof txn.category}`);
    });

    // Also check all transactions to see what we have
    const allTransactions = await transactionsCollection
      .find({ userId: testUser._id })
      .limit(10)
      .toArray();

    console.log(`\n📊 First 10 transactions for user:`);
    allTransactions.forEach((txn, index) => {
      console.log(`${index + 1}. "${txn.merchant}" -> category: ${txn.category || 'NULL'} (${typeof txn.category})`);
    });

  } catch (error) {
    console.error('❌ Error checking transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

findAllStoreTransactions();
