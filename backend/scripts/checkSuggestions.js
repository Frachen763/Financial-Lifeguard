import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const checkSuggestions = async (merchantName) => {
  try {
    console.log(`🔍 Checking suggestions for merchant: "${merchantName}"`);
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Find all transactions for this merchant with suggestions populated
    const transactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') }
    }).populate('category', 'name')
     .populate('categorySuggestion.suggestedCategory', 'name icon')
     .sort({ transactionDate: -1 });
    
    console.log(`\n📊 Found ${transactions.length} transactions for "${merchantName}":`);
    
    transactions.forEach((txn, index) => {
      console.log(`\n   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount}`);
      console.log(`      Category: ${txn.category?.name || 'No Category'}`);
      console.log(`      Has Suggestion: ${txn.categorySuggestion ? 'Yes' : 'No'}`);
      
      if (txn.categorySuggestion) {
        console.log(`      Suggested: ${txn.categorySuggestion.suggestedCategory?.name || 'None'}`);
        console.log(`      Confidence: ${txn.categorySuggestion.confidence}%`);
        console.log(`      Auto-categorize: ${txn.categorySuggestion.autoCategorize}`);
        console.log(`      Total Transactions: ${txn.categorySuggestion.totalTransactions}`);
        console.log(`      Message: ${txn.categorySuggestion.message || 'No message'}`);
        
        // Check if it would show in frontend
        const wouldShow = txn.category?.name === 'Miscellaneous' && 
                         txn.categorySuggestion.totalTransactions >= 3;
        console.log(`      Would show in frontend: ${wouldShow ? 'Yes' : 'No'}`);
        
        if (!wouldShow) {
          console.log(`      Reason: ${txn.category?.name !== 'Miscellaneous' ? 'Not Miscellaneous' : 'Less than 3 transactions'}`);
        }
      }
    });
    
    // Check which transactions should have suggestions but don't
    console.log('\n🔍 Checking for missing suggestions...');
    
    const { analyzeMerchantTransactions } = await import('../utils/categorizer.js');
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });
    
    for (const txn of transactions) {
      if (!txn.categorySuggestion && txn.category?.name === 'Miscellaneous') {
        console.log(`\n⚠️ Transaction missing suggestion:`);
        console.log(`   ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} (${txn.category?.name})`);
        
        // Generate suggestion
        const analysis = await analyzeMerchantTransactions(txn.merchant, user._id, categories);
        if (analysis.hasSuggestion) {
          console.log(`   Should suggest: ${analysis.suggestedCategory?.name} (${analysis.confidence}% confidence)`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking suggestions:', error);
  } finally {
    process.exit(0);
  }
};

// Get merchant name from command line argument
const merchantName = process.argv[2];
if (!merchantName) {
  console.log('❌ Please provide a merchant name as argument');
  console.log('Usage: node checkSuggestions.js "Merchant Name"');
  process.exit(1);
}

checkSuggestions(merchantName);
