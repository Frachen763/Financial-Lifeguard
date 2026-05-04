import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';

dotenv.config();

const cleanCorruptedSuggestions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    
    // Find all transactions with corrupted suggestions
    const corruptedTransactions = await Transaction.find({
      userId,
      'categorySuggestion.suggestedCategory': undefined,
      categorySuggestion: { $exists: true, $ne: null }
    });
    
    console.log('🔍 Found corrupted suggestions:', corruptedTransactions.length);
    
    if (corruptedTransactions.length > 0) {
      // Remove all corrupted suggestions
      const result = await Transaction.updateMany(
        {
          userId,
          'categorySuggestion.suggestedCategory': undefined,
          categorySuggestion: { $exists: true, $ne: null }
        },
        {
          $unset: { categorySuggestion: 1 }
        }
      );
      
      console.log('✅ Cleaned up corrupted suggestions:', result.modifiedCount, 'transactions updated');
    }
    
    // Check remaining suggestions
    const remainingSuggestions = await Transaction.find({
      userId,
      categorySuggestion: { $exists: true, $ne: null }
    }).populate('categorySuggestion.suggestedCategory', 'name');
    
    console.log('📊 Remaining valid suggestions:', remainingSuggestions.length);
    
    if (remainingSuggestions.length > 0) {
      console.log('Valid suggestions:');
      remainingSuggestions.forEach(txn => {
        console.log(`   - ${txn.merchant}: ${txn.categorySuggestion.suggestedCategory?.name} (${txn.categorySuggestion.confidence}% confidence)`);
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

cleanCorruptedSuggestions();
