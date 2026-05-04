import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const fixMerchantCategorization = async (merchantName) => {
  try {
    console.log(`🔧 Fixing categorization for merchant: "${merchantName}"`);
    
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
    if (!shoppingCategory) {
      console.log('❌ Shopping category not found!');
      return;
    }
    
    console.log(`🎯 Found Shopping category: ${shoppingCategory.name}`);
    
    // Find all transactions for this merchant
    const transactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') }
    }).populate('category', 'name');
    
    console.log(`📊 Found ${transactions.length} transactions to check`);
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    
    for (const txn of transactions) {
      const currentCategory = txn.category?.name || 'No Category';
      
      if (currentCategory !== 'Shopping') {
        // Fix this transaction
        await Transaction.findByIdAndUpdate(txn._id, {
          category: shoppingCategory._id
        });
        
        console.log(`✅ Fixed: ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} (${currentCategory} → Shopping)`);
        fixedCount++;
      } else {
        console.log(`✓ Already correct: ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} (Shopping)`);
        alreadyCorrectCount++;
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   Fixed: ${fixedCount} transactions`);
    console.log(`   Already correct: ${alreadyCorrectCount} transactions`);
    console.log(`   Total: ${transactions.length} transactions`);
    
    // Verify the fix
    console.log('\n🔍 Verification:');
    const updatedTransactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') }
    }).populate('category', 'name');
    
    const shoppingCount = updatedTransactions.filter(txn => txn.category?.name === 'Shopping').length;
    console.log(`   Shopping category: ${shoppingCount}/${updatedTransactions.length} transactions`);
    
    if (shoppingCount === updatedTransactions.length) {
      console.log('✅ All transactions are now correctly categorized as Shopping!');
    } else {
      console.log('⚠️ Some transactions are still not categorized as Shopping');
    }
    
  } catch (error) {
    console.error('❌ Error fixing merchant categorization:', error);
  } finally {
    process.exit(0);
  }
};

// Get merchant name from command line argument
const merchantName = process.argv[2];
if (!merchantName) {
  console.log('❌ Please provide a merchant name as argument');
  console.log('Usage: node fixMerchantCategorization.js "Merchant Name"');
  process.exit(1);
}

fixMerchantCategorization(merchantName);
