import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

dotenv.config();

const clearEmptyCategories = async () => {
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
    console.log(`👤 Clearing empty categories for user: ${testUser.email}`);

    // Clear all transactions with empty string category
    const result = await Transaction.updateMany(
      { 
        userId: testUser._id,
        category: ''
      },
      { 
        $unset: { category: '' }
      }
    );

    console.log(`🧹 Cleared empty category field from ${result.modifiedCount} transactions`);

    // Show sample transactions to see current state
    const sampleTransactions = await Transaction.find({ userId: testUser._id })
      .limit(5)
      .populate('category', 'name icon color');
    
    console.log('📊 Sample transactions after cleanup:');
    sampleTransactions.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.merchant} -> ${txn.category?.name || 'NO CATEGORY'} (${txn.category?.icon || ''})`);
    });

  } catch (error) {
    console.error('❌ Error clearing empty categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

clearEmptyCategories();
