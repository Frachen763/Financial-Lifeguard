import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const checkMerchantNameVariations = async () => {
  try {
    console.log('🔍 Checking merchant name variations...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Get all transactions with merchant names
    const transactions = await Transaction.find({ userId: user._id })
      .select('merchant')
      .sort({ merchant: 1 });
    
    // Group by exact merchant name
    const exactGroups = {};
    transactions.forEach(txn => {
      const merchant = txn.merchant || 'Unknown';
      exactGroups[merchant] = (exactGroups[merchant] || 0) + 1;
    });
    
    console.log('\n📊 Exact Merchant Names:');
    console.log('========================');
    
    Object.entries(exactGroups)
      .sort(([,a], [,b]) => b - a)
      .forEach(([merchant, count]) => {
        console.log(`"${merchant}": ${count} transactions`);
      });
    
    // Find potential variations (case-insensitive grouping)
    const caseInsensitiveGroups = {};
    Object.keys(exactGroups).forEach(merchant => {
      const key = merchant.toLowerCase();
      if (!caseInsensitiveGroups[key]) {
        caseInsensitiveGroups[key] = [];
      }
      caseInsensitiveGroups[key].push({ name: merchant, count: exactGroups[merchant] });
    });
    
    console.log('\n🔍 Potential Case Variations:');
    console.log('==============================');
    
    Object.entries(caseInsensitiveGroups).forEach(([lowerName, variations]) => {
      if (variations.length > 1) {
        const totalCount = variations.reduce((sum, v) => sum + v.count, 0);
        console.log(`\n"${lowerName}" has ${variations.length} variations (${totalCount} total):`);
        variations.forEach(v => {
          console.log(`  "${v.name}": ${v.count} transactions`);
        });
        console.log(`  💡 Should be merged to show: ${totalCount} total`);
      }
    });
    
    // Check for specific merchants mentioned
    console.log('\n🎯 Checking Specific Merchants:');
    console.log('=================================');
    
    const specificMerchants = ['frachen borgohain', 'Frachen Borgohain', 'Hira Store', 'Suman Kalita'];
    
    specificMerchants.forEach(merchant => {
      const count = exactGroups[merchant] || 0;
      console.log(`"${merchant}": ${count} transactions`);
    });
    
    // Show some example transactions for debugging
    console.log('\n📋 Sample Transactions:');
    console.log('=======================');
    
    const sampleTransactions = await Transaction.find({ userId: user._id })
      .select('merchant amount transactionDate')
      .sort({ transactionDate: -1 })
      .limit(10);
    
    sampleTransactions.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - "${txn.merchant}" - ₹${txn.amount}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking merchant name variations:', error);
  } finally {
    process.exit(0);
  }
};

checkMerchantNameVariations();
