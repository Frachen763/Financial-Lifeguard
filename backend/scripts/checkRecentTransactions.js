import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';

dotenv.config();

const checkRecentTransactions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    
    // Get last 10 transactions to see the pattern
    const recentTransactions = await Transaction.find({ userId })
      .sort({ transactionDate: -1 })
      .limit(10)
      .populate('category', 'name');
    
    console.log('📊 Last 10 Transactions in Database:');
    recentTransactions.forEach((txn, index) => {
      console.log(`${index + 1}. Date: ${txn.transactionDate.toISOString().split('T')[0]}, Merchant: ${txn.merchant}, Amount: ${txn.amount}`);
    });
    
    // Check specifically for April 22, 2026 transactions
    const april22Transactions = await Transaction.find({ 
      userId,
      transactionDate: {
        $gte: new Date('2026-04-22'),
        $lt: new Date('2026-04-23')
      }
    }).populate('category', 'name');
    
    console.log(`\n📅 April 22, 2026 Transactions (${april22Transactions.length} found):`);
    april22Transactions.forEach((txn, index) => {
      console.log(`${index + 1}. Merchant: ${txn.merchant}, Amount: ${txn.amount}, Category: ${txn.category?.name || 'Uncategorized'}`);
    });
    
    // Check for March 22, 2026 transactions
    const march22Transactions = await Transaction.find({ 
      userId,
      transactionDate: {
        $gte: new Date('2026-03-22'),
        $lt: new Date('2026-03-23')
      }
    }).populate('category', 'name');
    
    console.log(`\n📅 March 22, 2026 Transactions (${march22Transactions.length} found):`);
    march22Transactions.forEach((txn, index) => {
      console.log(`${index + 1}. Merchant: ${txn.merchant}, Amount: ${txn.amount}, Category: ${txn.category?.name || 'Uncategorized'}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

checkRecentTransactions();
