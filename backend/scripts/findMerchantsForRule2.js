import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const findMerchantsForRule2 = async () => {
  try {
    console.log(`🔍 Finding merchants suitable for Rule 2 testing`);
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Find merchants with 5+ transactions
    const merchants = await Transaction.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: '$merchant', count: { $sum: 1 } } },
      { $match: { count: { $gte: 5 } } },
      { $sort: { count: 1 } },
      { $limit: 10 }
    ]);
    
    console.log(`\n📊 Found ${merchants.length} merchants with 5+ transactions:`);
    
    for (const merchant of merchants) {
      console.log(`\n🏪 "${merchant._id}": ${merchant.count} transactions`);
      
      // Check category consistency
      const transactions = await Transaction.find({
        userId: user._id,
        merchant: merchant._id
      }).populate('category', 'name');
      
      const categoryCounts = {};
      transactions.forEach(txn => {
        const categoryName = txn.category?.name || 'No Category';
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      });
      
      const topCategory = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      const [categoryName, count] = topCategory;
      const percentage = Math.round((count / merchant.count) * 100);
      
      console.log(`   Top category: ${categoryName} (${count}/${merchant.count} = ${percentage}%)`);
      
      if (percentage === 100 && merchant.count >= 5 && categoryName !== 'Miscellaneous') {
        console.log(`   🚀 PERFECT for Rule 2! Would auto-categorize next transaction`);
      } else if (percentage > 50 && merchant.count >= 3 && categoryName !== 'Miscellaneous') {
        console.log(`   ✅ Good for Rule 1! Would suggest ${categoryName} for new transactions`);
      } else {
        console.log(`   ⚠️ No strong pattern`);
      }
    }
    
    // Find one that's close to perfect for demonstration
    const goodCandidate = merchants.find(m => m.count >= 5 && m.count <= 7);
    if (goodCandidate) {
      console.log(`\n🎯 Good candidate for Rule 2 demo: "${goodCandidate._id}" (${goodCandidate.count} transactions)`);
      
      // Show current state
      const transactions = await Transaction.find({
        userId: user._id,
        merchant: goodCandidate._id
      }).populate('category', 'name').sort({ transactionDate: -1 });
      
      console.log(`\n📋 Recent transactions for "${goodCandidate._id}":`);
      transactions.slice(0, 3).forEach((txn, index) => {
        console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} (${txn.category?.name || 'No Category'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error finding merchants for Rule 2:', error);
  } finally {
    process.exit(0);
  }
};

findMerchantsForRule2();
