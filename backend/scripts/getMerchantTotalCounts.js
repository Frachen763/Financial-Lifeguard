import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const getMerchantTotalCounts = async () => {
  try {
    console.log('🔍 Getting total transaction counts for all merchants');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Get all transactions grouped by merchant
    const merchantCounts = await Transaction.aggregate([
      { $match: { userId: user._id } },
      { $group: { 
          _id: '$merchant', 
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          latestDate: { $max: '$transactionDate' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);
    
    console.log('\n📊 Merchant Transaction Counts (All Time):');
    console.log('=====================================');
    
    merchantCounts.forEach((merchant, index) => {
      console.log(`${index + 1}. "${merchant._id}": ${merchant.count} transactions`);
      console.log(`   Total amount: ₹${merchant.totalAmount}`);
      console.log(`   Latest transaction: ${merchant.latestDate.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    // Check specific merchant
    const targetMerchant = 'frachen borgohain';
    const targetData = merchantCounts.find(m => m._id.toLowerCase().includes(targetMerchant.toLowerCase()));
    
    if (targetData) {
      console.log(`🎯 Found "${targetMerchant}":`);
      console.log(`   Total transactions: ${targetData.count}`);
      console.log(`   Total amount: ₹${targetData.totalAmount}`);
      console.log(`   Latest: ${targetData.latestDate.toISOString().split('T')[0]}`);
    } else {
      console.log(`❌ "${targetMerchant}" not found`);
    }
    
    // Return as object for easy lookup
    const countsObject = {};
    merchantCounts.forEach(merchant => {
      countsObject[merchant._id] = merchant.count;
    });
    
    console.log('\n📋 Counts object for frontend:');
    console.log(JSON.stringify(countsObject, null, 2));
    
  } catch (error) {
    console.error('❌ Error getting merchant counts:', error);
  } finally {
    process.exit(0);
  }
};

getMerchantTotalCounts();
