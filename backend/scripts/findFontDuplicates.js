import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

dotenv.config();

const findFontDuplicates = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    console.log('✅ Connected to MongoDB');

    // Get a test user
    const testUser = await User.findOne();
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }
    console.log(`👤 Analyzing transactions for user: ${testUser.email}`);

    // Common font names that might be extracted as merchants
    const fontNames = [
      'Helvetica Neue', 'Arial', 'Times New Roman', 'Calibri', 'Verdana', 
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact', 'Lucida Console',
      'Tahoma', 'Courier New', 'Optima', 'Futura', 'Baskerville'
    ];

    // Find transactions with font names as merchants
    const fontTransactions = await Transaction.find({
      userId: testUser._id,
      merchant: { $in: fontNames }
    }).sort({ transactionDate: -1 });

    console.log(`\n🔍 Found ${fontTransactions.length} transactions with font names as merchants:`);

    for (const txn of fontTransactions) {
      console.log(`\n📄 Font Transaction:`);
      console.log(`   ID: ${txn._id}`);
      console.log(`   Merchant: "${txn.merchant}"`);
      console.log(`   Amount: ₹${txn.amount}`);
      console.log(`   Date: ${txn.transactionDate.toLocaleDateString()}`);
      console.log(`   Email: ${txn.emailId}`);
      console.log(`   Subject: ${txn.emailSubject}`);
      console.log(`   Description: ${txn.description || 'None'}`);

      // Look for potential duplicates with same amount and date
      const potentialDuplicates = await Transaction.find({
        userId: testUser._id,
        _id: { $ne: txn._id },
        amount: txn.amount,
        transactionDate: {
          $gte: new Date(txn.transactionDate.getTime() - 24 * 60 * 60 * 1000), // within 24 hours
          $lte: new Date(txn.transactionDate.getTime() + 24 * 60 * 60 * 1000)
        },
        merchant: { $nin: fontNames } // Exclude other font transactions
      }).sort({ transactionDate: -1 });

      if (potentialDuplicates.length > 0) {
        console.log(`\n🎯 Potential Duplicates (${potentialDuplicates.length}):`);
        for (const dup of potentialDuplicates) {
          console.log(`   - "${dup.merchant}" - ₹${dup.amount} - ${dup.transactionDate.toLocaleDateString()}`);
        }
      } else {
        console.log(`\n❓ No obvious duplicates found`);
      }
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Font name transactions: ${fontTransactions.length}`);
    
    if (fontTransactions.length > 0) {
      console.log(`\n⚠️  These font-name transactions should probably be removed.`);
      console.log(`💡 Run the removeFontDuplicates.js script to clean them up.`);
    } else {
      console.log(`✅ No font-name transactions found!`);
    }

  } catch (error) {
    console.error('❌ Error finding font duplicates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

findFontDuplicates();
