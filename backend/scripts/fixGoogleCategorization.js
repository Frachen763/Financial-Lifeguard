import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { analyzeMerchantTransactions } from '../utils/categorizer.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const fixGoogleCategorization = async () => {
  try {
    console.log('🔧 Fixing Google India Digital Services categorization...');
    
    // Connect to database
    await connectDB();
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Get Bills & Utilities category
    const billsCategory = await Category.findOne({ name: 'Bills & Utilities' });
    
    const merchantName = 'Google India Digital Services Pvt Ltd';
    
    // Find the Miscellaneous transaction
    console.log('\n🔍 Finding the Miscellaneous transaction...');
    const allGoogleTxns = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') },
    }).populate('category', 'name');
    
    const miscTxn = allGoogleTxns.find(txn => txn.category?.name === 'Miscellaneous');
    
    if (miscTxn) {
      console.log(`Found Miscellaneous transaction:`);
      console.log(`  Date: ${miscTxn.transactionDate.toISOString().split('T')[0]}`);
      console.log(`  Amount: ₹${miscTxn.amount}`);
      console.log(`  Current Category: ${miscTxn.category?.name}`);
      
      // Update it to Bills & Utilities
      await Transaction.findByIdAndUpdate(miscTxn._id, {
        category: billsCategory._id
      });
      
      console.log(`\n✅ Updated to Bills & Utilities`);
    } else {
      console.log('No Miscellaneous transaction found for this merchant');
    }
    
    // Now check if Rule 2 is met
    console.log('\n🔍 Re-checking Rule 2 after fix...');
    
    const allTransactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') },
    }).populate('category', 'name');
    
    const categoryCounts = {};
    allTransactions.forEach(txn => {
      const catName = txn.category?.name || 'No Category';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });
    
    console.log('Updated category counts:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count}`);
    });
    
    const totalTxns = allTransactions.length;
    const topCategory = Object.entries(categoryCounts).sort(([,a], [,b]) => b - a)[0];
    
    console.log(`\n🔍 Rule 2 Check (after fix):`);
    console.log(`  Total transactions: ${totalTxns}`);
    console.log(`  Top category: ${topCategory[0]} with ${topCategory[1]} transactions`);
    console.log(`  All in same category: ${topCategory[1] === totalTxns}`);
    console.log(`  Has 5+ transactions: ${totalTxns >= 5}`);
    console.log(`  Not Miscellaneous: ${topCategory[0] !== 'Miscellaneous'}`);
    
    // Run analysis again
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });
    
    const analysis = await analyzeMerchantTransactions(merchantName, user._id, categories);
    
    console.log('\n📊 New analysis result:');
    console.log(`  - Has suggestion: ${analysis.hasSuggestion}`);
    console.log(`  - Total transactions: ${analysis.totalTransactions}`);
    console.log(`  - Confidence: ${analysis.confidence}%`);
    console.log(`  - Auto-categorize: ${analysis.autoCategorize}`);
    console.log(`  - Suggested category: ${analysis.suggestedCategory?.name || 'None'}`);
    
    if (analysis.autoCategorize) {
      console.log(`\n✅ SUCCESS! Rule 2 is now met. Future transactions will be AUTO-CATEGORIZED as ${analysis.suggestedCategory.name}`);
      
      // Simulate a new transaction to test
      console.log('\n🧪 Testing with a new transaction...');
      
      const testTxn = await Transaction.create({
        emailId: 'test-google-rule2-' + Date.now(),
        amount: 500,
        merchant: merchantName,
        description: 'Test transaction',
        transactionDate: new Date(),
        transactionType: 'debit',
        paymentMethod: 'UPI',
        userId: user._id,
        category: (await import('../utils/categorizer.js')).categorizeTransaction(merchantName, categories)._id,
      });
      
      // Analyze with the new transaction
      const newAnalysis = await analyzeMerchantTransactions(merchantName, user._id, categories, testTxn._id);
      
      console.log('New transaction will be auto-categorized:');
      console.log(`  - Auto-categorize: ${newAnalysis.autoCategorize}`);
      console.log(`  - Category: ${newAnalysis.suggestedCategory?.name}`);
      
      // Apply auto-categorization
      if (newAnalysis.autoCategorize) {
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
        console.log(`\n✅ New transaction AUTO-CATEGORIZED as: ${updatedTxn.category.name}`);
      }
      
      // Clean up test transaction
      await Transaction.findByIdAndDelete(testTxn._id);
      console.log('\n🧹 Cleaned up test transaction');
    }
    
    console.log('\n✅ Fix completed!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

fixGoogleCategorization();
