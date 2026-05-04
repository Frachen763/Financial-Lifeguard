import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const calculate10YearCapacity = async () => {
  try {
    console.log('🔮 Calculating 10-year capacity with doubled transaction rate...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get your current transaction data
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    const yourTransactions = await Transaction.countDocuments({ userId: user._id });
    
    // Calculate your transaction rate
    const daysSinceCreation = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const yourDailyRate = yourTransactions / daysSinceCreation;
    const yourMonthlyRate = yourDailyRate * 30;
    const yourYearlyRate = yourMonthlyRate * 12;
    
    console.log('\n📊 Your Current Transaction Rate:');
    console.log(`   Days since account creation: ${daysSinceCreation.toFixed(0)}`);
    console.log(`   Total transactions: ${yourTransactions}`);
    console.log(`   Daily rate: ${yourDailyRate.toFixed(2)} transactions/day`);
    console.log(`   Monthly rate: ${yourMonthlyRate.toFixed(1)} transactions/month`);
    console.log(`   Yearly rate: ${yourYearlyRate.toFixed(0)} transactions/year`);
    
    // Calculate doubled rate
    const doubledDailyRate = yourDailyRate * 2;
    const doubledMonthlyRate = yourMonthlyRate * 2;
    const doubledYearlyRate = yourYearlyRate * 2;
    
    console.log('\n📈 Doubled Transaction Rate (per user):');
    console.log(`   Daily rate: ${doubledDailyRate.toFixed(2)} transactions/day`);
    console.log(`   Monthly rate: ${doubledMonthlyRate.toFixed(1)} transactions/month`);
    console.log(`   Yearly rate: ${doubledYearlyRate.toFixed(0)} transactions/year`);
    
    // Calculate 10-year transactions per user
    const tenYearTransactionsPerUser = doubledYearlyRate * 10;
    
    console.log('\n🗓️ 10-Year Projection (per user):');
    console.log(`   Total transactions in 10 years: ${tenYearTransactionsPerUser.toFixed(0)}`);
    
    // Database capacity
    const totalCapacity = 565056; // Total transactions on 512 MB free tier
    
    // Calculate how many users can be supported
    const maxUsers = Math.floor(totalCapacity / tenYearTransactionsPerUser);
    
    console.log('\n👥 User Capacity Calculation:');
    console.log(`   Total database capacity: ${totalCapacity.toLocaleString()} transactions`);
    console.log(`   Transactions per user (10 years): ${tenYearTransactionsPerUser.toFixed(0)}`);
    console.log(`   Maximum users supported: ${maxUsers}`);
    
    // Storage calculation
    const avgTransactionSize = 0.93; // KB from previous analysis
    const totalStorageKB = totalCapacity * avgTransactionSize;
    const storagePerUserKB = tenYearTransactionsPerUser * avgTransactionSize;
    
    console.log('\n💾 Storage Analysis:');
    console.log(`   Total storage available: 512 MB (524,288 KB)`);
    console.log(`   Storage per user (10 years): ${(storagePerUserKB / 1024).toFixed(2)} MB`);
    console.log(`   Storage utilization: ${((storagePerUserKB * maxUsers) / 524288 * 100).toFixed(1)}%`);
    
    // Different scenarios
    console.log('\n📋 Capacity Scenarios:');
    
    // Conservative (50% utilization)
    const conservativeUsers = Math.floor(maxUsers * 0.5);
    console.log(`   Conservative (50% utilization): ${conservativeUsers} users`);
    
    // Moderate (70% utilization)
    const moderateUsers = Math.floor(maxUsers * 0.7);
    console.log(`   Moderate (70% utilization): ${moderateUsers} users`);
    
    // Optimal (85% utilization)
    const optimalUsers = Math.floor(maxUsers * 0.85);
    console.log(`   Optimal (85% utilization): ${optimalUsers} users`);
    
    // Growth projections
    console.log('\n📊 Growth Projections:');
    console.log(`   Year 1: ${maxUsers} users × ${doubledYearlyRate.toFixed(0)} = ${(maxUsers * doubledYearlyRate).toLocaleString()} transactions`);
    console.log(`   Year 5: ${maxUsers} users × ${(doubledYearlyRate * 5).toFixed(0)} = ${(maxUsers * doubledYearlyRate * 5).toLocaleString()} transactions`);
    console.log(`   Year 10: ${maxUsers} users × ${tenYearTransactionsPerUser.toFixed(0)} = ${(maxUsers * tenYearTransactionsPerUser).toLocaleString()} transactions`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (maxUsers >= 1000) {
      console.log('   ✅ Excellent capacity for SaaS application');
      console.log('   ✅ Can support small to medium business');
    } else if (maxUsers >= 100) {
      console.log('   ✅ Good capacity for startup/MVP');
      console.log('   ✅ Suitable for beta testing program');
    } else {
      console.log('   ⚠️ Limited capacity - consider optimization');
    }
    
    console.log('\n🔧 Optimization Strategies:');
    console.log('   1. Archive old transactions (> 5 years)');
    console.log('   2. Compress email bodies');
    console.log('   3. Implement data retention policies');
    console.log('   4. Upgrade to MongoDB Atlas paid plans for more storage');
    console.log('   5. Use sharding for horizontal scaling');
    
    // MongoDB Atlas tiers comparison
    console.log('\n💰 MongoDB Atlas Tier Comparison:');
    console.log('   Free: 512 MB - ~' + maxUsers + ' users (10 years)');
    console.log('   Basic ($9/mo): 1 GB - ~' + Math.floor(maxUsers * 2) + ' users (10 years)');
    console.log('   Standard ($25/mo): 10 GB - ~' + Math.floor(maxUsers * 20) + ' users (10 years)');
    
  } catch (error) {
    console.error('❌ Calculation failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

calculate10YearCapacity();
