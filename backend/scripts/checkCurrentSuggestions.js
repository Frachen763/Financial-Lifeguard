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

const checkCurrentSuggestions = async () => {
  try {
    console.log('🔍 Checking current category suggestions...\n');

    // Get a test user (you can change this to your user email)
    const testUser = await User.findOne({ email: 'frachenborgohain@gmail.com' });
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }

    console.log(`👤 Checking user: ${testUser.email}`);

    // Get categories
    const categories = await Category.find({
      $or: [{ userId: testUser._id }, { isDefault: true }],
    });

    // Find all transactions with category suggestions
    const transactionsWithSuggestions = await Transaction.find({
      userId: testUser._id,
      categorySuggestion: { $exists: true, $ne: null }
    }).populate('category', 'name')
      .populate('categorySuggestion.suggestedCategory', 'name');

    console.log(`\n📊 Found ${transactionsWithSuggestions.length} transactions with suggestions:\n`);

    for (const txn of transactionsWithSuggestions) {
      console.log(`💳 Merchant: ${txn.merchant}`);
      console.log(`📂 Current Category: ${txn.category?.name}`);
      console.log(`💡 Suggested: ${txn.categorySuggestion.suggestedCategory?.name}`);
      console.log(`📈 Confidence: ${txn.categorySuggestion.confidence}%`);
      console.log(`🔢 Total Transactions: ${txn.categorySuggestion.totalTransactions}`);
      
      // Verify if this suggestion should exist
      const analysis = await analyzeMerchantTransactions(txn.merchant, testUser._id, categories, txn._id);
      console.log(`✅ Should have suggestion: ${analysis.hasSuggestion}`);
      console.log(`📊 Actual transaction count: ${analysis.totalTransactions}`);
      
      if (!analysis.hasSuggestion || analysis.totalTransactions < 5) {
        console.log(`🚨 ISSUE: This suggestion should NOT exist!`);
      } else {
        console.log(`✅ OK: This suggestion is valid`);
      }
      
      console.log('---');
    }

    // Also check some miscellaneous transactions without suggestions
    const miscellaneousWithoutSuggestions = await Transaction.find({
      userId: testUser._id,
      'category.name': 'Miscellaneous',
      categorySuggestion: { $exists: false }
    }).populate('category', 'name')
      .limit(5);

    console.log(`\n📝 Sample miscellaneous transactions without suggestions:\n`);

    for (const txn of miscellaneousWithoutSuggestions) {
      console.log(`💳 Merchant: ${txn.merchant}`);
      console.log(`📂 Category: ${txn.category?.name}`);
      
      // Check if they should have suggestions
      const analysis = await analyzeMerchantTransactions(txn.merchant, testUser._id, categories, txn._id);
      console.log(`📊 Transaction count: ${analysis.totalTransactions}`);
      console.log(`💡 Should have suggestion: ${analysis.hasSuggestion}`);
      
      if (analysis.hasSuggestion && analysis.totalTransactions >= 5) {
        console.log(`🚨 ISSUE: This transaction SHOULD have a suggestion!`);
      } else {
        console.log(`✅ OK: No suggestion needed`);
      }
      
      console.log('---');
    }

  } catch (error) {
    console.error('❌ Check error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the check
const runCheck = async () => {
  await connectDB();
  await checkCurrentSuggestions();
  process.exit(0);
};

runCheck().catch(console.error);
