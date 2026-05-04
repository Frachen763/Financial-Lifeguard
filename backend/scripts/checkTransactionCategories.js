import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkTransactionCategories = async () => {
  try {
    console.log('🔍 Checking transaction categories...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User borgohain9435@gmail.com not found');
      return;
    }
    
    // Get recent transactions with categories
    const recentTxns = await Transaction.find({ userId: user._id })
      .sort({ transactionDate: -1 })
      .limit(20)
      .populate('category', 'name icon color')
      .populate('categorySuggestion.suggestedCategory', 'name icon color');
    
    console.log(`\n📊 Found ${recentTxns.length} recent transactions:`);
    
    let uncategorizedCount = 0;
    let withSuggestionsCount = 0;
    
    recentTxns.forEach((txn, index) => {
      const categoryName = txn.category ? txn.category.name : 'No Category';
      const hasSuggestion = txn.categorySuggestion ? ' 💡' : '';
      
      if (!txn.category || txn.category.name === 'Select Category') {
        uncategorizedCount++;
      }
      
      if (txn.categorySuggestion) {
        withSuggestionsCount++;
      }
      
      console.log(`  ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} to ${txn.merchant}`);
      console.log(`      Category: ${categoryName}${hasSuggestion}`);
      
      if (txn.categorySuggestion) {
        console.log(`      Suggestion: ${txn.categorySuggestion.suggestedCategory.name} (${txn.categorySuggestion.confidence}% confidence)`);
        console.log(`      Auto-categorize: ${txn.categorySuggestion.autoCategorize ? 'Yes' : 'No'}`);
      }
      console.log('');
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`  Uncategorized: ${uncategorizedCount}`);
    console.log(`  With suggestions: ${withSuggestionsCount}`);
    
    // Check if there are transactions with "Select Category" or null category
    const uncategorizedTxns = await Transaction.find({ 
      userId: user._id,
      $or: [
        { category: null },
        { category: { $exists: false } }
      ]
    });
    
    if (uncategorizedTxns.length > 0) {
      console.log(`\n⚠️ Found ${uncategorizedTxns.length} uncategorized transactions. Running categorization...`);
      
      // Get categories
      const categories = await Category.find({
        $or: [{ userId: user._id }, { isDefault: true }],
      });
      
      // Import categorizer functions
      const { categorizeTransaction, analyzeMerchantTransactions } = await import('../utils/categorizer.js');
      
      for (const txn of uncategorizedTxns) {
        // Basic categorization
        const category = categorizeTransaction(txn.merchant, categories);
        
        // Update transaction
        await Transaction.findByIdAndUpdate(txn._id, {
          category: category._id
        });
        
        console.log(`✅ Categorized: ₹${txn.amount} to ${txn.merchant} -> ${category.name}`);
        
        // If it's Miscellaneous, check for suggestions
        if (category.name === 'Miscellaneous') {
          const analysis = await analyzeMerchantTransactions(txn.merchant, user._id, categories, txn._id);
          
          if (analysis.hasSuggestion && analysis.totalTransactions >= 3) {
            if (analysis.autoCategorize) {
              await Transaction.findByIdAndUpdate(txn._id, {
                category: analysis.suggestedCategory._id,
                categorySuggestion: {
                  suggestedCategory: analysis.suggestedCategory,
                  confidence: analysis.confidence,
                  autoCategorize: analysis.autoCategorize,
                  totalTransactions: analysis.totalTransactions,
                  message: analysis.message
                }
              });
              console.log(`  🚀 Auto-categorized as: ${analysis.suggestedCategory.name}`);
            } else {
              await Transaction.findByIdAndUpdate(txn._id, {
                categorySuggestion: {
                  suggestedCategory: analysis.suggestedCategory,
                  confidence: analysis.confidence,
                  autoCategorize: analysis.autoCategorize,
                  totalTransactions: analysis.totalTransactions,
                  message: analysis.message
                }
              });
              console.log(`  💡 Added suggestion: ${analysis.suggestedCategory.name}`);
            }
          }
        }
      }
    }
    
    console.log('\n✅ Category check completed');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkTransactionCategories();
