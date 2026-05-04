import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { analyzeMerchantTransactions } from '../utils/categorizer.js';

dotenv.config();

const findAllMerchantsWithSuggestions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    
    console.log('🔍 Finding ALL merchants that should show suggestions...');
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId }, { isDefault: true }],
    });
    
    // Get all transactions within date range
    const marchFirst = new Date('2026-03-01');
    const today = new Date();
    
    const allTransactions = await Transaction.find({ 
      userId,
      transactionDate: {
        $gte: marchFirst,
        $lte: today
      }
    }).populate('category', 'name');
    
    console.log('📊 Total transactions (March 1 - Today):', allTransactions.length);
    
    // Group transactions by merchant
    const merchantGroups = {};
    allTransactions.forEach(txn => {
      const merchant = txn.merchant || 'Unknown';
      if (!merchantGroups[merchant]) {
        merchantGroups[merchant] = [];
      }
      merchantGroups[merchant].push(txn);
    });
    
    console.log('🏪 Found', Object.keys(merchantGroups).length, 'unique merchants');
    
    let merchantsWithSuggestions = 0;
    let totalSuggestionsAdded = 0;
    
    // Analyze each merchant
    for (const [merchant, merchantTxns] of Object.entries(merchantGroups)) {
      console.log(`\n🔍 Analyzing merchant: ${merchant} (${merchantTxns.length} transactions)`);
      
      // Count by category
      const categoryCounts = {};
      merchantTxns.forEach(txn => {
        const categoryName = txn.category?.name || 'Miscellaneous';
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      });
      
      console.log('📊 Category Breakdown:');
      Object.entries(categoryCounts).forEach(([category, count]) => {
        const percentage = Math.round((count / merchantTxns.length) * 100);
        console.log(`   ${category}: ${count} transactions (${percentage}%)`);
      });
      
      // Find miscellaneous transactions
      const miscellaneousTxns = merchantTxns.filter(txn => txn.category?.name === 'Miscellaneous');
      console.log('🎯 Miscellaneous transactions:', miscellaneousTxns.length);
      
      // Analyze merchant for suggestions
      const analysis = await analyzeMerchantTransactions(merchant, userId, categories, null, marchFirst.toISOString().split('T')[0], today.toISOString().split('T')[0]);
      
      console.log('Analysis result:', {
        hasSuggestion: analysis.hasSuggestion,
        totalTransactions: analysis.totalTransactions,
        confidence: analysis.confidence,
        suggestedCategory: analysis.suggestedCategory?.name
      });
      
      if (analysis.hasSuggestion && analysis.totalTransactions >= 3 && miscellaneousTxns.length > 0) {
        merchantsWithSuggestions++;
        console.log('✅ SHOULD SHOW SUGGESTIONS for this merchant!');
        
        // Check current suggestions
        console.log('🔍 Current suggestions:');
        miscellaneousTxns.forEach((txn, index) => {
          console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]}:`, 
            txn.categorySuggestion ? 
            `✅ Suggested ${txn.categorySuggestion.suggestedCategory?.name} (${txn.categorySuggestion.confidence}%)` : 
            `❌ No suggestion`);
        });
        
        // Count how many have proper suggestions
        const properSuggestions = miscellaneousTxns.filter(txn => 
          txn.categorySuggestion && 
          txn.categorySuggestion.suggestedCategory && 
          txn.categorySuggestion.suggestedCategory.name
        ).length;
        
        console.log(`📈 ${properSuggestions}/${miscellaneousTxns.length} have proper suggestions`);
        totalSuggestionsAdded += properSuggestions;
      } else {
        console.log('❌ No suggestions needed or not enough transactions');
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total merchants analyzed: ${Object.keys(merchantGroups).length}`);
    console.log(`   Merchants that should show suggestions: ${merchantsWithSuggestions}`);
    console.log(`   Total proper suggestions found: ${totalSuggestionsAdded}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

findAllMerchantsWithSuggestions();
