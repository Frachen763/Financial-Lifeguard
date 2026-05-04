import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const verifyAPIQuery = async () => {
  try {
    console.log('🔍 Verifying exact API query...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    const Category = (await import('../models/Category.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 User: ${user.email} (ID: ${user._id})`);
    
    // Simulate exact API query parameters
    const category = undefined;
    const accountNumber = undefined;
    const merchant = undefined;
    const startDate = undefined;
    const endDate = undefined;
    const minAmount = undefined;
    const maxAmount = undefined;
    const search = undefined;
    const page = 1;
    const limit = 100;
    const sortBy = 'transactionDate';
    const sortOrder = 'desc';
    
    // Build query exactly like the API does
    const query = { userId: user._id };
    
    if (category) query.category = category;
    if (accountNumber) query.accountNumber = accountNumber;
    if (merchant) query.merchant = { $regex: merchant, $options: 'i' };
    
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }
    
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }
    
    if (search) {
      query.$or = [
        { merchant: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    console.log('\n📋 Query:', JSON.stringify(query, null, 2));
    
    // Execute query exactly like the API
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    console.log('\n⚙️ Query options:');
    console.log(`   Skip: ${skip}`);
    console.log(`   Limit: ${limit}`);
    console.log(`   Sort:`, sort);
    
    const transactions = await Transaction.find(query)
      .populate('category', 'name icon color')
      .populate('categorySuggestion.suggestedCategory', 'name icon color')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Transaction.countDocuments(query);
    
    console.log(`\n📊 Results:`);
    console.log(`   Total transactions: ${total}`);
    console.log(`   Returned: ${transactions.length}`);
    
    console.log('\n📊 First 10 transactions (what API returns):');
    transactions.slice(0, 10).forEach((txn, index) => {
      console.log(`\n  ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      console.log(`     Transaction Date: ${new Date(txn.transactionDate).toLocaleString()}`);
      console.log(`     Category: ${txn.category?.name || 'No Category'} ${txn.category?.icon || ''}`);
      console.log(`     Email ID: ${txn.emailId || 'No email ID'}`);
      if (txn.categorySuggestion) {
        console.log(`     Suggestion: ${txn.categorySuggestion.suggestedCategory?.name || 'None'}`);
      }
    });
    
    // Check if the issue is with date formatting
    console.log('\n🔍 Checking date formatting...');
    
    // Check if frontend might be filtering by date
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    console.log(`   Today start: ${todayStart.toISOString()}`);
    console.log(`   Today end: ${todayEnd.toISOString()}`);
    
    const todaysTxns = transactions.filter(txn => {
      const txnDate = new Date(txn.transactionDate);
      return txnDate >= todayStart && txnDate < todayEnd;
    });
    
    console.log(`\n📅 Today's transactions in API response: ${todaysTxns.length}`);
    todaysTxns.forEach((txn, index) => {
      console.log(`   ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
    });
    
    console.log('\n💡 The issue is likely:');
    console.log('   1. Frontend caching (most likely)');
    console.log('   2. Frontend not calling the API on refresh');
    console.log('   3. Frontend using stale state from Redux/Context');
    console.log('   4. Browser returning cached API responses');
    
    console.log('\n🔧 Try these steps:');
    console.log('   1. Open browser DevTools (F12)');
    console.log('   2. Go to Network tab');
    console.log('   3. Check "Disable cache"');
    console.log('   4. Refresh the page');
    console.log('   5. Look for /api/transactions call');
    console.log('   6. Check the response of that call');
    
    console.log('\n✅ Verification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

verifyAPIQuery();
