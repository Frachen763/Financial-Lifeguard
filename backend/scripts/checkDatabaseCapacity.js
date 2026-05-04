import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const checkDatabaseCapacity = async () => {
  try {
    console.log('🔍 Checking database capacity and current usage...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    const Category = (await import('../models/Category.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    console.log('\n📊 Current Database Usage:');
    console.log(`   User: ${user.email}`);
    
    // Count transactions
    const transactionCount = await Transaction.countDocuments({ userId: user._id });
    console.log(`   Transactions: ${transactionCount}`);
    
    // Calculate storage size (approximate)
    const transactions = await Transaction.find({ userId: user._id }).lean();
    let totalSize = 0;
    let avgEmailSize = 0;
    let emailCount = 0;
    
    transactions.forEach(txn => {
      // Estimate document size in bytes
      const docSize = JSON.stringify(txn).length;
      totalSize += docSize;
      
      if (txn.emailBody || txn.emailSnippet) {
        avgEmailSize += (txn.emailBody || txn.emailSnippet).length;
        emailCount++;
      }
    });
    
    avgEmailSize = emailCount > 0 ? avgEmailSize / emailCount : 0;
    
    console.log(`   Estimated storage used: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Average transaction size: ${(totalSize / transactionCount / 1024).toFixed(2)} KB`);
    console.log(`   Average email content size: ${(avgEmailSize / 1024).toFixed(2)} KB`);
    
    // MongoDB Atlas capacity limits
    console.log('\n📈 MongoDB Atlas Free Tier Limits:');
    console.log(`   Storage: 512 MB`);
    console.log(`   Current usage: ${(totalSize / 1024 / 1024).toFixed(2)} MB (${((totalSize / 1024 / 1024) / 512 * 100).toFixed(1)}%)`);
    console.log(`   Remaining: ${(512 - totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Estimate how many more transactions can be stored
    const remainingSpace = 512 * 1024 * 1024 - totalSize; // in bytes
    const avgTransactionSize = totalSize / transactionCount; // in bytes
    const estimatedMoreTransactions = Math.floor(remainingSpace / avgTransactionSize);
    
    console.log(`   Estimated capacity for ~${estimatedMoreTransactions.toLocaleString()} more transactions`);
    
    // Project future usage
    console.log('\n🔮 Future Projections (based on current usage):');
    const monthlyTransactions = 30; // Average assumption
    const yearlyTransactions = monthlyTransactions * 12;
    const yearlyGrowth = yearlyTransactions * avgTransactionSize / 1024 / 1024; // MB per year
    
    console.log(`   Assuming ${monthlyTransactions} transactions/month:`);
    console.log(`   Yearly growth: ${yearlyGrowth.toFixed(2)} MB`);
    console.log(`   Years until full: ${((512 - totalSize / 1024 / 1024) / yearlyGrowth).toFixed(1)} years`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if ((totalSize / 1024 / 1024) < 100) {
      console.log('   ✅ Plenty of space available');
    } else if ((totalSize / 1024 / 1024) < 400) {
      console.log('   ⚠️ Moderate usage - monitor growth');
    } else {
      console.log('   🚨 Approaching limit - consider upgrading or archiving');
    }
    
    console.log('\n📋 Storage Optimization Tips:');
    console.log('   1. Archive old transactions (> 2 years)');
    console.log('   2. Compress email bodies');
    console.log('   3. Delete unnecessary email content');
    console.log('   4. Consider MongoDB Atlas paid plans for more storage');
    
    // Show largest transactions
    console.log('\n📊 Largest Transactions (by storage):');
    const sortedBySize = transactions
      .map(txn => ({
        ...txn,
        size: JSON.stringify(txn).length
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);
    
    sortedBySize.forEach((txn, i) => {
      console.log(`   ${i+1}. ${txn.merchant} - ${(txn.size / 1024).toFixed(2)} KB`);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkDatabaseCapacity();
