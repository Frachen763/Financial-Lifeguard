import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const simulateManualChange = async (merchantName) => {
  try {
    console.log(`🔄 Simulating manual category change for: "${merchantName}"`);
    
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
    
    const entertainmentCategory = categories.find(cat => cat.name === 'Entertainment');
    const miscellaneousCategory = categories.find(cat => cat.name === 'Miscellaneous');
    
    if (!entertainmentCategory || !miscellaneousCategory) {
      console.log('❌ Required categories not found!');
      return;
    }
    
    // Find a Miscellaneous transaction to "manually change"
    const miscellaneousTransaction = await Transaction.findOne({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') },
      category: miscellaneousCategory._id
    }).populate('category', 'name');
    
    if (!miscellaneousTransaction) {
      console.log('❌ No Miscellaneous transactions found to simulate manual change');
      return;
    }
    
    console.log(`\n📝 Simulating manual change:`);
    console.log(`   Transaction: ${miscellaneousTransaction.transactionDate.toISOString().split('T')[0]} - ₹${miscellaneousTransaction.amount}`);
    console.log(`   Current category: ${miscellaneousTransaction.category.name}`);
    console.log(`   Changing to: Entertainment`);
    
    // Step 1: Manually change the category
    await Transaction.findByIdAndUpdate(miscellaneousTransaction._id, {
      category: entertainmentCategory._id,
      categorySuggestion: null // Clear any existing suggestions
    });
    
    console.log(`✅ Manual change completed`);
    
    // Step 2: Apply merchant-wide rules (simulating what the frontend would do)
    console.log('\n🔄 Applying merchant-wide categorization rules...');
    
    const { analyzeMerchantTransactions } = await import('../utils/categorizer.js');
    const analysis = await analyzeMerchantTransactions(merchantName, user._id, categories);
    
    console.log('\n📊 Analysis Results:');
    console.log(`   Has suggestion: ${analysis.hasSuggestion}`);
    console.log(`   Confidence: ${analysis.confidence}%`);
    console.log(`   Suggested category: ${analysis.suggestedCategory?.name || 'None'}`);
    console.log(`   Auto-categorize: ${analysis.autoCategorize}`);
    console.log(`   Total transactions: ${analysis.totalTransactions}`);
    
    if (analysis.hasSuggestion) {
      let updatedCount = 0;
      let autoCategorizedCount = 0;
      let suggestionsAddedCount = 0;
      
      // Get all transactions for this merchant
      const allTransactions = await Transaction.find({
        userId: user._id,
        merchant: { $regex: new RegExp(merchantName, 'i') }
      }).populate('category', 'name');
      
      // Apply rules
      for (const transaction of allTransactions) {
        const updateData = {};
        let shouldUpdate = false;
        
        // Rule 2: Auto-categorize if 100% consistency and 5+ transactions
        if (analysis.autoCategorize && analysis.totalTransactions >= 5) {
          if (transaction.category?.name !== analysis.suggestedCategory.name) {
            updateData.category = analysis.suggestedCategory._id;
            updateData.categorySuggestion = null;
            shouldUpdate = true;
            autoCategorizedCount++;
          }
        }
        // Rule 1: Add suggestions for Miscellaneous transactions
        else if (transaction.category?.name === 'Miscellaneous' && 
                 analysis.totalTransactions >= 3) {
          updateData.categorySuggestion = {
            suggestedCategory: analysis.suggestedCategory,
            confidence: analysis.confidence,
            autoCategorize: analysis.autoCategorize,
            totalTransactions: analysis.totalTransactions,
            message: analysis.message || `Suggested based on ${analysis.totalTransactions} previous transactions`
          };
          shouldUpdate = true;
          suggestionsAddedCount++;
        }
        
        if (shouldUpdate) {
          await Transaction.findByIdAndUpdate(transaction._id, updateData);
          updatedCount++;
        }
      }
      
      console.log(`\n✅ Rules applied successfully:`);
      console.log(`   Auto-categorized: ${autoCategorizedCount} transactions`);
      console.log(`   Suggestions added: ${suggestionsAddedCount} transactions`);
      console.log(`   Total updated: ${updatedCount} transactions`);
      
      // Show current breakdown
      const finalTransactions = await Transaction.find({
        userId: user._id,
        merchant: { $regex: new RegExp(merchantName, 'i') }
      }).populate('category', 'name');
      
      const categoryCounts = {};
      finalTransactions.forEach(txn => {
        const categoryName = txn.category?.name || 'No Category';
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      });
      
      console.log('\n📈 Final Category Breakdown:');
      Object.entries(categoryCounts).forEach(([category, count]) => {
        const percentage = Math.round((count / finalTransactions.length) * 100);
        console.log(`   ${category}: ${count} transactions (${percentage}%)`);
      });
      
      // Check if Rule 2 would now apply
      const topCategory = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)[0];
      const [categoryName, count] = topCategory;
      
      if (count === finalTransactions.length && count >= 5 && categoryName !== 'Miscellaneous') {
        console.log(`\n🚀 RULE 2 NOW ACTIVE! Next transaction will be AUTO-CATEGORIZED as ${categoryName}`);
      } else if (count > finalTransactions.length / 2 && count >= 3 && categoryName !== 'Miscellaneous') {
        console.log(`\n✅ Rule 1 active: Next transaction will be SUGGESTED as ${categoryName}`);
      }
      
    } else {
      console.log('\n⚠️ No rules apply to this merchant');
    }
    
  } catch (error) {
    console.error('❌ Error simulating manual change:', error);
  } finally {
    process.exit(0);
  }
};

// Get merchant name from command line argument
const merchantName = process.argv[2];
if (!merchantName) {
  console.log('❌ Please provide a merchant name as argument');
  console.log('Usage: node simulateManualChange.js "Merchant Name"');
  process.exit(1);
}

simulateManualChange(merchantName);
