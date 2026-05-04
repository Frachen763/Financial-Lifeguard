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

const testMiscellaneousRules = async () => {
  try {
    console.log('🧪 Testing Miscellaneous Transactions Rules...\n');

    // Get a test user
    const testUser = await User.findOne();
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }

    console.log(`👤 Using test user: ${testUser.email}`);

    // Get categories
    const categories = await Category.find({
      $or: [{ userId: testUser._id }, { isDefault: true }],
    });

    console.log(`📂 Found ${categories.length} categories\n`);

    // Test Case 1: 5 transactions with 3 in same category (should suggest with 60% confidence)
    console.log('📊 Test Case 1: 5 transactions with 3 in same category');
    const testMerchant1 = 'TestMerchant5Transactions';
    
    // Clean up any existing test data
    await Transaction.deleteMany({ 
      userId: testUser._id, 
      merchant: { $regex: testMerchant1, $options: 'i' } 
    });

    // Create test transactions
    const transportationCategory = categories.find(cat => cat.name === 'Transportation');
    const miscellaneousCategory = categories.find(cat => cat.name === 'Miscellaneous');
    
    for (let i = 0; i < 5; i++) {
      await Transaction.create({
        userId: testUser._id,
        merchant: testMerchant1,
        amount: 100 + i,
        category: i < 3 ? transportationCategory._id : miscellaneousCategory._id, // 3 Transportation, 2 Miscellaneous
        transactionDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Past 5 days
        description: `Test transaction ${i + 1}`,
        transactionType: 'debit',
        paymentMethod: 'UPI',
      });
    }

    const analysis1 = await analyzeMerchantTransactions(testMerchant1, testUser._id, categories);
    console.log('Result:', {
      hasSuggestion: analysis1.hasSuggestion,
      confidence: analysis1.confidence,
      suggestedCategory: analysis1.suggestedCategory?.name,
      autoCategorize: analysis1.autoCategorize,
      totalTransactions: analysis1.totalTransactions
    });

    if (analysis1.hasSuggestion && analysis1.confidence >= 60) {
      console.log('✅ Test Case 1 PASSED: Suggestion provided with 60%+ confidence\n');
    } else {
      console.log('❌ Test Case 1 FAILED: Expected suggestion with 60%+ confidence\n');
    }

    // Test Case 2: 10 transactions all in same category (should auto-categorize)
    console.log('📊 Test Case 2: 10 transactions all in same category');
    const testMerchant2 = 'TestMerchant10Transactions';
    
    // Clean up any existing test data
    await Transaction.deleteMany({ 
      userId: testUser._id, 
      merchant: { $regex: testMerchant2, $options: 'i' } 
    });

    // Create 10 transactions all in Bills & Utilities
    const billsCategory = categories.find(cat => cat.name === 'Bills & Utilities');
    
    for (let i = 0; i < 10; i++) {
      await Transaction.create({
        userId: testUser._id,
        merchant: testMerchant2,
        amount: 200 + i,
        category: billsCategory._id,
        transactionDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        description: `Bill payment ${i + 1}`,
        transactionType: 'debit',
        paymentMethod: 'UPI',
      });
    }

    // Add some manual transactions with the same category
    for (let i = 0; i < 3; i++) {
      await Transaction.create({
        userId: testUser._id,
        merchant: testMerchant2,
        amount: 300 + i,
        category: billsCategory._id,
        transactionDate: new Date(Date.now() - ((i + 10) * 24 * 60 * 60 * 1000)),
        description: `Manual bill payment ${i + 1}`,
        transactionType: 'debit',
        paymentMethod: 'UPI',
        isManual: true,
      });
    }

    const analysis2 = await analyzeMerchantTransactions(testMerchant2, testUser._id, categories);
    console.log('Result:', {
      hasSuggestion: analysis2.hasSuggestion,
      confidence: analysis2.confidence,
      suggestedCategory: analysis2.suggestedCategory?.name,
      autoCategorize: analysis2.autoCategorize,
      totalTransactions: analysis2.totalTransactions
    });

    if (analysis2.hasSuggestion && analysis2.autoCategorize && analysis2.confidence === 100) {
      console.log('✅ Test Case 2 PASSED: Auto-categorization enabled with 100% confidence\n');
    } else {
      console.log('❌ Test Case 2 FAILED: Expected auto-categorization with 100% confidence\n');
    }

    // Test Case 3: First-time merchant (no suggestion)
    console.log('📊 Test Case 3: First-time merchant');
    const testMerchant3 = 'NewMerchantFirstTime';
    
    // Clean up any existing test data
    await Transaction.deleteMany({ 
      userId: testUser._id, 
      merchant: { $regex: testMerchant3, $options: 'i' } 
    });

    const analysis3 = await analyzeMerchantTransactions(testMerchant3, testUser._id, categories);
    console.log('Result:', {
      hasSuggestion: analysis3.hasSuggestion,
      confidence: analysis3.confidence,
      suggestedCategory: analysis3.suggestedCategory?.name,
      autoCategorize: analysis3.autoCategorize,
      totalTransactions: analysis3.totalTransactions
    });

    if (!analysis3.hasSuggestion && analysis3.totalTransactions === 0) {
      console.log('✅ Test Case 3 PASSED: No suggestion for first-time merchant\n');
    } else {
      console.log('❌ Test Case 3 FAILED: Expected no suggestion for first-time merchant\n');
    }

    // Test Case 4: Merchant with 3 transactions (should suggest - 2/3 > 50%)
    console.log('📊 Test Case 4: Merchant with 3 transactions (2/3 = 67% > 50%)');
    const testMerchant4 = 'TestMerchant3Transactions';
    
    // Clean up any existing test data
    await Transaction.deleteMany({ 
      userId: testUser._id, 
      merchant: { $regex: testMerchant4, $options: 'i' } 
    });

    // Create 3 transactions: 2 Transportation, 1 Miscellaneous
    for (let i = 0; i < 3; i++) {
      await Transaction.create({
        userId: testUser._id,
        merchant: testMerchant4,
        amount: 150 + i,
        category: i < 2 ? transportationCategory._id : miscellaneousCategory._id,
        transactionDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        description: `Test transaction ${i + 1}`,
        transactionType: 'debit',
        paymentMethod: 'UPI',
      });
    }

    const analysis4 = await analyzeMerchantTransactions(testMerchant4, testUser._id, categories);
    console.log('Result:', {
      hasSuggestion: analysis4.hasSuggestion,
      confidence: analysis4.confidence,
      suggestedCategory: analysis4.suggestedCategory?.name,
      autoCategorize: analysis4.autoCategorize,
      totalTransactions: analysis4.totalTransactions
    });

    if (analysis4.hasSuggestion && analysis4.confidence === 67) {
      console.log('✅ Test Case 4 PASSED: Suggestion provided for 3 transactions with 2/3 > 50%\n');
    } else {
      console.log('❌ Test Case 4 FAILED: Expected suggestion with 67% confidence\n');
    }

    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await Transaction.deleteMany({ 
      userId: testUser._id, 
      merchant: { $in: [testMerchant1, testMerchant2, testMerchant3, testMerchant4] } 
    });

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the test
const runTest = async () => {
  await connectDB();
  await testMiscellaneousRules();
  process.exit(0);
};

runTest().catch(console.error);
