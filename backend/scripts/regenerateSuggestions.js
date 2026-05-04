import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { analyzeMerchantTransactions } from '../utils/categorizer.js';

dotenv.config();

const regenerateSuggestions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId }, { isDefault: true }],
    });
    
    console.log('📂 Found categories:', categories.length);
    
    // Get all transactions within date range (March 1 to today)
    const marchFirst = new Date('2026-03-01');
    const today = new Date();
    
    const transactions = await Transaction.find({
      userId,
      transactionDate: {
        $gte: marchFirst,
        $lte: today
      }
    }).populate('category', 'name');
    
    console.log('📊 Analyzing', transactions.length, 'transactions for suggestions...');
    
    let suggestionsAdded = 0;
    
    // Group transactions by merchant
    const merchantGroups = {};
    transactions.forEach(txn => {
      const merchant = txn.merchant || 'Unknown';
      if (!merchantGroups[merchant]) {
        merchantGroups[merchant] = [];
      }
      merchantGroups[merchant].push(txn);
    });
    
    // Analyze each merchant
    for (const [merchant, merchantTxns] of Object.entries(merchantGroups)) {
      console.log(`\n🔍 Analyzing merchant: ${merchant} (${merchantTxns.length} transactions)`);
      
      // Find miscellaneous transactions for this merchant
      const miscellaneousTxns = merchantTxns.filter(txn => txn.category?.name === 'Miscellaneous');
      
      if (miscellaneousTxns.length > 0) {
        console.log(`   Found ${miscellaneousTxns.length} miscellaneous transactions`);
        
        // Analyze merchant for suggestions with date range
        const analysis = await analyzeMerchantTransactions(merchant, userId, categories, null, marchFirst.toISOString().split('T')[0], today.toISOString().split('T')[0]);
        
        console.log(`   Analysis result:`, {
          hasSuggestion: analysis.hasSuggestion,
          totalTransactions: analysis.totalTransactions,
          confidence: analysis.confidence,
          suggestedCategory: analysis.suggestedCategory?.name
        });
        
        if (analysis.hasSuggestion && analysis.totalTransactions >= 3) {
          // Add suggestions to all miscellaneous transactions for this merchant
          for (const miscTxn of miscellaneousTxns) {
            await Transaction.findByIdAndUpdate(miscTxn._id, {
              categorySuggestion: {
                suggestedCategory: analysis.suggestedCategory,
                confidence: analysis.confidence,
                autoCategorize: analysis.autoCategorize,
                totalTransactions: analysis.totalTransactions,
                message: analysis.message
              }
            });
            console.log(`   ✅ Added suggestion to transaction: ${miscTxn.transactionDate.toISOString().split('T')[0]}`);
            suggestionsAdded++;
          }
        } else {
          console.log(`   ❌ No suggestion added (total: ${analysis.totalTransactions}, hasSuggestion: ${analysis.hasSuggestion})`);
        }
      }
    }
    
    console.log(`\n✅ Regeneration complete! Added ${suggestionsAdded} suggestions.`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

regenerateSuggestions();
