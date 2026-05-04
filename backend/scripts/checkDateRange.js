import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';

dotenv.config();

const checkDateRange = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    const merchantName = 'Frachen Borgohain';
    
    // Date range from frontend (March 1, 2026 to today)
    const marchFirst = new Date('2026-03-01');
    const today = new Date();
    
    console.log('📅 Date Range Analysis:');
    console.log('Start Date:', marchFirst.toISOString().split('T')[0]);
    console.log('End Date:', today.toISOString().split('T')[0]);
    console.log('');
    
    // All transactions for Frachen Borgohain
    const allTransactions = await Transaction.find({ 
      userId,
      merchant: { $regex: merchantName, $options: 'i' }
    }).populate('category', 'name');
    
    console.log('🔍 ALL Frachen Borgohain Transactions (Total):', allTransactions.length);
    
    // Transactions within date range (what frontend sees)
    const dateRangeTransactions = await Transaction.find({ 
      userId,
      merchant: { $regex: merchantName, $options: 'i' },
      transactionDate: {
        $gte: marchFirst,
        $lte: today
      }
    }).populate('category', 'name');
    
    console.log('📊 Frachen Borgohain Transactions in Date Range (March 1 - Today):', dateRangeTransactions.length);
    console.log('');
    
    // Show the dates of transactions outside the range
    const outsideRangeTransactions = allTransactions.filter(txn => 
      txn.transactionDate < marchFirst || txn.transactionDate > today
    );
    
    console.log('❌ Transactions OUTSIDE date range:', outsideRangeTransactions.length);
    if (outsideRangeTransactions.length > 0) {
      console.log('These transactions are not shown in frontend:');
      outsideRangeTransactions.slice(0, 10).forEach((txn, index) => {
        console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ${txn.category?.name || 'Uncategorized'} - ₹${txn.amount}`);
      });
      if (outsideRangeTransactions.length > 10) {
        console.log(`   ... and ${outsideRangeTransactions.length - 10} more`);
      }
    }
    
    console.log('');
    console.log('✅ Transactions WITHIN date range (what you see):');
    dateRangeTransactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ${txn.category?.name || 'Uncategorized'} - ₹${txn.amount}`);
    });
    
    // Analyze category breakdown for date range transactions
    const categoryCounts = {};
    dateRangeTransactions.forEach(txn => {
      const categoryName = txn.category?.name || 'Miscellaneous';
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    });
    
    console.log('');
    console.log('📊 Category Breakdown (Date Range Only):');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const percentage = Math.round((count / dateRangeTransactions.length) * 100);
      console.log(`   ${category}: ${count} transactions (${percentage}%)`);
    });
    
    // Check rule for date range transactions
    const totalInRange = dateRangeTransactions.length;
    const sortedCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({ category, count }));
    
    if (sortedCategories.length > 0) {
      const topCategory = sortedCategories[0];
      const topCategoryCount = topCategory.count;
      const topCategoryName = topCategory.category;
      
      console.log('');
      console.log('🎯 Rule Analysis (Date Range Only):');
      console.log('Total transactions:', totalInRange);
      console.log('Top category:', topCategoryName, 'with', topCategoryCount, 'transactions');
      console.log('More than half?', topCategoryCount, '>', totalInRange / 2, '=', topCategoryCount > totalInRange / 2);
      
      if (topCategoryCount > totalInRange / 2) {
        console.log('✅ SHOULD show suggestion');
      } else {
        console.log('❌ Should NOT show suggestion (not more than half in same category)');
      }
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

checkDateRange();
