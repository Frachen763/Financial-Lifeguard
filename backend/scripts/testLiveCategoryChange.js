import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { analyzeMerchantTransactions } from '../utils/categorizer.js';

dotenv.config();

const testLiveCategoryChange = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    const merchantName = 'Sachin Chandra Hazarika';
    
    console.log('🧪 Testing live category change for:', merchantName);
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId }, { isDefault: true }],
    });
    
    const shoppingCategory = categories.find(cat => cat.name === 'Shopping');
    const groceriesCategory = categories.find(cat => cat.name === 'Groceries');
    const miscellaneousCategory = categories.find(cat => cat.name === 'Miscellaneous');
    
    console.log('📋 Categories found:');
    console.log(`   Shopping: ${shoppingCategory?._id}`);
    console.log(`   Groceries: ${groceriesCategory?._id}`);
    console.log(`   Miscellaneous: ${miscellaneousCategory?._id}`);
    
    // Get current transactions
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
    
    console.log('\n📊 Current transactions:');
    merchantTransactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ${txn.category?.name || 'Uncategorized'} - ₹${txn.amount}`);
    });
    
    // Count by category
    const categoryCounts = {};
    merchantTransactions.forEach(txn => {
      const categoryName = txn.category?.name || 'Miscellaneous';
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    });
    
    console.log('\n📊 Current category breakdown:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const percentage = Math.round((count / merchantTransactions.length) * 100);
      console.log(`   ${category}: ${count} transactions (${percentage}%)`);
    });
    
    // Simulate changing one transaction from Groceries to Shopping
    console.log('\n🔄 Simulating category change...');
    
    // Find a Groceries transaction to change to Shopping
    const groceriesTxn = merchantTransactions.find(txn => txn.category?.name === 'Groceries');
    if (groceriesTxn) {
      console.log(`📝 Changing transaction ${groceriesTxn.transactionDate.toISOString().split('T')[0]} from Groceries to Shopping...`);
      
      // Update the transaction
      await Transaction.findByIdAndUpdate(groceriesTxn._id, {
        category: shoppingCategory._id
      });
      
      console.log('✅ Transaction updated!');
      
      // Now recalculate suggestions
      console.log('\n🔍 Recalculating suggestions...');
      
      const analysis = await analyzeMerchantTransactions(
        merchantName, 
        userId, 
        categories, 
        null,
        marchFirst.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
      
      console.log('📊 New analysis result:', {
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
          category: miscellaneousCategory._id
        }).populate('category', 'name');
        
        console.log(`🎯 Found ${miscellaneousTransactions.length} miscellaneous transactions to update`);
        
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
          console.log(`✅ Updated suggestion for transaction: ${miscTxn.transactionDate.toISOString().split('T')[0]}`);
        }
      }
      
      // Check final state
      console.log('\n🔍 Checking final state...');
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
          `Suggested ${txn.categorySuggestion.suggestedCategory?.name} (${txn.categorySuggestion.confidence}%)` : 
          'No suggestion';
        console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ${txn.category?.name || 'Uncategorized'} - ₹${txn.amount} - ${suggestion}`);
      });
      
    } else {
      console.log('❌ No Groceries transaction found to change');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

testLiveCategoryChange();
