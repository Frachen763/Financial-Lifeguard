import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { analyzeMerchantTransactions } from '../utils/categorizer.js';

dotenv.config();

const testAutoCategorizeRule = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    
    console.log('🧪 Testing Auto-Categorize Rule (Rule 2)...');
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId }, { isDefault: true }],
    });
    
    // Find merchants that should trigger auto-categorization
    const marchFirst = new Date('2026-03-01');
    const today = new Date();
    
    const allTransactions = await Transaction.find({ 
      userId,
      transactionDate: {
        $gte: marchFirst,
        $lte: today
      }
    }).populate('category', 'name');
    
    // Group by merchant
    const merchantGroups = {};
    allTransactions.forEach(txn => {
      const merchant = txn.merchant || 'Unknown';
      if (!merchantGroups[merchant]) {
        merchantGroups[merchant] = [];
      }
      merchantGroups[merchant].push(txn);
    });
    
    console.log(`🏪 Analyzing ${Object.keys(merchantGroups).length} merchants for auto-categorization...`);
    
    let merchantsWithAutoCategorize = 0;
    
    for (const [merchant, merchantTxns] of Object.entries(merchantGroups)) {
      if (merchantTxns.length >= 5) {
        console.log(`\n🔍 Checking: ${merchant} (${merchantTxns.length} transactions)`);
        
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
        
        // Check if should auto-categorize (5+ transactions, 100% in same category, not Miscellaneous)
        const sortedCategories = Object.entries(categoryCounts)
          .sort(([,a], [,b]) => b - a);
        
        const [topCategory, topCount] = sortedCategories[0];
        const totalCount = merchantTxns.length;
        
        if (totalCount >= 5 && topCount === totalCount && topCategory !== 'Miscellaneous') {
          merchantsWithAutoCategorize++;
          console.log(`🚀 SHOULD AUTO-CATEGORIZE: ${topCategory} appears ${topCount}/${totalCount} times (100% consistency)`);
          
          // Test the analysis function
          const analysis = await analyzeMerchantTransactions(
            merchant, 
            userId, 
            categories, 
            null,
            marchFirst.toISOString().split('T')[0],
            today.toISOString().split('T')[0]
          );
          
          console.log('📊 Analysis result:', {
            hasSuggestion: analysis.hasSuggestion,
            totalTransactions: analysis.totalTransactions,
            confidence: analysis.confidence,
            suggestedCategory: analysis.suggestedCategory?.name,
            autoCategorize: analysis.autoCategorize,
            message: analysis.message
          });
          
          if (analysis.autoCategorize) {
            console.log('✅ Rule 2 is working correctly - will auto-categorize next transaction!');
          } else {
            console.log('❌ Rule 2 not triggered - check logic');
          }
        } else {
          console.log(`❌ Not eligible for auto-categorization (need 5+ transactions with 100% consistency)`);
        }
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Merchants eligible for auto-categorization: ${merchantsWithAutoCategorize}`);
    
    if (merchantsWithAutoCategorize > 0) {
      console.log(`\n🎯 Next transaction to these merchants will be AUTO-CATEGORIZED!`);
    } else {
      console.log(`\n📝 No merchants currently meet the 5+ transaction 100% consistency rule.`);
      console.log(`   Try creating a merchant with 5+ transactions all in the same category to test this feature.`);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

testAutoCategorizeRule();
