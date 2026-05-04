import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { analyzeMerchantTransactions } from '../utils/categorizer.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkAutoCategorizationRule = async () => {
  try {
    console.log('🔍 Checking auto-categorization rule for Google India Digital Services...');
    
    // Connect to database
    await connectDB();
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });
    
    const merchantName = 'Google India Digital Services Pvt Ltd';
    
    // Get ALL transactions for this merchant (including manual ones)
    console.log('\n📊 Getting all transactions for this merchant...');
    const allTransactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') },
    }).populate('category', 'name').sort({ transactionDate: -1 });
    
    console.log(`Total transactions found: ${allTransactions.length}`);
    
    // Show each transaction with details
    console.log('\n📋 Transaction details:');
    allTransactions.forEach((txn, index) => {
      console.log(`  ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount}`);
      console.log(`      Category: ${txn.category?.name || 'No Category'}`);
      console.log(`      isManual: ${txn.isManual || false}`);
      console.log(`      Email ID: ${txn.emailId || 'Manual entry'}`);
      console.log('');
    });
    
    // Count by category (excluding manual transactions from pattern analysis)
    const categoryCounts = {};
    const nonManualTxns = allTransactions.filter(txn => !txn.isManual);
    
    console.log(`\n📈 Analysis (excluding ${allTransactions.length - nonManualTxns.length} manual transactions):`);
    
    nonManualTxns.forEach(txn => {
      const catName = txn.category?.name || 'No Category';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });
    
    console.log('Category counts (non-manual):');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count}`);
    });
    
    // Check if Rule 2 should apply
    const totalNonManual = nonManualTxns.length;
    const topCategory = Object.entries(categoryCounts).sort(([,a], [,b]) => b - a)[0];
    
    console.log(`\n🔍 Rule 2 Check:`);
    console.log(`  Total non-manual transactions: ${totalNonManual}`);
    console.log(`  Top category: ${topCategory[0]} with ${topCategory[1]} transactions`);
    console.log(`  All in same category: ${topCategory[1] === totalNonManual}`);
    console.log(`  Has 5+ transactions: ${totalNonManual >= 5}`);
    console.log(`  Not Miscellaneous: ${topCategory[0] !== 'Miscellaneous'}`);
    
    if (totalNonManual >= 5 && topCategory[1] === totalNonManual && topCategory[0] !== 'Miscellaneous') {
      console.log(`\n✅ RULE 2 MET! Should auto-categorize future transactions as ${topCategory[0]}`);
    } else {
      console.log(`\n❌ Rule 2 not met. Future transactions will not be auto-categorized.`);
    }
    
    // Run the actual analysis function
    console.log('\n🔬 Running analyzeMerchantTransactions function...');
    const analysis = await analyzeMerchantTransactions(merchantName, user._id, categories);
    
    console.log('Analysis result:');
    console.log(`  - Has suggestion: ${analysis.hasSuggestion}`);
    console.log(`  - Total transactions: ${analysis.totalTransactions}`);
    console.log(`  - Confidence: ${analysis.confidence}%`);
    console.log(`  - Auto-categorize: ${analysis.autoCategorize}`);
    console.log(`  - Suggested category: ${analysis.suggestedCategory?.name || 'None'}`);
    
    if (analysis.categoryBreakdown) {
      console.log('\nCategory breakdown from analysis:');
      analysis.categoryBreakdown.forEach(({ category, count }) => {
        console.log(`  - ${category}: ${count}`);
      });
    }
    
    // Check if there are any manual categorizations that might be affecting the pattern
    const manualTxns = allTransactions.filter(txn => txn.isManual);
    if (manualTxns.length > 0) {
      console.log(`\n⚠️ Found ${manualTxns.length} manual transactions:`);
      manualTxns.forEach(txn => {
        console.log(`  - ${txn.transactionDate.toISOString().split('T')[0]}: ₹${txn.amount} -> ${txn.category?.name}`);
      });
    }
    
    console.log('\n✅ Analysis completed!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkAutoCategorizationRule();
