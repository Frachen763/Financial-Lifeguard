import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';

dotenv.config();

const debugMerchant = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    const merchantName = 'Frachen Borgohain';
    
    // Get all transactions for Frachen Borgohain
    const merchantTransactions = await Transaction.find({ 
      userId,
      merchant: { $regex: merchantName, $options: 'i' }
    }).populate('category', 'name');
    
    console.log('🔍 Frachen Borgohain Transaction Analysis:');
    console.log('Total transactions:', merchantTransactions.length);
    console.log('');
    
    // Count by category
    const categoryCounts = {};
    merchantTransactions.forEach(txn => {
      const categoryName = txn.category?.name || 'Miscellaneous';
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    });
    
    console.log('📊 Category Breakdown:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const percentage = Math.round((count / merchantTransactions.length) * 100);
      console.log(`   ${category}: ${count} transactions (${percentage}%)`);
    });
    
    console.log('');
    
    // Check if any category has more than half
    const totalTransactions = merchantTransactions.length;
    const sortedCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({ category, count }));
    
    const topCategory = sortedCategories[0];
    const topCategoryCount = topCategory.count;
    const topCategoryName = topCategory.category;
    
    console.log('🎯 Rule Analysis:');
    console.log('Total transactions:', totalTransactions);
    console.log('Top category:', topCategoryName, 'with', topCategoryCount, 'transactions');
    console.log('More than half?', topCategoryCount, '>', totalTransactions / 2, '=', topCategoryCount > totalTransactions / 2);
    
    if (topCategoryCount > totalTransactions / 2) {
      console.log('✅ SHOULD show suggestion');
    } else {
      console.log('❌ Should NOT show suggestion (not more than half in same category)');
    }
    
    console.log('');
    console.log('📝 Recent transactions:');
    merchantTransactions.slice(-5).forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ${txn.category?.name || 'Uncategorized'} - ₹${txn.amount}`);
    });
    
    // Check if any of these transactions have suggestions
    console.log('');
    console.log('🔍 Checking for existing suggestions:');
    const transactionsWithSuggestions = merchantTransactions.filter(txn => txn.categorySuggestion);
    console.log('Transactions with suggestions:', transactionsWithSuggestions.length);
    
    if (transactionsWithSuggestions.length > 0) {
      transactionsWithSuggestions.forEach(txn => {
        console.log(`   - ${txn.transactionDate.toISOString().split('T')[0]}: Suggested ${txn.categorySuggestion.suggestedCategory?.name} (${txn.categorySuggestion.confidence}% confidence)`);
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

debugMerchant();
