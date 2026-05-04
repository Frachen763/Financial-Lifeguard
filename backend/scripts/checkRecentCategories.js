import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const checkRecentCategories = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected');
    
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Get recent transactions with populated categories
    const recentTxns = await Transaction.find({ userId: user._id })
      .populate('category', 'name icon color')
      .sort({ transactionDate: -1 })
      .limit(15);
    
    console.log('\n📊 Recent Transactions with Categories:');
    recentTxns.forEach((txn, index) => {
      const categoryName = txn.category ? txn.category.name : 'No Category';
      const categoryIcon = txn.category ? txn.category.icon : '💡';
      console.log(`  ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} to ${txn.merchant}`);
      console.log(`      Category: ${categoryIcon} ${categoryName}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
};

checkRecentCategories();
