import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const checkMerchantTransactions = async (merchantName) => {
  try {
    console.log(`🔍 Checking transactions for merchant: "${merchantName}"`);
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 Searching for transactions of user: ${user.email}`);
    
    // Find all transactions for this merchant (case-insensitive)
    const transactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') }
    }).sort({ transactionDate: -1 });
    
    console.log(`\n📊 Found ${transactions.length} transactions for "${merchantName}":`);
    
    if (transactions.length === 0) {
      console.log('   No transactions found for this merchant.');
      return;
    }
    
    let totalAmount = 0;
    transactions.forEach((txn, index) => {
      totalAmount += txn.amount;
      console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} (${txn.transactionType})`);
      console.log(`      Email: ${txn.emailSubject || 'No subject'}`);
      console.log(`      Payment: ${txn.paymentMethod || 'Not specified'}`);
      if (txn.accountNumber) {
        console.log(`      Account: ${txn.accountNumber}`);
      }
      console.log('');
    });
    
    console.log(`💰 Total amount spent: ₹${totalAmount}`);
    console.log(`📅 Date range: ${transactions[transactions.length - 1].transactionDate.toISOString().split('T')[0]} to ${transactions[0].transactionDate.toISOString().split('T')[0]}`);
    
    // Show category breakdown if available
    const categoryBreakdown = {};
    transactions.forEach(txn => {
      const category = txn.category || 'Uncategorized';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    });
    
    console.log('\n📈 Category breakdown:');
    Object.entries(categoryBreakdown).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} transactions`);
    });
    
  } catch (error) {
    console.error('❌ Error checking merchant transactions:', error);
  } finally {
    process.exit(0);
  }
};

// Get merchant name from command line argument
const merchantName = process.argv[2];
if (!merchantName) {
  console.log('❌ Please provide a merchant name as argument');
  console.log('Usage: node checkMerchantTransactions.js "Merchant Name"');
  process.exit(1);
}

checkMerchantTransactions(merchantName);
