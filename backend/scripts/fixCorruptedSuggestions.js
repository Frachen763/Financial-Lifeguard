import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const fixCorruptedSuggestions = async (merchantName) => {
  try {
    console.log(`🔧 Fixing corrupted suggestions for merchant: "${merchantName}"`);
    
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
    
    console.log(`📊 Found ${transactions.length} transactions to fix`);
    
    // Import categorizer
    const { analyzeMerchantTransactions } = await import('../utils/categorizer.js');
    
    // Generate fresh suggestions for all transactions
    const analysis = await analyzeMerchantTransactions(merchantName, user._id, categories);
    
    console.log('\n📊 Analysis Results:');
    console.log(`   Has suggestion: ${analysis.hasSuggestion}`);
    console.log(`   Confidence: ${analysis.confidence}%`);
    console.log(`   Suggested category: ${analysis.suggestedCategory?.name || 'None'}`);
    console.log(`   Auto-categorize: ${analysis.autoCategorize}`);
    console.log(`   Total transactions: ${analysis.totalTransactions}`);
    
    if (analysis.hasSuggestion) {
      console.log(`\n🔄 Updating all transactions with proper suggestions...`);
      
      let fixedCount = 0;
      for (const txn of transactions) {
        // Only update transactions that are Miscellaneous (to show in frontend)
        if (txn.category?.name === 'Miscellaneous') {
          await Transaction.findByIdAndUpdate(txn._id, {
            categorySuggestion: {
              suggestedCategory: analysis.suggestedCategory,
              confidence: analysis.confidence,
              autoCategorize: analysis.autoCategorize,
              totalTransactions: analysis.totalTransactions,
              message: analysis.message || `Suggested based on ${analysis.totalTransactions} previous transactions`
            }
          });
          
          console.log(`   ✓ Fixed: ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount}`);
          fixedCount++;
        } else {
          // Clear suggestions for non-Miscellaneous transactions (they won't show anyway)
          await Transaction.findByIdAndUpdate(txn._id, {
            categorySuggestion: null
          });
          console.log(`   Cleared: ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} (${txn.category?.name})`);
        }
      }
      
      console.log(`\n✅ Fixed ${fixedCount} Miscellaneous transactions with proper suggestions`);
      console.log(`💡 These suggestions will now appear in the frontend!`);
      
      // Verify the fix
      console.log('\n🔍 Verification:');
      const fixedTransactions = await Transaction.find({
        userId: user._id,
        merchant: { $regex: new RegExp(merchantName, 'i') },
        'category.name': 'Miscellaneous'
      }).populate('category', 'name')
       .populate('categorySuggestion.suggestedCategory', 'name icon');
      
      console.log(`   Miscellaneous transactions with suggestions: ${fixedTransactions.length}`);
      
      fixedTransactions.forEach((txn, index) => {
        const wouldShow = txn.categorySuggestion && 
                         txn.categorySuggestion.totalTransactions >= 3;
        console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} - Will show: ${wouldShow ? 'Yes' : 'No'}`);
      });
      
    } else {
      console.log('\n⚠️ No strong pattern found to generate suggestions');
    }
    
  } catch (error) {
    console.error('❌ Error fixing corrupted suggestions:', error);
  } finally {
    process.exit(0);
  }
};

// Get merchant name from command line argument
const merchantName = process.argv[2];
if (!merchantName) {
  console.log('❌ Please provide a merchant name as argument');
  console.log('Usage: node fixCorruptedSuggestions.js "Merchant Name"');
  process.exit(1);
}

fixCorruptedSuggestions(merchantName);
