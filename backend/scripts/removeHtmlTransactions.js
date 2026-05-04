import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

dotenv.config();

const removeHtmlTransactions = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27091/financial-lifeguard');
    console.log('✅ Connected to MongoDB');

    const testUser = await User.findOne();
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }
    console.log(`👤 Cleaning HTML transactions for user: ${testUser.email}`);

    // Define patterns for HTML/XML content
    const htmlPatterns = [
      /html|xml|xhtml|doctype|w3c|dtd/i,
      /public|transitional|en|noindex|nofollow|noarchive/i,
      /<[^>]*>/i, // HTML tags
      /\/\/w3c/i, // W3C doctype
      /^["']|["']$/i, // Starting or ending with quotes
    ];

    const allTransactions = await Transaction.find({ userId: testUser._id });
    const toRemove = [];

    for (const txn of allTransactions) {
      for (const pattern of htmlPatterns) {
        if (pattern.test(txn.merchant)) {
          toRemove.push(txn);
          break;
        }
      }
    }

    console.log(`\n🗑️  Found ${toRemove.length} HTML/XML transactions to remove:`);

    if (toRemove.length === 0) {
      console.log('✅ No HTML transactions found!');
      return;
    }

    // Show what will be removed
    for (const txn of toRemove) {
      console.log(`\n📄 Transaction to remove:`);
      console.log(`   ID: ${txn._id}`);
      console.log(`   Merchant: "${txn.merchant}"`);
      console.log(`   Amount: ₹${txn.amount}`);
      console.log(`   Date: ${txn.transactionDate.toLocaleString()}`);
      console.log(`   Email: ${txn.emailId}`);
      console.log(`   Subject: ${txn.emailSubject}`);
    }

    console.log('\n⚠️  WARNING: These are clearly parsing errors and should be removed!');
    console.log('💡 Uncomment the deletion code below to actually remove them.');

    /*
    // Uncomment this section to actually delete the transactions
    console.log('\n🗑️  Deleting HTML transactions...');
    
    const deleteResults = await Promise.all(
      toRemove.map(txn => Transaction.findByIdAndDelete(txn._id))
    );

    console.log(`✅ Successfully deleted ${deleteResults.length} HTML transactions!`);
    
    // Show remaining transactions
    const remainingCount = await Transaction.countDocuments({ userId: testUser._id });
    console.log(`📊 Remaining transactions: ${remainingCount}`);
    
    // Show remaining clean transactions
    const remainingTransactions = await Transaction.find({ userId: testUser._id });
    console.log('\n📋 Remaining transactions:');
    for (const txn of remainingTransactions) {
      console.log(`   "${txn.merchant}" - ₹${txn.amount} - ${txn.transactionDate.toLocaleDateString()}`);
    }
    */

  } catch (error) {
    console.error('❌ Error removing HTML transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

removeHtmlTransactions();
