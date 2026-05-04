import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const verifyDashboardData = async () => {
  try {
    console.log('🔍 Verifying Monthly Dashboard Data...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Get current month date range (same as dashboard)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfDay = new Date(endOfMonth.getFullYear(), endOfMonth.getMonth(), endOfMonth.getDate(), 23, 59, 59, 999);
    
    console.log(`\n📅 Current Month: ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`);
    console.log(`   Start: ${startOfMonth.toISOString().split('T')[0]}`);
    console.log(`   End: ${endOfMonth.toISOString().split('T')[0]}`);
    
    // Match query (same as backend)
    const matchQuery = { 
      userId: user._id,
      transactionDate: { 
        $gte: startOfMonth, 
        $lte: endOfDay 
      }
    };
    
    console.log('\n🔍 Query Parameters:');
    console.log(JSON.stringify(matchQuery, null, 2));
    
    // Get all transactions for current month
    const allTransactions = await Transaction.find(matchQuery)
      .populate('category', 'name icon color')
      .sort({ transactionDate: -1 });
    
    console.log(`\n📊 Found ${allTransactions.length} total transactions this month`);
    
    if (allTransactions.length === 0) {
      console.log('⚠️ No transactions found for current month');
      return;
    }
    
    // Separate by transaction type
    const expenses = allTransactions.filter(txn => 
      ['debit', 'upi', 'card', 'bank_transfer'].includes(txn.transactionType)
    );
    const credits = allTransactions.filter(txn => 
      ['credit', 'refund', 'cashback'].includes(txn.transactionType)
    );
    
    console.log(`   Expenses: ${expenses.length} transactions`);
    console.log(`   Credits: ${credits.length} transactions`);
    
    // Calculate totals manually
    const totalExpenses = expenses.reduce((sum, txn) => sum + txn.amount, 0);
    const totalCredits = credits.reduce((sum, txn) => sum + txn.amount, 0);
    const netFlow = totalCredits - totalExpenses;
    
    console.log('\n💰 Manual Calculations:');
    console.log(`   Total Expenses: ₹${totalExpenses}`);
    console.log(`   Total Credits: ₹${totalCredits}`);
    console.log(`   Net Flow: ₹${netFlow}`);
    
    // Calculate category-wise spending
    const categoryTotals = {};
    expenses.forEach(txn => {
      const categoryName = txn.category?.name || 'Miscellaneous';
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = {
          total: 0,
          count: 0,
          icon: txn.category?.icon || '📝',
          color: txn.category?.color || '#6B7280'
        };
      }
      categoryTotals[categoryName].total += txn.amount;
      categoryTotals[categoryName].count += 1;
    });
    
    console.log('\n📈 Category-wise Spending:');
    Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b.total - a.total)
      .forEach(([category, data], index) => {
        console.log(`   ${index + 1}. ${category}: ₹${data.total} (${data.count} transactions)`);
      });
    
    // Run the same aggregation as the backend
    console.log('\n🔬 Backend Aggregation Results:');
    
    // Total spending aggregation
    const backendTotalSpending = await Transaction.aggregate([
      { $match: { ...matchQuery, transactionType: { $in: ['debit', 'upi', 'card', 'bank_transfer'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    
    const backendSpending = backendTotalSpending[0]?.total || 0;
    console.log(`   Backend Total Expenses: ₹${backendSpending}`);
    
    // Category spending aggregation
    const backendCategorySpending = await Transaction.aggregate([
      { $match: { ...matchQuery, transactionType: { $in: ['debit', 'upi', 'card', 'bank_transfer'] } } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          category: '$categoryInfo.name',
          icon: '$categoryInfo.icon',
          color: '$categoryInfo.color',
          total: 1,
          count: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);
    
    console.log('\n📊 Backend Category Results:');
    backendCategorySpending.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.category}: ₹${item.total} (${item.count} transactions)`);
    });
    
    // Compare results
    console.log('\n🔍 Verification Results:');
    console.log('========================');
    
    const expenseMatch = Math.abs(totalExpenses - backendSpending) < 0.01;
    console.log(`✅ Total Expenses Match: ${expenseMatch ? 'YES' : 'NO'}`);
    console.log(`   Manual: ₹${totalExpenses}`);
    console.log(`   Backend: ₹${backendSpending}`);
    
    if (!expenseMatch) {
      console.log(`   Difference: ₹${Math.abs(totalExpenses - backendSpending)}`);
    }
    
    // Compare category counts
    const manualCategories = Object.keys(categoryTotals).sort();
    const backendCategories = backendCategorySpending.map(item => item.category).sort();
    
    const categoryCountMatch = manualCategories.length === backendCategories.length;
    console.log(`✅ Category Count Match: ${categoryCountMatch ? 'YES' : 'NO'}`);
    console.log(`   Manual: ${manualCategories.length} categories`);
    console.log(`   Backend: ${backendCategories.length} categories`);
    
    // Check for missing categories
    const missingInBackend = manualCategories.filter(cat => !backendCategories.includes(cat));
    const missingInManual = backendCategories.filter(cat => !manualCategories.includes(cat));
    
    if (missingInBackend.length > 0) {
      console.log(`⚠️ Categories missing in backend: ${missingInBackend.join(', ')}`);
    }
    
    if (missingInManual.length > 0) {
      console.log(`⚠️ Categories missing in manual: ${missingInManual.join(', ')}`);
    }
    
    // Show recent transactions for context
    console.log('\n📋 Recent Transactions (Last 5):');
    allTransactions.slice(0, 5).forEach((txn, index) => {
      const type = ['debit', 'upi', 'card', 'bank_transfer'].includes(txn.transactionType) ? 'EXPENSE' : 'CREDIT';
      console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ${txn.merchant} - ₹${txn.amount} (${type})`);
    });
    
  } catch (error) {
    console.error('❌ Error verifying dashboard data:', error);
  } finally {
    process.exit(0);
  }
};

verifyDashboardData();
