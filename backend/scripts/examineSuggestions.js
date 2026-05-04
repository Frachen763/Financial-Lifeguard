import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';

dotenv.config();

const examineSuggestions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    
    // Get a few transactions with suggestions to examine their structure
    const transactionsWithSuggestions = await Transaction.find({
      userId,
      categorySuggestion: { $exists: true, $ne: null }
    }).limit(5);
    
    console.log('🔍 Examining suggestion structure:');
    
    transactionsWithSuggestions.forEach((txn, index) => {
      console.log(`\nTransaction ${index + 1}:`);
      console.log('  ID:', txn._id);
      console.log('  Merchant:', txn.merchant);
      console.log('  Category:', txn.category?.name || 'Uncategorized');
      console.log('  CategorySuggestion:', JSON.stringify(txn.categorySuggestion, null, 2));
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

examineSuggestions();
