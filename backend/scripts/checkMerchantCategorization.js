import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const checkMerchantCategorization = async (merchantName) => {
  try {
    console.log(`🔍 Checking categorization for merchant: "${merchantName}"`);
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Find all transactions for this merchant with categories populated
    const transactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') }
    }).populate('category', 'name icon color').sort({ transactionDate: -1 });
    
    console.log(`\n📊 Found ${transactions.length} transactions for "${merchantName}":`);
    
    if (transactions.length === 0) {
      console.log('   No transactions found for this merchant.');
      return;
    }
    
    // Group by category
    const categoryGroups = {};
    transactions.forEach(txn => {
      const categoryName = txn.category ? txn.category.name : 'No Category';
      if (!categoryGroups[categoryName]) {
        categoryGroups[categoryName] = [];
      }
      categoryGroups[categoryName].push(txn);
    });
    
    console.log('\n📈 Category Breakdown:');
    Object.entries(categoryGroups).forEach(([categoryName, txns]) => {
      console.log(`\n   ${categoryName} (${txns.length} transactions):`);
      const totalAmount = txns.reduce((sum, txn) => sum + txn.amount, 0);
      console.log(`   Total: ₹${totalAmount}`);
      
      txns.slice(0, 3).forEach((txn, index) => {
        console.log(`     ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount}`);
      });
      
      if (txns.length > 3) {
        console.log(`     ... and ${txns.length - 3} more`);
      }
    });
    
    // Check if there are uncategorized transactions
    const uncategorizedCount = categoryGroups['No Category']?.length || 0;
    if (uncategorizedCount > 0) {
      console.log(`\n⚠️ Found ${uncategorizedCount} uncategorized transactions!`);
      
      // Show details of uncategorized transactions
      console.log('\n🔍 Uncategorized transactions:');
      categoryGroups['No Category'].forEach((txn, index) => {
        console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount}`);
        console.log(`      Email ID: ${txn.emailId}`);
        console.log(`      Created: ${txn.createdAt}`);
      });
    }
    
    // Check categorization rules
    console.log('\n🔍 Checking categorization rules...');
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });
    
    const shoppingCategory = categories.find(cat => cat.name === 'Shopping');
    if (shoppingCategory) {
      console.log(`✅ Shopping category found with keywords: ${shoppingCategory.keywords?.join(', ') || 'No keywords'}`);
      
      // Check if "store" keyword exists
      const hasStoreKeyword = shoppingCategory.keywords?.some(keyword => 
        merchantName.toLowerCase().includes(keyword.toLowerCase())
      );
      
      console.log(`📝 "${merchantName}" contains "store": ${hasStoreKeyword}`);
      
      if (!hasStoreKeyword) {
        console.log('⚠️ The "store" keyword might be missing from Shopping category keywords');
      }
    } else {
      console.log('❌ Shopping category not found!');
    }
    
    // Suggest fix
    if (Object.keys(categoryGroups).length > 1) {
      console.log('\n💡 Suggestion: All Hira Store transactions should be categorized as "Shopping"');
      console.log('   Consider running the categorization script to fix inconsistent categories');
    }
    
  } catch (error) {
    console.error('❌ Error checking merchant categorization:', error);
  } finally {
    process.exit(0);
  }
};

// Get merchant name from command line argument
const merchantName = process.argv[2];
if (!merchantName) {
  console.log('❌ Please provide a merchant name as argument');
  console.log('Usage: node checkMerchantCategorization.js "Merchant Name"');
  process.exit(1);
}

checkMerchantCategorization(merchantName);
