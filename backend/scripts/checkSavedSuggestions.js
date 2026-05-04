import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';

dotenv.config();

const checkSavedSuggestions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    const merchantName = 'Google India Digital Services Pvt Ltd';
    
    // Get transactions with suggestions for this merchant
    const transactionsWithSuggestions = await Transaction.find({ 
      userId,
      merchant: { $regex: merchantName, $options: 'i' },
      categorySuggestion: { $exists: true, $ne: null }
    });
    
    console.log('🔍 Transactions with suggestions:', transactionsWithSuggestions.length);
    
    transactionsWithSuggestions.forEach((txn, index) => {
      console.log(`\n${index + 1}. Transaction ID: ${txn._id}`);
      console.log(`   Date: ${txn.transactionDate.toISOString().split('T')[0]}`);
      console.log(`   Merchant: ${txn.merchant}`);
      console.log(`   Category: ${txn.category?.name || 'Uncategorized'}`);
      console.log(`   CategorySuggestion:`, JSON.stringify(txn.categorySuggestion, null, 2));
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

checkSavedSuggestions();
