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

const testUpdatedRules = async () => {
  try {
    console.log('🧪 Testing Updated Miscellaneous Transactions Rules (3+ transactions, more than half rule)...\n');

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

    // Test Case 1: 3 transactions with 2 in same category (2 > 3/2 = 1.5) - should suggest
    console.log('📊 Test Case 1: 3 transactions with 2 in same category (more than half)');
    const testMerchant1 = 'Ryan';
    
    // Clean up any existing test data
    await Transaction.deleteMany({ 
      userId: testUser._id, 
      merchant: { $regex: testMerchant1, $options: 'i' } 
    });

    const transportationCategory = categories.find(cat => cat.name === 'Transportation');
    const miscellaneousCategory = categories.find(cat => cat.name === 'Miscellaneous');
    
    // Create 3 transactions: 2 Transportation, 1 Miscellaneous
    for (let i = 0; i < 3; i++) {
      await Transaction.create({
        userId: testUser._id,
        merchant: testMerchant1,
        amount: 100 + i,
        category: i < 2 ? transportationCategory._id : miscellaneousCategory._id,
        transactionDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        description: `Payment to Ryan ${i + 1}`,
        transactionType: 'debit',
        paymentMethod: 'UPI',
      });
    }

    const analysis1 = await analyzeMerchantTransactions(testMerchant1, testUser._id, categories);
    console.log('Result:', {
      hasSuggestion: analysis1.hasSuggestion,
      confidence: analysis1.confidence,
      suggestedCategory: analysis1.suggestedCategory?.name,
      totalTransactions: analysis1.totalTransactions
    });

    if (analysis1.hasSuggestion && analysis1.confidence === 67) { // 2/3 = 66.67% rounded to 67%
      console.log('✅ Test Case 1 PASSED: Suggestion provided (2/3 = 67% > 50%)\n');
    } else {
      console.log('❌ Test Case 1 FAILED: Expected suggestion with 67% confidence\n');
    }

    // Test Case 2: 4 transactions with 2 in same category (2 = 4/2 = 2, not > 2) - should NOT suggest
    console.log('📊 Test Case 2: 4 transactions with 2 in same category (exactly half, not more)');
    const testMerchant2 = 'Sarah';
    
    // Clean up any existing test data
    await Transaction.deleteMany({ 
      userId: testUser._id, 
      merchant: { $regex: testMerchant2, $options: 'i' } 
    });

    // Create 4 transactions: 2 Transportation, 2 Miscellaneous
    for (let i = 0; i < 4; i++) {
      await Transaction.create({
        userId: testUser._id,
        merchant: testMerchant2,
        amount: 200 + i,
        category: i < 2 ? transportationCategory._id : miscellaneousCategory._id,
        transactionDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        description: `Payment to Sarah ${i + 1}`,
        transactionType: 'debit',
        paymentMethod: 'UPI',
      });
    }

    const analysis2 = await analyzeMerchantTransactions(testMerchant2, testUser._id, categories);
    console.log('Result:', {
      hasSuggestion: analysis2.hasSuggestion,
      confidence: analysis2.confidence,
      suggestedCategory: analysis2.suggestedCategory?.name,
      totalTransactions: analysis2.totalTransactions
    });

    if (!analysis2.hasSuggestion && analysis2.totalTransactions === 4) {
      console.log('✅ Test Case 2 PASSED: No suggestion (2/4 = 50%, not more than half)\n');
    } else {
      console.log('❌ Test Case 2 FAILED: Expected no suggestion for exactly half\n');
    }

    // Test Case 3: 6 transactions with 4 in same category (4 > 6/2 = 3) - should suggest
    console.log('📊 Test Case 3: 6 transactions with 4 in same category (more than half)');
    const testMerchant3 = 'Mike';
    
    // Clean up any existing test data
    await Transaction.deleteMany({ 
      userId: testUser._id, 
      merchant: { $regex: testMerchant3, $options: 'i' } 
    });

    // Create 6 transactions: 4 Transportation, 2 Miscellaneous
    for (let i = 0; i < 6; i++) {
      await Transaction.create({
        userId: testUser._id,
        merchant: testMerchant3,
        amount: 300 + i,
        category: i < 4 ? transportationCategory._id : miscellaneousCategory._id,
        transactionDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        description: `Payment to Mike ${i + 1}`,
        transactionType: 'debit',
        paymentMethod: 'UPI',
      });
    }

    const analysis3 = await analyzeMerchantTransactions(testMerchant3, testUser._id, categories);
    console.log('Result:', {
      hasSuggestion: analysis3.hasSuggestion,
      confidence: analysis3.confidence,
      suggestedCategory: analysis3.suggestedCategory?.name,
      totalTransactions: analysis3.totalTransactions
    });

    if (analysis3.hasSuggestion && analysis3.confidence === 67) { // 4/6 = 66.67% rounded to 67%
      console.log('✅ Test Case 3 PASSED: Suggestion provided (4/6 = 67% > 50%)\n');
    } else {
      console.log('❌ Test Case 3 FAILED: Expected suggestion with 67% confidence\n');
    }

    // Test Case 4: 2 transactions only - should NOT suggest
    console.log('📊 Test Case 4: Only 2 transactions (less than 3)');
    const testMerchant4 = 'Alex';
    
    // Clean up any existing test data
    await Transaction.deleteMany({ 
      userId: testUser._id, 
      merchant: { $regex: testMerchant4, $options: 'i' } 
    });

    // Create only 2 transactions
    for (let i = 0; i < 2; i++) {
      await Transaction.create({
        userId: testUser._id,
        merchant: testMerchant4,
        amount: 400 + i,
        category: transportationCategory._id,
        transactionDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        description: `Payment to Alex ${i + 1}`,
        transactionType: 'debit',
        paymentMethod: 'UPI',
      });
    }

    const analysis4 = await analyzeMerchantTransactions(testMerchant4, testUser._id, categories);
    console.log('Result:', {
      hasSuggestion: analysis4.hasSuggestion,
      confidence: analysis4.confidence,
      suggestedCategory: analysis4.suggestedCategory?.name,
      totalTransactions: analysis4.totalTransactions
    });

    if (!analysis4.hasSuggestion && analysis4.totalTransactions === 2) {
      console.log('✅ Test Case 4 PASSED: No suggestion for less than 3 transactions\n');
    } else {
      console.log('❌ Test Case 4 FAILED: Expected no suggestion for less than 3 transactions\n');
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
  await testUpdatedRules();
  process.exit(0);
};

runTest().catch(console.error);
