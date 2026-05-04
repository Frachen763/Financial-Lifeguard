import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import { categorizeTransaction } from '../utils/categorizer.js';

dotenv.config();

const fixCategoriesRaw = async () => {
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
    console.log(`👤 Fixing categories for user: ${testUser.email}`);

    // Get user's categories
    const categories = await Category.find({
      $or: [{ userId: testUser._id }, { isDefault: true }],
    });
    
    console.log(`📋 Found ${categories.length} categories`);

    // Use raw MongoDB collection to bypass validation
    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');

    // First, let's see what we're working with
    const sampleTransactions = await transactionsCollection
      .find({ userId: testUser._id })
      .limit(5)
      .toArray();
    
    console.log('📊 Sample transactions before fix:');
    sampleTransactions.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.merchant} -> category: ${txn.category || 'NULL'} (type: ${typeof txn.category})`);
    });

    // Find all transactions with invalid categories (null, undefined, or empty string)
    const invalidTransactions = await transactionsCollection
      .find({
        userId: testUser._id,
        $or: [
          { category: null },
          { category: { $exists: false } },
          { category: '' }
        ]
      })
      .toArray();

    console.log(`🔍 Found ${invalidTransactions.length} transactions with invalid categories`);

    if (invalidTransactions.length === 0) {
      console.log('✅ All transactions already have valid categories');
      return;
    }

    // Update each transaction with proper category
    let updatedCount = 0;
    for (const transaction of invalidTransactions) {
      const category = categorizeTransaction(transaction.merchant, categories);
      
      await transactionsCollection.updateOne(
        { _id: transaction._id },
        { $set: { category: category._id } }
      );
      
      console.log(`✅ Updated "${transaction.merchant}" -> "${category.name}" (${category._id})`);
      updatedCount++;
    }

    console.log(`🎉 Successfully updated ${updatedCount} transactions with categories`);

    // Verify the updates
    const stillInvalid = await transactionsCollection.countDocuments({
      userId: testUser._id,
      $or: [
        { category: null },
        { category: { $exists: false } },
        { category: '' }
      ]
    });

    console.log(`📊 Transactions still with invalid categories: ${stillInvalid}`);

    // Show sample of updated transactions
    const sampleUpdated = await transactionsCollection
      .find({ userId: testUser._id })
      .limit(5)
      .toArray();
    
    console.log('📊 Sample transactions after fix:');
    for (let i = 0; i < sampleUpdated.length; i++) {
      const txn = sampleUpdated[i];
      // Find category name for display
      const category = categories.find(c => c._id.toString() === txn.category?.toString());
      console.log(`${i + 1}. ${txn.merchant} -> ${category?.name || 'UNKNOWN'} (${category?.icon || ''})`);
    }

  } catch (error) {
    console.error('❌ Error fixing categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

fixCategoriesRaw();
