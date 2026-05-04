import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import { categorizeTransaction } from '../utils/categorizer.js';

dotenv.config();

const fixTransactionCategories = async () => {
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
    console.log('📋 Categories:', categories.map(c => ({ name: c.name, keywords: c.keywords })));

    // Find all transactions without categories or with null/empty categories
    const transactionsWithoutCategory = await Transaction.find({
      userId: testUser._id,
      $or: [
        { category: null },
        { category: { $exists: false } }
      ]
    });

    console.log(`🔍 Found ${transactionsWithoutCategory.length} transactions without categories`);

    if (transactionsWithoutCategory.length === 0) {
      console.log('✅ All transactions already have categories');
      
      // Let's also check a few sample transactions to see their current state
      const sampleTransactions = await Transaction.find({ userId: testUser._id })
        .limit(5)
        .populate('category', 'name icon color');
      
      console.log('📊 Sample transactions:');
      sampleTransactions.forEach((txn, index) => {
        console.log(`${index + 1}. ${txn.merchant} -> ${txn.category?.name || 'NO CATEGORY'}`);
      });
      return;
    }

    // Update each transaction with proper category
    let updatedCount = 0;
    for (const transaction of transactionsWithoutCategory) {
      const category = categorizeTransaction(transaction.merchant, categories);
      
      await Transaction.findByIdAndUpdate(transaction._id, {
        category: category._id
      });
      
      console.log(`✅ Updated "${transaction.merchant}" -> "${category.name}"`);
      updatedCount++;
    }

    console.log(`🎉 Successfully updated ${updatedCount} transactions with categories`);

    // Verify the updates
    const stillWithoutCategory = await Transaction.countDocuments({
      userId: testUser._id,
      $or: [
        { category: null },
        { category: { $exists: false } }
      ]
    });

    console.log(`📊 Transactions still without categories: ${stillWithoutCategory}`);

    // Show sample of updated transactions
    const sampleUpdated = await Transaction.find({ userId: testUser._id })
      .limit(5)
      .populate('category', 'name icon color');
    
    console.log('📊 Sample updated transactions:');
    sampleUpdated.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.merchant} -> ${txn.category?.name || 'NO CATEGORY'} (${txn.category?.icon})`);
    });

  } catch (error) {
    console.error('❌ Error fixing transaction categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

fixTransactionCategories();
