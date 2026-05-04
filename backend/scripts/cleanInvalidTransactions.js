import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const cleanInvalidTransactions = async () => {
  try {
    console.log('🧹 Cleaning invalid transactions...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Find transactions with invalid merchant names (HTML/XML content)
    const invalidPatterns = [
      /html|xml|xhtml|doctype|w3c|dtd/i,
      /public|transitional|en|noindex|nofollow|noarchive/i,
      /\/\/w3c/i,
      /^["']|["']$/i,
    ];
    
    // Find all transactions that match invalid patterns
    const invalidTransactions = await Transaction.find({
      $or: invalidPatterns.map(pattern => ({
        merchant: { $regex: pattern }
      }))
    });
    
    console.log(`📊 Found ${invalidTransactions.length} invalid transactions`);
    
    if (invalidTransactions.length > 0) {
      // Display the invalid transactions
      console.log('\n📋 Invalid transactions to be removed:');
      invalidTransactions.forEach(txn => {
        console.log(`  - ${txn.transactionDate.toISOString().split('T')[0]}: ₹${txn.amount} to "${txn.merchant}"`);
      });
      
      // Remove them
      const result = await Transaction.deleteMany({
        $or: invalidPatterns.map(pattern => ({
          merchant: { $regex: pattern }
        }))
      });
      
      console.log(`\n✅ Removed ${result.deletedCount} invalid transactions`);
    } else {
      console.log('✅ No invalid transactions found');
    }
    
    // Also check for transactions with very low amounts (like ₹2) that might be parsing errors
    const suspiciousTransactions = await Transaction.find({
      amount: { $lt: 10 }
    });
    
    console.log(`\n📊 Found ${suspiciousTransactions.length} transactions with amount < ₹10`);
    
    if (suspiciousTransactions.length > 0) {
      console.log('\n📋 Suspicious transactions (review these manually):');
      suspiciousTransactions.forEach(txn => {
        console.log(`  - ${txn.transactionDate.toISOString().split('T')[0]}: ₹${txn.amount} to "${txn.merchant}"`);
      });
    }
    
    console.log('\n✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

cleanInvalidTransactions();
