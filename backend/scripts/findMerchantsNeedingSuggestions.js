import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';

dotenv.config();

const findMerchantsNeedingSuggestions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    
    console.log('🔍 Finding merchants that NEED suggestions...');
    
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
    
    let merchantsNeedingSuggestions = 0;
    let totalMissingSuggestions = 0;
    
    // Analyze each merchant for suggestion eligibility
    for (const [merchant, merchantTxns] of Object.entries(merchantGroups)) {
      if (merchantTxns.length < 3) continue; // Skip merchants with < 3 transactions
      
      // Count by category
      const categoryCounts = {};
      merchantTxns.forEach(txn => {
        const categoryName = txn.category?.name || 'Miscellaneous';
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      });
      
      // Find the top category
      const sortedCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a);
      
      const [topCategory, topCount] = sortedCategories[0];
      const totalCount = merchantTxns.length;
      
      // Check if should show suggestion (3+ transactions AND >50% in same category AND not Miscellaneous)
      if (topCount > totalCount / 2 && topCategory !== 'Miscellaneous') {
        merchantsNeedingSuggestions++;
        
        console.log(`\n✅ SHOULD SHOW SUGGESTIONS: ${merchant}`);
        console.log(`   Total: ${totalCount} transactions`);
        console.log(`   Top: ${topCategory} (${topCount}/${totalCount} = ${Math.round((topCount/totalCount)*100)}%)`);
        
        // Find miscellaneous transactions
        const miscellaneousTxns = merchantTxns.filter(txn => txn.category?.name === 'Miscellaneous');
        console.log(`   Miscellaneous: ${miscellaneousTxns.length} transactions`);
        
        if (miscellaneousTxns.length > 0) {
          console.log('   📋 Miscellaneous transactions:');
          miscellaneousTxns.forEach((txn, index) => {
            const hasSuggestion = txn.categorySuggestion && 
                                txn.categorySuggestion.suggestedCategory && 
                                txn.categorySuggestion.suggestedCategory.name;
            
            console.log(`     ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount}:`, 
              hasSuggestion ? 
                `✅ ${txn.categorySuggestion.suggestedCategory.name} (${txn.categorySuggestion.confidence}%)` : 
                `❌ No suggestion`);
            
            if (!hasSuggestion) {
              totalMissingSuggestions++;
            }
          });
        }
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Merchants that should show suggestions: ${merchantsNeedingSuggestions}`);
    console.log(`   Missing suggestions: ${totalMissingSuggestions}`);
    
    if (totalMissingSuggestions > 0) {
      console.log(`\n🔧 ACTION NEEDED: Regenerate suggestions to fix ${totalMissingSuggestions} missing suggestions!`);
    } else {
      console.log(`\n✅ All suggestions are properly configured!`);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

findMerchantsNeedingSuggestions();
