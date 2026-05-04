import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { analyzeMerchantTransactions } from '../utils/categorizer.js';

dotenv.config();

const debugSpecificMerchant = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    const merchantName = 'Google India Digital Services Pvt Ltd';
    
    console.log('🔍 Debugging merchant:', merchantName);
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId }, { isDefault: true }],
    });
    
    // Get all transactions for this merchant within date range
    const marchFirst = new Date('2026-03-01');
    const today = new Date();
    
    const merchantTransactions = await Transaction.find({ 
      userId,
      merchant: { $regex: merchantName, $options: 'i' },
      transactionDate: {
        $gte: marchFirst,
        $lte: today
      }
    }).populate('category', 'name');
    
    console.log('📊 Total transactions (March 1 - Today):', merchantTransactions.length);
    
    // Show all transactions with categories
    console.log('\n📝 All transactions:');
    merchantTransactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ${txn.category?.name || 'Uncategorized'} - ₹${txn.amount}`);
    });
    
    // Count by category
    const categoryCounts = {};
    merchantTransactions.forEach(txn => {
      const categoryName = txn.category?.name || 'Miscellaneous';
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    });
    
    console.log('\n📊 Category Breakdown:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const percentage = Math.round((count / merchantTransactions.length) * 100);
      console.log(`   ${category}: ${count} transactions (${percentage}%)`);
    });
    
    // Find miscellaneous transactions
    const miscellaneousTxns = merchantTransactions.filter(txn => txn.category?.name === 'Miscellaneous');
    console.log('\n🎯 Miscellaneous transactions:', miscellaneousTxns.length);
    
    // Analyze merchant for suggestions
    console.log('\n🔍 Running analysis...');
    const analysis = await analyzeMerchantTransactions(merchantName, userId, categories, null, marchFirst.toISOString().split('T')[0], today.toISOString().split('T')[0]);
    
    console.log('Analysis result:', {
      hasSuggestion: analysis.hasSuggestion,
      totalTransactions: analysis.totalTransactions,
      confidence: analysis.confidence,
      suggestedCategory: analysis.suggestedCategory?.name,
      categoryBreakdown: analysis.categoryBreakdown
    });
    
    // Check current suggestions
    console.log('\n🔍 Current suggestions:');
    miscellaneousTxns.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]}:`, 
        txn.categorySuggestion ? 
        `Suggested ${txn.categorySuggestion.suggestedCategory?.name} (${txn.categorySuggestion.confidence}%)` : 
        'No suggestion');
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

debugSpecificMerchant();
