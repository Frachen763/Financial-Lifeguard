import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';

dotenv.config();

const clearAllSuggestions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    
    // Remove ALL category suggestions for this user
    const result = await Transaction.updateMany(
      { userId },
      { $unset: { categorySuggestion: 1 } }
    );
    
    console.log('✅ Cleared all category suggestions:');
    console.log('   Total transactions updated:', result.modifiedCount);
    
    // Verify they're gone
    const remaining = await Transaction.countDocuments({
      userId,
      categorySuggestion: { $exists: true }
    });
    
    console.log('   Remaining suggestions:', remaining);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

clearAllSuggestions();
