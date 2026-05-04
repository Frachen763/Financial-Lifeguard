import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

dotenv.config();

const migrateTransactions = async () => {
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
    console.log(`👤 Migrating transactions for user: ${testUser.email}`);

    // Use raw MongoDB collection to bypass schema validation
    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');

    // Find all transactions that have suggestedCategory but no category
    const transactionsToMigrate = await transactionsCollection
      .find({
        userId: testUser._id,
        suggestedCategory: { $exists: true, $ne: null },
        $or: [
          { category: null },
          { category: { $exists: false } }
        ]
      })
      .toArray();

    console.log(`🔍 Found ${transactionsToMigrate.length} transactions to migrate`);

    if (transactionsToMigrate.length === 0) {
      console.log('✅ No transactions need migration');
      
      // Show current state
      const sampleTransactions = await transactionsCollection
        .find({ userId: testUser._id })
        .limit(5)
        .toArray();
      
      console.log('📊 Current transaction state:');
      sampleTransactions.forEach((txn, index) => {
        console.log(`${index + 1}. ${txn.merchant} -> category: ${txn.category || 'NULL'}, suggested: ${txn.suggestedCategory || 'NULL'}`);
      });
      return;
    }

    // Migrate each transaction
    let migratedCount = 0;
    for (const transaction of transactionsToMigrate) {
      await transactionsCollection.updateOne(
        { _id: transaction._id },
        { 
          $set: { category: transaction.suggestedCategory },
          $unset: { 
            categorizedBy: 1,
            confidenceScore: 1,
            suggestedCategory: 1,
            contactId: 1
          }
        }
      );
      
      console.log(`✅ Migrated "${transaction.merchant}" - moved suggested category to actual category`);
      migratedCount++;
    }

    console.log(`🎉 Successfully migrated ${migratedCount} transactions`);

    // Also clean up any other transactions that might have smart categorization fields
    const cleanupResult = await transactionsCollection.updateMany(
      { 
        userId: testUser._id,
        $or: [
          { categorizedBy: { $exists: true } },
          { confidenceScore: { $exists: true } },
          { suggestedCategory: { $exists: true } },
          { contactId: { $exists: true } }
        ]
      },
      { 
        $unset: { 
          categorizedBy: 1,
          confidenceScore: 1,
          suggestedCategory: 1,
          contactId: 1
        }
      }
    );

    console.log(`🧹 Cleaned up smart categorization fields from ${cleanupResult.modifiedCount} additional transactions`);

    // Show final state
    const finalTransactions = await transactionsCollection
      .find({ userId: testUser._id })
      .limit(5)
      .toArray();
    
    console.log('📊 Final transaction state:');
    finalTransactions.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.merchant} -> category: ${txn.category || 'NULL'}`);
    });

    // Count transactions without categories
    const withoutCategory = await transactionsCollection.countDocuments({
      userId: testUser._id,
      $or: [
        { category: null },
        { category: { $exists: false } }
      ]
    });

    console.log(`📊 Transactions still without categories: ${withoutCategory}`);

  } catch (error) {
    console.error('❌ Error migrating transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

migrateTransactions();
