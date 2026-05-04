import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';

dotenv.config();

const checkAllTransactions = async () => {
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

    // Find all transactions and sort by date
    const allTransactions = await transactionsCollection
      .find({ userId: testUser._id })
      .sort({ transactionDate: -1 })
      .toArray();

    console.log(`📊 Found ${allTransactions.length} total transactions:`);
    
    allTransactions.forEach((txn, index) => {
      console.log(`${index + 1}. "${txn.merchant}"`);
      console.log(`   Date: ${txn.transactionDate}`);
      console.log(`   Category: ${txn.category || 'NULL'} (${typeof txn.category})`);
      console.log(`   Suggested: ${txn.suggestedCategory || 'NULL'}`);
      console.log(`   Has smart fields: ${!!(txn.categorizedBy || txn.confidenceScore !== undefined || txn.suggestedCategory || txn.contactId)}`);
      console.log('');
    });

    // Also check what the frontend API would return
    console.log('🔍 Checking what API returns:');
    const apiResults = await Transaction.find({ userId: testUser._id })
      .populate('category', 'name icon color')
      .sort({ transactionDate: -1 })
      .limit(10);

    apiResults.forEach((txn, index) => {
      console.log(`${index + 1}. "${txn.merchant}" -> category:`, txn.category ? `${txn.category.name} (${txn.category.icon})` : 'NULL');
    });

  } catch (error) {
    console.error('❌ Error checking transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

checkAllTransactions();
