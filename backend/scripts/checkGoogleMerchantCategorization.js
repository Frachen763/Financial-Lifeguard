import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { categorizeTransaction, analyzeMerchantTransactions } from '../utils/categorizer.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkGoogleMerchantCategorization = async () => {
  try {
    console.log('🔍 Checking Google India Digital Services Pvt Ltd categorization...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });
    
    const merchantName = 'Google India Digital Services Pvt Ltd';
    console.log(`\n📊 Analyzing merchant: ${merchantName}`);
    
    // 1. Check current basic categorization
    const basicCategory = categorizeTransaction(merchantName, categories);
    console.log(`1️⃣ Basic categorization: ${basicCategory.name} (${basicCategory.icon})`);
    
    // 2. Check transaction history for this merchant
    const merchantTransactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') },
    }).populate('category', 'name');
    
    console.log(`\n2️⃣ Transaction history: ${merchantTransactions.length} transactions`);
    
    const categoryCounts = {};
    merchantTransactions.forEach(txn => {
      const catName = txn.category?.name || 'No Category';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });
    
    console.log('Category breakdown:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count}`);
    });
    
    // 3. Analyze for auto-categorization
    console.log('\n3️⃣ Analyzing for auto-categorization...');
    const analysis = await analyzeMerchantTransactions(merchantName, user._id, categories);
    
    console.log('Analysis result:');
    console.log(`  - Has suggestion: ${analysis.hasSuggestion}`);
    console.log(`  - Total transactions: ${analysis.totalTransactions}`);
    console.log(`  - Confidence: ${analysis.confidence}%`);
    console.log(`  - Auto-categorize: ${analysis.autoCategorize}`);
    console.log(`  - Suggested category: ${analysis.suggestedCategory?.name || 'None'}`);
    if (analysis.message) {
      console.log(`  - Message: ${analysis.message}`);
    }
    
    // 4. Simulate a new transaction
    console.log('\n4️⃣ Simulating new transaction...');
    
    // Create a test transaction
    const testTxn = await Transaction.create({
      emailId: 'test-google-' + Date.now(),
      amount: 999,
      merchant: merchantName,
      description: 'Test transaction',
      transactionDate: new Date(),
      transactionType: 'debit',
      paymentMethod: 'UPI',
      userId: user._id,
      category: basicCategory._id,
    });
    
    // Analyze the new transaction
    const newAnalysis = await analyzeMerchantTransactions(merchantName, user._id, categories, testTxn._id);
    
    console.log('New transaction analysis:');
    console.log(`  - Has suggestion: ${newAnalysis.hasSuggestion}`);
    console.log(`  - Total transactions: ${newAnalysis.totalTransactions}`);
    console.log(`  - Confidence: ${newAnalysis.confidence}%`);
    console.log(`  - Auto-categorize: ${newAnalysis.autoCategorize}`);
    console.log(`  - Suggested category: ${newAnalysis.suggestedCategory?.name || 'None'}`);
    
    // Apply auto-categorization if applicable
    if (newAnalysis.autoCategorize && newAnalysis.suggestedCategory) {
      await Transaction.findByIdAndUpdate(testTxn._id, {
        category: newAnalysis.suggestedCategory._id,
        categorySuggestion: {
          suggestedCategory: newAnalysis.suggestedCategory,
          confidence: newAnalysis.confidence,
          autoCategorize: newAnalysis.autoCategorize,
          totalTransactions: newAnalysis.totalTransactions,
          message: newAnalysis.message
        }
      });
      
      const updatedTxn = await Transaction.findById(testTxn._id).populate('category', 'name');
      console.log(`\n✅ AUTO-CATEGORIZED new transaction as: ${updatedTxn.category.name}`);
    }
    
    // Clean up
    await Transaction.findByIdAndDelete(testTxn._id);
    console.log('\n🧹 Cleaned up test transaction');
    
    // 5. Check if we should add "google" keyword to Bills & Utilities
    console.log('\n5️⃣ Checking keyword rules...');
    const billsCategory = categories.find(cat => cat.name === 'Bills & Utilities');
    if (billsCategory) {
      const hasGoogleKeyword = billsCategory.keywords.some(k => k.toLowerCase().includes('google'));
      console.log(`Bills & Utilities keywords: ${billsCategory.keywords.join(', ')}`);
      console.log(`Has "google" keyword: ${hasGoogleKeyword}`);
      
      if (!hasGoogleKeyword && analysis.suggestedCategory?.name === 'Bills & Utilities') {
        console.log('\n💡 Recommendation: Add "google" keyword to Bills & Utilities category');
        console.log('This will ensure future Google transactions are auto-categorized as Bills & Utilities');
      }
    }
    
    console.log('\n✅ Analysis completed!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkGoogleMerchantCategorization();
