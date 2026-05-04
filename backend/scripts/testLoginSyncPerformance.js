import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';

dotenv.config();

const testLoginSyncPerformance = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    console.log('✅ Connected to MongoDB');

    // Find a test user
    const testUser = await User.findOne();
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }

    console.log(`👤 Testing login sync performance for user: ${testUser.email}`);

    // Check existing transaction count
    const existingTxnCount = await Transaction.countDocuments({ userId: testUser._id });
    console.log(`📊 User currently has ${existingTxnCount} transactions`);

    // Simulate login sync performance by checking database queries
    console.log('\n🔍 Testing database query performance...');

    // Test 1: Fetch user transactions (what dashboard does)
    const startTime1 = Date.now();
    const userTransactions = await Transaction.find({ userId: testUser._id })
      .populate('category', 'name icon color')
      .sort({ transactionDate: -1 })
      .limit(50);
    const txnQueryTime = Date.now() - startTime1;
    console.log(`⏱️  Transaction query took ${txnQueryTime}ms for ${userTransactions.length} transactions`);

    // Test 2: Fetch categories (what transactions page does)
    const startTime2 = Date.now();
    const categories = await Transaction.distinct('category', { userId: testUser._id });
    const categoryQueryTime = Date.now() - startTime2;
    console.log(`⏱️  Category query took ${categoryQueryTime}ms`);

    // Test 3: Fetch transaction stats (what dashboard does)
    const startTime3 = Date.now();
    const stats = await Transaction.aggregate([
      { $match: { userId: testUser._id } },
      { $group: {
        _id: null,
        totalSpent: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }}
    ]);
    const statsQueryTime = Date.now() - startTime3;
    console.log(`⏱️  Stats query took ${statsQueryTime}ms`);

    // Test 4: Check for uncategorized transactions
    const startTime4 = Date.now();
    const uncategorizedCount = await Transaction.countDocuments({
      userId: testUser._id,
      categorizedBy: { $in: ['pending', 'suggested'] }
    });
    const uncategorizedQueryTime = Date.now() - startTime4;
    console.log(`⏱️  Uncategorized query took ${uncategorizedQueryTime}ms (${uncategorizedCount} uncategorized)`);

    // Total load time
    const totalLoadTime = txnQueryTime + categoryQueryTime + statsQueryTime + uncategorizedQueryTime;
    console.log(`\n📊 Total login load time: ${totalLoadTime}ms`);

    // Performance assessment
    console.log('\n🎯 Performance Assessment:');
    if (totalLoadTime < 500) {
      console.log('✅ Excellent login performance!');
    } else if (totalLoadTime < 1000) {
      console.log('👍 Good login performance');
    } else if (totalLoadTime < 2000) {
      console.log('⚠️  Acceptable login performance');
    } else {
      console.log('❌ Poor login performance - needs optimization');
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (existingTxnCount > 1000) {
      console.log('   • Consider implementing pagination for transaction history');
      console.log('   • Add database indexes for frequently queried fields');
    }
    if (txnQueryTime > 300) {
      console.log('   • Optimize transaction query with better indexing');
    }
    if (uncategorizedCount > 50) {
      console.log('   • Consider batch processing uncategorized transactions');
    }

    // Check database indexes
    console.log('\n📋 Checking database indexes...');
    const txnIndexes = await Transaction.collection.getIndexes();
    console.log(`   Transaction indexes: ${Object.keys(txnIndexes).join(', ')}`);

    console.log('\n✅ Login sync performance test completed!');

  } catch (error) {
    console.error('❌ Performance test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

testLoginSyncPerformance();
