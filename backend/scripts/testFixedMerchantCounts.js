import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const testFixedMerchantCounts = async () => {
  try {
    console.log('🧪 Testing fixed merchant counts (case-insensitive)...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Test the new aggregation (same as the API)
    const merchantCounts = await Transaction.aggregate([
      { $match: { userId: user._id } },
      { $group: { 
          _id: { $toLower: '$merchant' }, // Group by lowercase merchant name
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          latestDate: { $max: '$transactionDate' },
          originalNames: { $addToSet: '$merchant' }, // Keep track of original name variations
          firstSeenName: { $first: '$merchant' } // Use the first encountered name as display name
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Fixed Merchant Counts (Case-Insensitive):');
    console.log('==============================================');
    
    merchantCounts.slice(0, 15).forEach((merchant, index) => {
      console.log(`${index + 1}. "${merchant._id}" (merged from ${merchant.originalNames.length} variations): ${merchant.count} transactions`);
      if (merchant.originalNames.length > 1) {
        console.log(`   Variations: ${merchant.originalNames.join(', ')}`);
      }
      console.log(`   Display name: "${merchant.firstSeenName}"`);
      console.log(`   Total amount: ₹${merchant.totalAmount}`);
      console.log('');
    });
    
    // Check specific merchants
    console.log('🎯 Specific Merchants Check:');
    console.log('============================');
    
    const frachenData = merchantCounts.find(m => m._id.includes('frachen') || m._id.includes('borgohain'));
    const zomatoData = merchantCounts.find(m => m._id.includes('zomato'));
    
    if (frachenData) {
      console.log(`✅ Frachen Borgohain (all variations merged): ${frachenData.count} transactions`);
      console.log(`   Variations: ${frachenData.originalNames.join(', ')}`);
    } else {
      console.log('❌ Frachen Borgohain not found');
    }
    
    if (zomatoData) {
      console.log(`✅ Zomato (all variations merged): ${zomatoData.count} transactions`);
      console.log(`   Variations: ${zomatoData.originalNames.join(', ')}`);
    } else {
      console.log('❌ Zomato not found');
    }
    
    // Create the counts object for frontend
    const countsObject = {};
    merchantCounts.forEach(merchant => {
      countsObject[merchant._id] = merchant.count;
    });
    
    console.log('\n📋 Frontend Counts Object:');
    console.log('==========================');
    
    // Show a few key examples
    const examples = ['frachen borgohain', 'zomato limited', 'hira store', 'suman kalita'];
    examples.forEach(merchant => {
      const count = countsObject[merchant.toLowerCase()] || 0;
      console.log(`"${merchant}": ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing fixed merchant counts:', error);
  } finally {
    process.exit(0);
  }
};

testFixedMerchantCounts();
