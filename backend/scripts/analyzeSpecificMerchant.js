import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const analyzeSpecificMerchant = async (merchantName) => {
  try {
    console.log(`🔍 Deep analysis for merchant: "${merchantName}"`);
    
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
    
    // Find all transactions for this merchant
    const transactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') }
    }).populate('category', 'name').sort({ transactionDate: -1 });
    
    console.log(`\n📊 Found ${transactions.length} transactions for "${merchantName}":`);
    
    transactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} (${txn.category?.name || 'No Category'})`);
    });
    
    // Calculate category breakdown
    const categoryCounts = {};
    let totalAmount = 0;
    
    transactions.forEach(txn => {
      const categoryName = txn.category?.name || 'No Category';
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      totalAmount += txn.amount;
    });
    
    console.log(`\n💰 Total amount: ₹${totalAmount}`);
    console.log('\n📈 Category Breakdown:');
    
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const percentage = Math.round((count / transactions.length) * 100);
      const categoryTotal = transactions
        .filter(txn => txn.category?.name === category)
        .reduce((sum, txn) => sum + txn.amount, 0);
      console.log(`   ${category}: ${count} transactions (${percentage}%) - ₹${categoryTotal}`);
    });
    
    // Test categorization logic
    console.log('\n🧪 Testing categorization logic...');
    
    const { analyzeMerchantTransactions } = await import('../utils/categorizer.js');
    
    const analysis = await analyzeMerchantTransactions(merchantName, user._id, categories);
    
    console.log('\n📊 Analysis Results:');
    console.log(`   Has suggestion: ${analysis.hasSuggestion}`);
    console.log(`   Confidence: ${analysis.confidence}%`);
    console.log(`   Suggested category: ${analysis.suggestedCategory?.name || 'None'}`);
    console.log(`   Auto-categorize: ${analysis.autoCategorize}`);
    console.log(`   Total transactions: ${analysis.totalTransactions}`);
    console.log(`   Message: ${analysis.message || 'No message'}`);
    
    if (analysis.categoryBreakdown) {
      console.log('\n📋 System Analysis Breakdown:');
      analysis.categoryBreakdown.forEach(({ category, count }) => {
        const percentage = Math.round((count / analysis.totalTransactions) * 100);
        console.log(`   ${category}: ${count} transactions (${percentage}%)`);
      });
    }
    
    // Explain why rules do/don't apply
    console.log('\n📚 Rule Analysis:');
    const topCategory = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)[0];
    const [categoryName, count] = topCategory;
    const percentage = Math.round((count / transactions.length) * 100);
    
    console.log(`   Top category: ${categoryName} (${count}/${transactions.length} = ${percentage}%)`);
    
    if (transactions.length >= 5 && count === transactions.length && categoryName !== 'Miscellaneous') {
      console.log(`   🚀 Rule 2 APPLIES: 5+ transactions with 100% consistency in "${categoryName}"`);
      console.log(`   ✅ Next transaction will be AUTO-CATEGORIZED as ${categoryName}`);
    } else if (transactions.length >= 3 && count > transactions.length / 2 && categoryName !== 'Miscellaneous') {
      console.log(`   ✅ Rule 1 APPLIES: 3+ transactions with >50% in "${categoryName}"`);
      console.log(`   💡 Next transaction will be SUGGESTED as ${categoryName}`);
    } else {
      console.log(`   ⚠️ No rule applies:`);
      if (categoryName === 'Miscellaneous') {
        console.log(`      - Top category is Miscellaneous (rules exclude Miscellaneous)`);
      }
      if (transactions.length < 3) {
        console.log(`      - Not enough transactions (need 3+ for Rule 1)`);
      }
      if (count <= transactions.length / 2) {
        console.log(`      - No majority (>50% needed for Rule 1)`);
      }
      if (count < transactions.length) {
        console.log(`      - Not 100% consistent (needed for Rule 2)`);
      }
    }
    
    // Check if this merchant should be categorized differently based on keywords
    console.log('\n🔍 Keyword Analysis:');
    const entertainmentCategory = categories.find(cat => cat.name === 'Entertainment');
    const foodCategory = categories.find(cat => cat.name === 'Food & Dining');
    
    if (entertainmentCategory) {
      console.log(`   Entertainment keywords: ${entertainmentCategory.keywords?.join(', ') || 'No keywords'}`);
    }
    if (foodCategory) {
      console.log(`   Food & Dining keywords: ${foodCategory.keywords?.join(', ') || 'No keywords'}`);
    }
    
  } catch (error) {
    console.error('❌ Error analyzing merchant:', error);
  } finally {
    process.exit(0);
  }
};

// Get merchant name from command line argument
const merchantName = process.argv[2];
if (!merchantName) {
  console.log('❌ Please provide a merchant name as argument');
  console.log('Usage: node analyzeSpecificMerchant.js "Merchant Name"');
  process.exit(1);
}

analyzeSpecificMerchant(merchantName);
