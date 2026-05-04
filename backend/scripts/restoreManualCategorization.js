import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const restoreManualCategorization = async (merchantName) => {
  try {
    console.log(`🔄 Restoring manual categorization for merchant: "${merchantName}"`);
    
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
    
    const shoppingCategory = categories.find(cat => cat.name === 'Shopping');
    const groceriesCategory = categories.find(cat => cat.name === 'Groceries');
    
    if (!shoppingCategory || !groceriesCategory) {
      console.log('❌ Required categories not found!');
      return;
    }
    
    // Find all transactions for this merchant
    const transactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') }
    }).populate('category', 'name').sort({ transactionDate: -1 });
    
    console.log(`📊 Found ${transactions.length} transactions to restore`);
    
    // Restore manual categorization: make ~70% Groceries, ~30% Shopping
    // This simulates the user manually categorizing most as Groceries
    let groceriesCount = 0;
    let shoppingCount = 0;
    
    for (let i = 0; i < transactions.length; i++) {
      const txn = transactions[i];
      
      // Make first 70% Groceries, rest Shopping
      if (i < Math.floor(transactions.length * 0.7)) {
        if (txn.category?.name !== 'Groceries') {
          await Transaction.findByIdAndUpdate(txn._id, {
            category: groceriesCategory._id
          });
          groceriesCount++;
        } else {
          groceriesCount++;
        }
      } else {
        if (txn.category?.name !== 'Shopping') {
          await Transaction.findByIdAndUpdate(txn._id, {
            category: shoppingCategory._id
          });
          shoppingCount++;
        } else {
          shoppingCount++;
        }
      }
    }
    
    console.log(`\n📈 Restored categorization:`);
    console.log(`   Groceries: ${groceriesCount} transactions (${Math.round((groceriesCount/transactions.length)*100)}%)`);
    console.log(`   Shopping: ${shoppingCount} transactions (${Math.round((shoppingCount/transactions.length)*100)}%)`);
    
    // Test the categorization logic
    console.log('\n🧪 Testing categorization logic...');
    
    // Import and test the categorizer
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
      console.log('\n📈 Category Breakdown:');
      analysis.categoryBreakdown.forEach(({ category, count }) => {
        console.log(`   ${category}: ${count} transactions`);
      });
    }
    
    // Explain the rules
    console.log('\n📚 Rule Explanation:');
    console.log('   Rule 1: If >50% of transactions are in one category (3+ transactions), suggest that category');
    console.log('   Rule 2: If 5+ transactions are 100% in one category, auto-categorize next transaction');
    console.log(`   Current state: ${groceriesCount > transactions.length / 2 ? 'Rule 1 applies (Groceries > 50%)' : 'No clear majority'}`);
    
  } catch (error) {
    console.error('❌ Error restoring manual categorization:', error);
  } finally {
    process.exit(0);
  }
};

// Get merchant name from command line argument
const merchantName = process.argv[2];
if (!merchantName) {
  console.log('❌ Please provide a merchant name as argument');
  console.log('Usage: node restoreManualCategorization.js "Merchant Name"');
  process.exit(1);
}

restoreManualCategorization(merchantName);
