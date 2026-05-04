import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { analyzeMerchantTransactions } from '../utils/categorizer.js';

dotenv.config();

const fixSachinSuggestions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    const merchantName = 'Sachin Chandra Hazarika';
    
    console.log('🔧 Fixing suggestions for:', merchantName);
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId }, { isDefault: true }],
    });
    
    // Set date range for analysis
    const marchFirst = new Date('2026-03-01');
    const today = new Date();
    
    // Analyze merchant for current suggestions
    const analysis = await analyzeMerchantTransactions(
      merchantName, 
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
      suggestedCategory: analysis.suggestedCategory?.name
    });
    
    if (analysis.hasSuggestion && analysis.totalTransactions >= 3) {
      // Find miscellaneous transactions
      const miscellaneousTransactions = await Transaction.find({
        userId,
        merchant: { $regex: merchantName, $options: 'i' },
        transactionDate: {
          $gte: marchFirst,
          $lte: today
        },
        category: '690a1e00fde4d7593e4550be'  // Miscellaneous category ID
      }).populate('category', 'name');
      
      console.log(`🎯 Found ${miscellaneousTransactions.length} miscellaneous transactions to update`);
      
      // Clear existing suggestions first
      await Transaction.updateMany(
        {
          userId,
          merchant: { $regex: merchantName, $options: 'i' },
          transactionDate: {
            $gte: marchFirst,
            $lte: today
          }
        },
        { $unset: { categorySuggestion: 1 } }
      );
      console.log('🗑️ Cleared existing suggestions');
      
      // Update suggestions for all miscellaneous transactions
      for (const miscTxn of miscellaneousTransactions) {
        await Transaction.findByIdAndUpdate(miscTxn._id, {
          categorySuggestion: {
            suggestedCategory: analysis.suggestedCategory,
            confidence: analysis.confidence,
            autoCategorize: analysis.autoCategorize,
            totalTransactions: analysis.totalTransactions,
            message: analysis.message
          }
        });
        console.log(`✅ Updated suggestion for transaction: ${miscTxn.transactionDate.toISOString().split('T')[0]} - ${analysis.suggestedCategory?.name} (${analysis.confidence}%)`);
      }
      
      console.log('\n🔍 Verifying updated suggestions...');
      
      // Check final state
      const updatedTransactions = await Transaction.find({ 
        userId,
        merchant: { $regex: merchantName, $options: 'i' },
        transactionDate: {
          $gte: marchFirst,
          $lte: today
        }
      }).populate('category', 'name');
      
      console.log('\n📊 Final transactions:');
      updatedTransactions.forEach((txn, index) => {
        const suggestion = txn.categorySuggestion ? 
          `✅ ${txn.categorySuggestion.suggestedCategory?.name} (${txn.categorySuggestion.confidence}%)` : 
          '❌ No suggestion';
        console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ${txn.category?.name || 'Uncategorized'} - ₹${txn.amount} - ${suggestion}`);
      });
      
    } else {
      console.log('❌ No suggestions needed');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

fixSachinSuggestions();
