import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';

dotenv.config();

const findAllUsersTransactions = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27091/financial-lifeguard');
    console.log('✅ Connected to MongoDB');

    // Find all users
    const allUsers = await User.find({});
    console.log(`👥 Found ${allUsers.length} users:`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name || 'No name'}) - ID: ${user._id}`);
    });

    // Use raw MongoDB collection to see exact data
    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');

    // Check transactions for each user
    for (const user of allUsers) {
      console.log(`\n📊 Checking transactions for user: ${user.email}`);
      
      const userTransactions = await transactionsCollection
        .find({ userId: user._id })
        .sort({ transactionDate: -1 })
        .toArray();

      console.log(`   Found ${userTransactions.length} transactions:`);
      
      userTransactions.forEach((txn, index) => {
        const hasCategory = !!txn.category;
        const hasSmartFields = !!(txn.categorizedBy || txn.confidenceScore !== undefined || txn.suggestedCategory || txn.contactId);
        
        console.log(`   ${index + 1}. "${txn.merchant}" (${txn.transactionDate?.toISOString?.().split('T')[0] || 'No date'})`);
        console.log(`       Category: ${txn.category || 'NULL'} - Has category: ${hasCategory}`);
        console.log(`       Smart fields: ${hasSmartFields}`);
        
        if (!hasCategory) {
          console.log(`       ⚠️  THIS TRANSACTION NEEDS CATEGORY!`);
        }
      });

      // Count transactions without categories for this user
      const withoutCategory = userTransactions.filter(txn => !txn.category).length;
      if (withoutCategory > 0) {
        console.log(`   🚨 ${withoutCategory} transactions without categories for this user!`);
      }
    }

    // Also find all transactions without categories across all users
    console.log(`\n🔍 Finding ALL transactions without categories:`);
    const allWithoutCategory = await transactionsCollection
      .find({
        $or: [
          { category: null },
          { category: { $exists: false } }
        ]
      })
      .toArray();

    console.log(`Found ${allWithoutCategory.length} transactions without categories across all users:`);
    allWithoutCategory.forEach((txn, index) => {
      console.log(`${index + 1}. User: ${txn.userId}, Merchant: "${txn.merchant}", Date: ${txn.transactionDate}`);
      console.log(`   Suggested category: ${txn.suggestedCategory || 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error checking users transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

findAllUsersTransactions();
