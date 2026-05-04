import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

dotenv.config();

const checkSpecificTransaction = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27091/financial-lifeguard');
    console.log('✅ Connected to MongoDB');

    // Get a test user
    const testUser = await User.findOne();
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }

    // Use raw MongoDB collection to see exact data
    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');

    // Find "Pakash Store" transaction
    const pakashStoreTxn = await transactionsCollection
      .find({
        userId: testUser._id,
        merchant: { $regex: /pakash/i }
      })
      .toArray();

    console.log(`🔍 Found ${pakashStoreTxn.length} "Pakash Store" transactions:`);
    
    pakashStoreTxn.forEach((txn, index) => {
      console.log(`\n${index + 1}. Merchant: "${txn.merchant}"`);
      console.log(`   Category: ${txn.category || 'NULL'}`);
      console.log(`   Category Type: ${typeof txn.category}`);
      console.log(`   Full transaction:`, JSON.stringify(txn, null, 2));
    });

    // Also check with Mongoose model
    console.log('\n🔍 Checking with Mongoose model:');
    const mongooseTxn = await Transaction.findOne({
      userId: testUser._id,
      merchant: { $regex: /pakash/i }
    }).populate('category', 'name icon color');

    if (mongooseTxn) {
      console.log('Mongoose result:');
      console.log(`   Merchant: "${mongooseTxn.merchant}"`);
      console.log(`   Category:`, mongooseTxn.category);
    } else {
      console.log('No transaction found with Mongoose');
    }

    // Let's also check what the API would return
    console.log('\n🔍 Simulating API call:');
    const apiResult = await Transaction.find({
      userId: testUser._id,
      merchant: { $regex: /store/i }
    })
    .populate('category', 'name icon color')
    .limit(5);

    console.log('API would return:');
    apiResult.forEach((txn, index) => {
      console.log(`${index + 1}. "${txn.merchant}" -> category:`, txn.category);
    });

  } catch (error) {
    console.error('❌ Error checking transaction:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

checkSpecificTransaction();
