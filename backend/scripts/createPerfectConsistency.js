import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const createPerfectConsistency = async () => {
  try {
    console.log(`🧪 Creating a merchant with perfect consistency for Rule 2 test`);
    
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
    
    const transportationCategory = categories.find(cat => cat.name === 'Transportation');
    
    if (!transportationCategory) {
      console.log('❌ Transportation category not found!');
      return;
    }
    
    // Find a merchant with exactly 5 transactions
    const merchants = await Transaction.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: '$merchant', count: { $sum: 1 } } },
      { $match: { count: 5 } },
      { $limit: 5 }
    ]);
    
    if (merchants.length === 0) {
      console.log('❌ No merchants with exactly 5 transactions found');
      return;
    }
    
    const testMerchant = merchants[0]._id;
    console.log(`📊 Using merchant: "${testMerchant}" with exactly 5 transactions`);
    
    // Make all 5 transactions Transportation
    const transactions = await Transaction.find({
      userId: user._id,
      merchant: testMerchant
    });
    
    console.log(`🔄 Making all ${transactions.length} transactions Transportation...`);
    
    for (const txn of transactions) {
      await Transaction.findByIdAndUpdate(txn._id, {
        category: transportationCategory._id
      });
      console.log(`   ✓ ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} → Transportation`);
    }
    
    // Test the categorization logic
    console.log('\n🧪 Testing Rule 2 with perfect consistency...');
    
    const { analyzeMerchantTransactions } = await import('../utils/categorizer.js');
    
    const analysis = await analyzeMerchantTransactions(testMerchant, user._id, categories);
    
    console.log('\n📊 Analysis Results:');
    console.log(`   Has suggestion: ${analysis.hasSuggestion}`);
    console.log(`   Confidence: ${analysis.confidence}%`);
    console.log(`   Suggested category: ${analysis.suggestedCategory?.name || 'None'}`);
    console.log(`   Auto-categorize: ${analysis.autoCategorize}`);
    console.log(`   Total transactions: ${analysis.totalTransactions}`);
    console.log(`   Message: ${analysis.message || 'No message'}`);
    
    if (analysis.autoCategorize) {
      console.log('\n🚀 RULE 2 ACTIVATED! Next transaction will be AUTO-CATEGORIZED');
      console.log(`   Merchant: ${testMerchant}`);
      console.log(`   Category: ${analysis.suggestedCategory.name}`);
      console.log(`   Reason: ${analysis.totalTransactions} transactions at 100% consistency`);
    } else {
      console.log('\n⚠️ Rule 2 not activated');
    }
    
    // Show breakdown
    if (analysis.categoryBreakdown) {
      console.log('\n📈 Category Breakdown:');
      analysis.categoryBreakdown.forEach(({ category, count }) => {
        console.log(`   ${category}: ${count} transactions`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating perfect consistency:', error);
  } finally {
    process.exit(0);
  }
};

createPerfectConsistency();
