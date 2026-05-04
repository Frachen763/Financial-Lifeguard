import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';

dotenv.config();

const testCategorySessionPersistence = async () => {
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
    console.log(`👤 Testing with user: ${testUser.email}`);

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

    console.log(`📝 Testing transaction: ${testTransaction.merchant}`);

    // Step 1: Get original category
    const originalCategory = await Category.findById(testTransaction.category);
    console.log(`🏷️  Original category: ${originalCategory.name} (${originalCategory.icon})`);

    // Step 2: Change to a different category
    const newCategory = categories.find(cat => cat._id.toString() !== testTransaction.category.toString());
    console.log(`🔄 Changing to: ${newCategory.name} (${newCategory.icon})`);

    await Transaction.findByIdAndUpdate(
      testTransaction._id,
      { category: newCategory._id }
    );

    // Step 3: Simulate user logout/login by fetching fresh data
    console.log('🔄 Simulating user logout/login...');
    
    // Fetch transaction as if user just logged in (fresh query)
    const freshTransaction = await Transaction.findOne({ 
      userId: testUser._id, 
      _id: testTransaction._id 
    }).populate('category', 'name icon color');

    console.log(`📊 After "login" - Category: ${freshTransaction.category.name} (${freshTransaction.category.icon})`);

    // Step 4: Verify persistence
    if (freshTransaction.category._id.toString() === newCategory._id.toString()) {
      console.log('✅ SUCCESS: Category change persists across user sessions!');
    } else {
      console.log('❌ FAILURE: Category change lost after session refresh!');
    }

    // Step 5: Restore original category
    await Transaction.findByIdAndUpdate(
      testTransaction._id,
      { category: originalCategory._id }
    );
    console.log('🔄 Restored original category for cleanup');

    // Step 6: Final verification
    const finalTransaction = await Transaction.findById(testTransaction._id).populate('category', 'name icon color');
    console.log(`🏁 Final category: ${finalTransaction.category.name} (${finalTransaction.category.icon})`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

testCategorySessionPersistence();
