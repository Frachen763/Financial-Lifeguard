import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const testRule2 = async (merchantName) => {
  try {
    console.log(`🧪 Testing Rule 2 (100% consistency) for merchant: "${merchantName}"`);
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });
    
    const groceriesCategory = categories.find(cat => cat.name === 'Groceries');
    
    if (!groceriesCategory) {
      console.log('❌ Groceries category not found!');
      return;
    }
    
    // Find last 5 transactions and make them all Groceries
    const transactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') }
    }).sort({ transactionDate: -1 }).limit(5);
    
    console.log(`📊 Making last 5 transactions all Groceries to test Rule 2...`);
    
    for (const txn of transactions) {
      await Transaction.findByIdAndUpdate(txn._id, {
        category: groceriesCategory._id
      });
      console.log(`   ✓ ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} → Groceries`);
    }
    
    // Test the categorization logic
    console.log('\n🧪 Testing categorization logic with 100% consistency...');
    
    const { analyzeMerchantTransactions } = await import('../utils/categorizer.js');
    
    const analysis = await analyzeMerchantTransactions(merchantName, user._id, categories);
    
    console.log('\n📊 Analysis Results:');
    console.log(`   Has suggestion: ${analysis.hasSuggestion}`);
    console.log(`   Confidence: ${analysis.confidence}%`);
    console.log(`   Suggested category: ${analysis.suggestedCategory?.name || 'None'}`);
    console.log(`   Auto-categorize: ${analysis.autoCategorize}`);
    console.log(`   Total transactions: ${analysis.totalTransactions}`);
    console.log(`   Message: ${analysis.message || 'No message'}`);
    
    if (analysis.autoCategorize) {
      console.log('\n🚀 RULE 2 ACTIVATED! Next transaction will be AUTO-CATEGORIZED as Groceries');
    } else {
      console.log('\n⚠️ Rule 2 not activated - conditions not met');
    }
    
    // Show current breakdown
    const allTransactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') }
    }).populate('category', 'name');
    
    const categoryCounts = {};
    allTransactions.forEach(txn => {
      const categoryName = txn.category?.name || 'No Category';
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    });
    
    console.log('\n📈 Current Category Breakdown:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const percentage = Math.round((count / allTransactions.length) * 100);
      console.log(`   ${category}: ${count} transactions (${percentage}%)`);
    });
    
  } catch (error) {
    console.error('❌ Error testing Rule 2:', error);
  } finally {
    process.exit(0);
  }
};

// Get merchant name from command line argument
const merchantName = process.argv[2];
if (!merchantName) {
  console.log('❌ Please provide a merchant name as argument');
  console.log('Usage: node testRule2.js "Merchant Name"');
  process.exit(1);
}

testRule2(merchantName);
