import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const testMainSyncEndpoint = async () => {
  try {
    console.log('🧪 Testing main sync endpoint categorization...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 Testing for user: ${user.email}`);
    
    // Check if user has categories
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });
    console.log(`📂 User has access to ${categories.length} categories`);
    
    // Check last sync time
    console.log(`📅 Last sync: ${user.lastEmailSync}`);
    
    // Simulate what the sync endpoint does with a new transaction
    const testTransaction = {
      emailId: 'test-123-' + Date.now(),
      amount: 150,
      merchant: 'Test Restaurant',
      description: 'Test transaction',
      transactionDate: new Date(),
      transactionType: 'debit',
      paymentMethod: 'UPI',
      emailSubject: 'Test',
      emailSnippet: 'Test'
    };
    
    // Import categorizer functions
    const { categorizeTransaction } = await import('../utils/categorizer.js');
    
    // Test categorization
    const category = categorizeTransaction(testTransaction.merchant, categories);
    console.log(`\n🧪 Test categorization:`);
    console.log(`  Merchant: ${testTransaction.merchant}`);
    console.log(`  Category: ${category.name} (${category.icon})`);
    
    // Check if category is valid (not null/undefined)
    if (!category || !category._id) {
      console.log('❌ ERROR: Category is null or invalid!');
      return;
    }
    
    // Create a test transaction to verify
    const testTxn = await Transaction.create({
      ...testTransaction,
      userId: user._id,
      category: category._id,
    });
    
    // Retrieve and verify
    const savedTxn = await Transaction.findById(testTxn._id).populate('category', 'name icon');
    console.log(`\n✅ Test transaction created:`);
    console.log(`  Amount: ₹${savedTxn.amount}`);
    console.log(`  Merchant: ${savedTxn.merchant}`);
    console.log(`  Category: ${savedTxn.category.name} ${savedTxn.category.icon}`);
    
    // Clean up test transaction
    await Transaction.findByIdAndDelete(testTxn._id);
    console.log(`\n🧹 Cleaned up test transaction`);
    
    // Check recent transactions to ensure they have categories
    const recentTxns = await Transaction.find({ userId: user._id })
      .sort({ transactionDate: -1 })
      .limit(5)
      .populate('category', 'name');
    
    console.log(`\n📊 Recent transactions check:`);
    let uncategorizedCount = 0;
    
    recentTxns.forEach((txn, index) => {
      const hasCategory = txn.category && txn.category.name;
      if (!hasCategory) uncategorizedCount++;
      
      console.log(`  ${index + 1}. ₹${txn.amount} to ${txn.merchant} -> ${hasCategory ? txn.category.name : '❌ NO CATEGORY'}`);
    });
    
    if (uncategorizedCount > 0) {
      console.log(`\n⚠️ Found ${uncategorizedCount} uncategorized transactions!`);
    } else {
      console.log(`\n✅ All recent transactions have categories!`);
    }
    
    console.log('\n✅ Main sync endpoint test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

testMainSyncEndpoint();
