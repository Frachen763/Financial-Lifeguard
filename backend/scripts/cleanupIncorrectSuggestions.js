import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { analyzeMerchantTransactions } from '../utils/categorizer.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const cleanupIncorrectSuggestions = async () => {
  try {
    console.log('🧹 Cleaning up incorrect category suggestions...\n');

    // Get all users
    const users = await User.find();
    
    for (const user of users) {
      console.log(`👤 Processing user: ${user.email}`);
      
      // Get categories
      const categories = await Category.find({
        $or: [{ userId: user._id }, { isDefault: true }],
      });

      // Find all transactions with category suggestions
      const transactionsWithSuggestions = await Transaction.find({
        userId: user._id,
        categorySuggestion: { $exists: true, $ne: null }
      }).populate('category', 'name');

      console.log(`📊 Found ${transactionsWithSuggestions.length} transactions with suggestions`);

      let cleanedCount = 0;
      let verifiedCount = 0;

      for (const txn of transactionsWithSuggestions) {
        // Re-analyze this merchant to verify if suggestion should exist
        const analysis = await analyzeMerchantTransactions(txn.merchant, user._id, categories, txn._id);
        
        if (!analysis.hasSuggestion || analysis.totalTransactions < 5) {
          // Remove incorrect suggestion
          await Transaction.findByIdAndUpdate(txn._id, {
            categorySuggestion: null
          });
          console.log(`🗑️  Removed incorrect suggestion for ${txn.merchant} (had ${analysis.totalTransactions} transactions)`);
          cleanedCount++;
        } else {
          console.log(`✅ Verified suggestion for ${txn.merchant} (${analysis.totalTransactions} transactions)`);
          verifiedCount++;
        }
      }

      console.log(`\n📈 Results for ${user.email}:`);
      console.log(`   - Cleaned: ${cleanedCount} incorrect suggestions`);
      console.log(`   - Verified: ${verifiedCount} correct suggestions`);
      console.log('');
    }

    console.log('✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the cleanup
const runCleanup = async () => {
  await connectDB();
  await cleanupIncorrectSuggestions();
  process.exit(0);
};

runCleanup().catch(console.error);
