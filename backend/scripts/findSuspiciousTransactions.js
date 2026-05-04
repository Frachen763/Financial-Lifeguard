import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

dotenv.config();

const findSuspiciousTransactions = async () => {
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

    // Get all transactions for the user
    const allTransactions = await Transaction.find({ userId: testUser._id })
      .sort({ transactionDate: -1 });

    console.log(`\n📊 Found ${allTransactions.length} total transactions`);

    // 1. Look for exact duplicates (same amount, same date, different merchants)
    console.log('\n🔍 Looking for exact duplicates...');
    const duplicates = [];
    
    for (let i = 0; i < allTransactions.length; i++) {
      const txn1 = allTransactions[i];
      
      for (let j = i + 1; j < allTransactions.length; j++) {
        const txn2 = allTransactions[j];
        
        // Check if same amount and within 1 hour of each other
        const timeDiff = Math.abs(txn1.transactionDate - txn2.transactionDate);
        const oneHour = 60 * 60 * 1000;
        
        if (txn1.amount === txn2.amount && timeDiff <= oneHour && txn1.merchant !== txn2.merchant) {
          duplicates.push({
            transaction1: txn1,
            transaction2: txn2,
            timeDiff: timeDiff / (60 * 1000) // in minutes
          });
        }
      }
    }

    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} potential duplicate pairs:`);
      
      for (const dup of duplicates) {
        console.log(`\n📄 Duplicate Pair (${dup.timeDiff.toFixed(0)} minutes apart):`);
        console.log(`   1. "${dup.transaction1.merchant}" - ₹${dup.transaction1.amount} - ${dup.transaction1.transactionDate.toLocaleString()}`);
        console.log(`   2. "${dup.transaction2.merchant}" - ₹${dup.transaction2.amount} - ${dup.transaction2.transactionDate.toLocaleString()}`);
        console.log(`   Email IDs: ${dup.transaction1.emailId} | ${dup.transaction2.emailId}`);
      }
    } else {
      console.log('✅ No exact duplicates found');
    }

    // 2. Look for suspicious merchant names (fonts, generic terms, etc.)
    console.log('\n🔍 Looking for suspicious merchant names...');
    
    const suspiciousPatterns = [
      /helvetica|arial|times|calibri|verdana|georgia|palatino|garamond/i,
      /font|typeface|typography/i,
      /undefined|null|none|unknown/i,
      /^[a-z\s]+$/i, // Only lowercase letters and spaces
      /^\d+$/, // Only numbers
      /^.{1,2}$/, // Very short names
    ];

    const suspiciousTransactions = [];
    
    for (const txn of allTransactions) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(txn.merchant)) {
          suspiciousTransactions.push(txn);
          break;
        }
      }
    }

    if (suspiciousTransactions.length > 0) {
      console.log(`\n⚠️  Found ${suspiciousTransactions.length} suspicious transactions:`);
      
      for (const txn of suspiciousTransactions) {
        console.log(`\n📄 Suspicious Transaction:`);
        console.log(`   Merchant: "${txn.merchant}"`);
        console.log(`   Amount: ₹${txn.amount}`);
        console.log(`   Date: ${txn.transactionDate.toLocaleString()}`);
        console.log(`   Email: ${txn.emailId}`);
        console.log(`   Subject: ${txn.emailSubject}`);
      }
    } else {
      console.log('✅ No suspicious merchant names found');
    }

    // 3. Look for Zomato transactions specifically
    console.log('\n🔍 Looking for Zomato transactions...');
    const zomatoTransactions = allTransactions.filter(txn => 
      txn.merchant.toLowerCase().includes('zomato')
    );

    console.log(`\n🍔 Found ${zomatoTransactions.length} Zomato transactions:`);
    for (const txn of zomatoTransactions) {
      console.log(`   "${txn.merchant}" - ₹${txn.amount} - ${txn.transactionDate.toLocaleString()}`);
      
      // Check for other transactions with same amount around same time
      const sameAmountNearby = allTransactions.filter(other => 
        other._id.toString() !== txn._id.toString() &&
        other.amount === txn.amount &&
        Math.abs(other.transactionDate - txn.transactionDate) <= 24 * 60 * 60 * 1000 &&
        !other.merchant.toLowerCase().includes('zomato')
      );
      
      if (sameAmountNearby.length > 0) {
        console.log(`      🎯 Same amount nearby transactions:`);
        for (const other of sameAmountNearby) {
          console.log(`         - "${other.merchant}" - ${other.transactionDate.toLocaleString()}`);
        }
      }
    }

    // 4. Summary and recommendations
    console.log('\n📊 Summary:');
    console.log(`   Total transactions: ${allTransactions.length}`);
    console.log(`   Potential duplicates: ${duplicates.length}`);
    console.log(`   Suspicious merchants: ${suspiciousTransactions.length}`);
    console.log(`   Zomato transactions: ${zomatoTransactions.length}`);

    if (duplicates.length > 0 || suspiciousTransactions.length > 0) {
      console.log('\n💡 Recommendations:');
      if (duplicates.length > 0) {
        console.log('   - Review and remove duplicate transactions');
        console.log('   - Keep the one with the correct merchant name');
      }
      if (suspiciousTransactions.length > 0) {
        console.log('   - Remove transactions with font names as merchants');
        console.log('   - Check email parsing logic');
      }
      console.log('   - Run removeSuspiciousTransactions.js to clean up');
    } else {
      console.log('\n✅ Everything looks clean!');
    }

  } catch (error) {
    console.error('❌ Error finding suspicious transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

findSuspiciousTransactions();
