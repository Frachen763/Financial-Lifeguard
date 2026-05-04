import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import { categorizeTransaction } from '../utils/categorizer.js';

dotenv.config();

const fixRecentTransactions = async () => {
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
    console.log(`👤 Fixing recent transactions for user: ${testUser.email}`);

    // Get user's categories
    const categories = await Category.find({
      $or: [{ userId: testUser._id }, { isDefault: true }],
    });
    
    console.log(`📋 Found ${categories.length} categories`);

    // Use raw MongoDB collection to bypass schema validation
    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');

    // Find all transactions after April 5th, 2026
    const april5th = new Date('2026-04-05T00:00:00.000Z');
    
    const recentTransactions = await transactionsCollection
      .find({
        userId: testUser._id,
        transactionDate: { $gte: april5th }
      })
      .toArray();

    console.log(`🔍 Found ${recentTransactions.length} transactions after April 5th`);

    let fixedCount = 0;
    let categorizedCount = 0;

    for (const transaction of recentTransactions) {
      console.log(`\n📋 Processing: "${transaction.merchant}"`);
      console.log(`   Date: ${transaction.transactionDate}`);
      console.log(`   Current category: ${transaction.category || 'NULL'}`);
      console.log(`   Suggested category: ${transaction.suggestedCategory || 'NULL'}`);

      let needsUpdate = false;
      let newCategory = transaction.category;

      // If transaction has suggestedCategory but no actual category, use suggested
      if (!transaction.category && transaction.suggestedCategory) {
        newCategory = transaction.suggestedCategory;
        needsUpdate = true;
        console.log(`   ✅ Using suggested category: ${transaction.suggestedCategory}`);
        categorizedCount++;
      }
      // If transaction has no category at all, categorize it based on merchant
      else if (!transaction.category) {
        const category = categorizeTransaction(transaction.merchant, categories);
        newCategory = category._id;
        needsUpdate = true;
        console.log(`   ✅ Auto-categorized as: ${category.name} (${category.icon})`);
        categorizedCount++;
      }

      // Clean up smart categorization fields if they exist
      const updateData = {};
      if (needsUpdate) {
        updateData.$set = { category: newCategory };
      }
      
      // Remove smart categorization fields
      if (transaction.categorizedBy || transaction.confidenceScore !== undefined || 
          transaction.suggestedCategory || transaction.contactId) {
        updateData.$unset = {
          categorizedBy: 1,
          confidenceScore: 1,
          suggestedCategory: 1,
          contactId: 1
        };
        needsUpdate = true;
      }

      if (needsUpdate) {
        await transactionsCollection.updateOne(
          { _id: transaction._id },
          updateData
        );
        console.log(`   🔄 Updated transaction`);
        fixedCount++;
      } else {
        console.log(`   ✅ Already has category, no update needed`);
      }
    }

    console.log(`\n🎉 Summary:`);
    console.log(`   - Total recent transactions: ${recentTransactions.length}`);
    console.log(`   - Transactions fixed: ${fixedCount}`);
    console.log(`   - Transactions categorized: ${categorizedCount}`);

    // Verify the fixes
    const stillWithoutCategory = await transactionsCollection.countDocuments({
      userId: testUser._id,
      transactionDate: { $gte: april5th },
      $or: [
        { category: null },
        { category: { $exists: false } }
      ]
    });

    console.log(`   - Still without categories: ${stillWithoutCategory}`);

    // Show sample of fixed transactions
    console.log(`\n📊 Sample fixed transactions:`);
    const sampleFixed = await transactionsCollection
      .find({
        userId: testUser._id,
        transactionDate: { $gte: april5th }
      })
      .limit(5)
      .toArray();

    // Get category names for display
    for (let i = 0; i < sampleFixed.length; i++) {
      const txn = sampleFixed[i];
      const category = categories.find(c => c._id.toString() === txn.category?.toString());
      console.log(`${i + 1}. "${txn.merchant}" -> ${category?.name || 'UNKNOWN'} (${category?.icon || ''})`);
    }

  } catch (error) {
    console.error('❌ Error fixing recent transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

fixRecentTransactions();
