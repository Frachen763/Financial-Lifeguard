import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkTodaysTransactions = async () => {
  try {
    console.log('📅 Checking today\'s transactions (April 26, 2026)...');
    
    // Connect to database
    await connectDB();
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Get today's transactions
    const today = new Date('2026-04-26');
    const tomorrow = new Date('2026-04-27');
    
    const todaysTransactions = await Transaction.find({
      userId: user._id,
      transactionDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('category', 'name icon color')
      .populate('categorySuggestion.suggestedCategory', 'name icon color')
      .sort({ transactionDate: -1 });
    
    console.log(`\n📊 Found ${todaysTransactions.length} transactions for today (April 26, 2026):`);
    
    if (todaysTransactions.length === 0) {
      console.log('   No transactions found for today.');
    } else {
      todaysTransactions.forEach((txn, index) => {
        const categoryName = txn.category ? txn.category.name : 'No Category';
        const categoryIcon = txn.category ? txn.category.icon : '';
        const suggestion = txn.categorySuggestion ? ` (💡 suggests: ${txn.categorySuggestion.suggestedCategory.name})` : '';
        
        console.log(`\n  ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
        console.log(`     Time: ${txn.transactionDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`     Category: ${categoryName} ${categoryIcon}${suggestion}`);
        console.log(`     Payment Method: ${txn.paymentMethod}`);
        console.log(`     Type: ${txn.transactionType}`);
        if (txn.accountNumber) {
          console.log(`     Account: ****${txn.accountNumber.slice(-4)}`);
        }
        if (txn.bankName) {
          console.log(`     Bank: ${txn.bankName}`);
        }
      });
      
      // Calculate total
      const totalDebit = todaysTransactions
        .filter(txn => txn.transactionType === 'debit')
        .reduce((sum, txn) => sum + txn.amount, 0);
      
      const totalCredit = todaysTransactions
        .filter(txn => txn.transactionType === 'credit')
        .reduce((sum, txn) => sum + txn.amount, 0);
      
      console.log(`\n💰 Today's Summary:`);
      console.log(`   Total Debit: ₹${totalDebit}`);
      console.log(`   Total Credit: ₹${totalCredit}`);
      console.log(`   Net: ${totalCredit > totalDebit ? '+' : ''}₹${totalCredit - totalDebit}`);
    }
    
    console.log('\n✅ Check completed!');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkTodaysTransactions();
