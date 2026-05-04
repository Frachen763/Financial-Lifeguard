import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const verifyCategories = async () => {
  try {
    console.log('✅ Verifying transaction categories...');
    
    // Connect to database
    await connectDB();
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Get all transactions for this user
    const transactions = await Transaction.find({ userId: user._id })
      .sort({ transactionDate: -1 })
      .populate('category', 'name icon color')
      .populate('categorySuggestion.suggestedCategory', 'name icon color');
    
    console.log(`\n📊 Total transactions: ${transactions.length}`);
    
    const categoryStats = {};
    let withSuggestions = 0;
    let properlyCategorized = 0;
    
    transactions.forEach((txn) => {
      const categoryName = txn.category ? txn.category.name : 'No Category';
      categoryStats[categoryName] = (categoryStats[categoryName] || 0) + 1;
      
      if (txn.categorySuggestion) {
        withSuggestions++;
      }
      
      if (txn.category && txn.category.name !== 'Miscellaneous') {
        properlyCategorized++;
      }
    });
    
    console.log('\n📊 Category distribution:');
    Object.entries(categoryStats).forEach(([category, count]) => {
      const percentage = ((count / transactions.length) * 100).toFixed(1);
      console.log(`  ${category}: ${count} (${percentage}%)`);
    });
    
    console.log(`\n📈 Categorization stats:`);
    console.log(`  Properly categorized (not Miscellaneous): ${properlyCategorized} (${((properlyCategorized/transactions.length)*100).toFixed(1)}%)`);
    console.log(`  With suggestions: ${withSuggestions}`);
    console.log(`  Uncategorized: ${categoryStats['No Category'] || 0}`);
    
    // Show latest 10 transactions
    console.log('\n📊 Latest 10 transactions:');
    transactions.slice(0, 10).forEach((txn, index) => {
      const categoryName = txn.category ? txn.category.name : 'No Category';
      const suggestion = txn.categorySuggestion ? ` (💡 ${txn.categorySuggestion.suggestedCategory.name})` : '';
      console.log(`  ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} to ${txn.merchant}`);
      console.log(`      → ${categoryName}${suggestion}`);
    });
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    process.exit(0);
  }
};

verifyCategories();
