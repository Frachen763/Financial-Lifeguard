import mongoose from 'mongoose';
import dotenv from 'dotenv';
import smartCategorizer from '../services/smartCategorizer.js';

dotenv.config();

const testSyncPerformance = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    console.log('✅ Connected to MongoDB');

    // Create test transactions
    const testTransactions = [];
    const merchants = [
      'Zomato Order', 'Swiggy Delivery', 'Amazon Purchase', 'Flipkart Shopping',
      'Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Neha Singh',
      'Uber Ride', 'Ola Cab', 'Property Owner', 'Internet Bill',
      'Netflix Subscription', 'Spotify Premium', 'Dominos Pizza', 'KFC Meal'
    ];

    for (let i = 0; i < 100; i++) {
      testTransactions.push({
        merchant: merchants[i % merchants.length],
        amount: Math.floor(Math.random() * 5000) + 100,
        transactionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        emailId: `test_${i}@example.com`
      });
    }

    console.log(`📊 Created ${testTransactions.length} test transactions`);

    // Test 1: Individual categorization (old method)
    console.log('\n🐌 Testing individual categorization...');
    const startTime1 = Date.now();
    
    for (const txn of testTransactions.slice(0, 20)) { // Test with 20 transactions
      await smartCategorizer.categorizeTransaction(
        '507f1f77bcf86cd799439011', // Dummy user ID
        txn.merchant,
        txn.amount,
        txn.transactionDate
      );
    }
    
    const individualTime = Date.now() - startTime1;
    console.log(`⏱️  Individual categorization took ${individualTime}ms for 20 transactions`);

    // Test 2: Batch categorization (new optimized method)
    console.log('\n🚀 Testing batch categorization...');
    const startTime2 = Date.now();
    
    const batchResults = await smartCategorizer.batchCategorizeTransactions(
      '507f1f77bcf86cd799439011', // Dummy user ID
      testTransactions.slice(0, 20) // Same 20 transactions
    );
    
    const batchTime = Date.now() - startTime2;
    console.log(`⏱️  Batch categorization took ${batchTime}ms for 20 transactions`);

    // Test 3: Large batch test
    console.log('\n📈 Testing large batch categorization...');
    const startTime3 = Date.now();
    
    const largeBatchResults = await smartCategorizer.batchCategorizeTransactions(
      '507f1f77bcf86cd799439011', // Dummy user ID
      testTransactions // All 100 transactions
    );
    
    const largeBatchTime = Date.now() - startTime3;
    console.log(`⏱️  Large batch categorization took ${largeBatchTime}ms for 100 transactions`);

    // Performance comparison
    console.log('\n📊 Performance Comparison:');
    console.log(`   Individual: ${individualTime}ms (${(individualTime/20).toFixed(1)}ms per transaction)`);
    console.log(`   Batch (20):  ${batchTime}ms (${(batchTime/20).toFixed(1)}ms per transaction)`);
    console.log(`   Batch (100): ${largeBatchTime}ms (${(largeBatchTime/100).toFixed(1)}ms per transaction)`);
    
    const improvement1 = ((individualTime - batchTime) / individualTime * 100).toFixed(1);
    const improvement2 = ((individualTime/20 - largeBatchTime/100) / (individualTime/20) * 100).toFixed(1);
    
    console.log(`   Improvement (20): ${improvement1}% faster`);
    console.log(`   Improvement (100): ${improvement2}% faster`);

    // Test 4: Cache performance
    console.log('\n💾 Testing cache performance...');
    const startTime4 = Date.now();
    
    // Repeat same transactions to test cache
    const cacheResults = await smartCategorizer.batchCategorizeTransactions(
      '507f1f77bcf86cd799439011',
      testTransactions.slice(0, 20)
    );
    
    const cacheTime = Date.now() - startTime4;
    console.log(`⏱️  Cached batch took ${cacheTime}ms for 20 transactions`);
    
    const cacheImprovement = ((batchTime - cacheTime) / batchTime * 100).toFixed(1);
    console.log(`   Cache improvement: ${cacheImprovement}% faster`);

    // Test 5: Memory usage
    const memUsage = process.memoryUsage();
    console.log('\n💾 Memory Usage:');
    console.log(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.log(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`   Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);

    console.log('\n✅ Performance test completed!');
    
    if (parseFloat(improvement1) > 50) {
      console.log('🎉 Excellent performance improvement!');
    } else if (parseFloat(improvement1) > 20) {
      console.log('👍 Good performance improvement!');
    } else {
      console.log('⚠️  Performance improvement could be better');
    }

  } catch (error) {
    console.error('❌ Performance test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

testSyncPerformance();
