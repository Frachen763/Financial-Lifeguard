import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';

dotenv.config();

const checkTransactionTypes = async () => {
  try {
    console.log('🔍 Checking transaction types in database...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all transactions
    const transactions = await Transaction.find()
      .populate('category', 'name')
      .sort({ transactionDate: -1 })
      .limit(20);

    if (transactions.length === 0) {
      console.log('❌ No transactions found in database');
      process.exit(0);
    }

    console.log(`📊 Found ${transactions.length} transactions (showing last 20):\n`);
    console.log('═'.repeat(100));

    transactions.forEach((txn, index) => {
      console.log(`\n${index + 1}. Transaction Details:`);
      console.log(`   Date: ${txn.transactionDate.toLocaleDateString()}`);
      console.log(`   Merchant: ${txn.merchant}`);
      console.log(`   Amount: ₹${txn.amount}`);
      console.log(`   Transaction Type: ${txn.transactionType} ⬅️ THIS IS KEY`);
      console.log(`   Payment Method: ${txn.paymentMethod}`);
      console.log(`   Category: ${txn.category?.name || 'Unknown'}`);
      console.log(`   Email ID: ${txn.emailId ? 'Yes' : 'No'}`);
      console.log(`   Is Manual: ${txn.isManual}`);
    });

    console.log('\n' + '═'.repeat(100));

    // Count by transaction type
    const typeCounts = await Transaction.aggregate([
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📈 Transaction Type Summary:');
    console.log('═'.repeat(100));
    typeCounts.forEach(type => {
      console.log(`   ${type._id.toUpperCase()}: ${type.count} transactions, Total: ₹${type.totalAmount.toFixed(2)}`);
    });

    console.log('\n' + '═'.repeat(100));
    console.log('\n🔍 Analysis:');
    console.log('═'.repeat(100));

    const creditCount = typeCounts.find(t => t._id === 'credit')?.count || 0;
    const debitCount = typeCounts.find(t => t._id === 'debit')?.count || 0;
    const upiCount = typeCounts.find(t => t._id === 'upi')?.count || 0;
    const cardCount = typeCounts.find(t => t._id === 'card')?.count || 0;

    console.log(`\n✅ EXPENSE transactions (counted in dashboard):`);
    console.log(`   - debit: ${debitCount}`);
    console.log(`   - upi: ${upiCount}`);
    console.log(`   - card: ${cardCount}`);
    console.log(`   Total expenses: ${debitCount + upiCount + cardCount}`);

    console.log(`\n❌ INCOME transactions (NOT counted in dashboard):`);
    console.log(`   - credit: ${creditCount}`);

    console.log('\n' + '═'.repeat(100));

    if (creditCount > 0 && (debitCount + upiCount + cardCount) === 0) {
      console.log('\n⚠️  ISSUE FOUND:');
      console.log('   All transactions are type "credit" (income)');
      console.log('   Dashboard shows ₹0 because there are no EXPENSE transactions');
      console.log('\n💡 SOLUTION:');
      console.log('   The email parser is incorrectly marking all transactions as "credit"');
      console.log('   Need to check the email content to determine if it\'s actually income or expense');
    } else if ((debitCount + upiCount + cardCount) > 0) {
      console.log('\n✅ You have expense transactions!');
      console.log('   Dashboard should be showing data.');
      console.log('   If not, try refreshing the page or check date filters.');
    }

    console.log('\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkTransactionTypes();
