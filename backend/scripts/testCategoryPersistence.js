import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';

dotenv.config();

const testCategoryPersistence = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    console.log('✅ Connected to MongoDB');

    // Get a test user
    const testUser = await User.findOne();
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }
    console.log(`👤 Using test user: ${testUser.email}`);

    // Get categories
    const categories = await Category.find();
    if (categories.length < 2) {
      console.log('❌ Need at least 2 categories for testing');
      return;
    }

    // Find a transaction to test with
    const testTransaction = await Transaction.findOne({ userId: testUser._id });
    if (!testTransaction) {
      console.log('❌ No test transaction found');
      return;
    }

    console.log(`📝 Testing with transaction: ${testTransaction.merchant} (Current category: ${testTransaction.category})`);

    // Get current category details
    const originalCategory = await Category.findById(testTransaction.category);
    console.log(`🏷️  Original category: ${originalCategory.name} (${originalCategory.icon})`);

    // Pick a different category
    const newCategory = categories.find(cat => cat._id.toString() !== testTransaction.category.toString());
    console.log(`🔄 Changing to category: ${newCategory.name} (${newCategory.icon})`);

    // Update the transaction category
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      testTransaction._id,
      { category: newCategory._id },
      { new: true }
    ).populate('category', 'name icon color');

    console.log(`✅ Transaction updated successfully`);
    console.log(`📊 New category: ${updatedTransaction.category.name} (${updatedTransaction.category.icon})`);

    // Verify the change persisted by fetching again
    const verifiedTransaction = await Transaction.findById(testTransaction._id).populate('category', 'name icon color');
    console.log(`🔍 Verification - Category: ${verifiedTransaction.category.name} (${verifiedTransaction.category.icon})`);

    if (verifiedTransaction.category._id.toString() === newCategory._id.toString()) {
      console.log('✅ SUCCESS: Category change persisted correctly!');
    } else {
      console.log('❌ FAILURE: Category change did not persist!');
    }

    // Change it back to original
    await Transaction.findByIdAndUpdate(
      testTransaction._id,
      { category: originalCategory._id },
      { new: true }
    );
    console.log('🔄 Restored original category');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

testCategoryPersistence();
