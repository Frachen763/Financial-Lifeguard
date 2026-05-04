import dotenv from 'dotenv';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const checkAutoCategorizeMerchants = async () => {
  try {
    console.log('🚀 Checking merchants that will be AUTO-CATEGORIZED for new transactions...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });
    
    // Get all merchants with 5+ transactions
    const merchants = await Transaction.aggregate([
      { $match: { userId: user._id } },
      { $group: { 
          _id: '$merchant', 
          count: { $sum: 1 },
          transactions: { $push: { amount: '$amount', category: '$category', transactionDate: '$transactionDate' } }
        }
      },
      { $match: { count: { $gte: 5 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log(`\n📊 Found ${merchants.length} merchants with 5+ transactions`);
    
    const autoCategorizeMerchants = [];
    const suggestMerchants = [];
    
    for (const merchant of merchants) {
      const merchantName = merchant._id;
      console.log(`\n🔍 Analyzing "${merchantName}" (${merchant.count} transactions)...`);
      
      // Get category breakdown for this merchant
      const categoryBreakdown = {};
      merchant.transactions.forEach(txn => {
        // We need to populate category to get the name
        categoryBreakdown[txn.category?.toString()] = (categoryBreakdown[txn.category?.toString()] || 0) + 1;
      });
      
      // Get actual category names
      const categoryIds = Object.keys(categoryBreakdown);
      const categoryDocs = await Category.find({ _id: { $in: categoryIds } });
      
      const categoryCounts = {};
      categoryDocs.forEach(cat => {
        const count = categoryBreakdown[cat._id.toString()];
        categoryCounts[cat.name] = count;
      });
      
      // Sort categories by count
      const sortedCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([category, count]) => ({ category, count }));
      
      const topCategory = sortedCategories[0];
      const topCategoryCount = topCategory?.count || 0;
      const topCategoryName = topCategory?.category || 'Unknown';
      
      console.log(`   Top category: ${topCategoryName} (${topCategoryCount}/${merchant.count} = ${Math.round((topCategoryCount/merchant.count)*100)}%)`);
      
      // Check Rule 2: 5+ transactions with 100% consistency
      if (merchant.count >= 5 && topCategoryCount === merchant.count && topCategoryName !== 'Miscellaneous') {
        autoCategorizeMerchants.push({
          merchant: merchantName,
          category: topCategoryName,
          transactions: merchant.count,
          confidence: 100
        });
        console.log(`   🚀 RULE 2 ACTIVE: Next transaction will be AUTO-CATEGORIZED as ${topCategoryName}`);
      }
      // Check Rule 1: 3+ transactions with >50% majority
      else if (merchant.count >= 3 && topCategoryCount > merchant.count / 2 && topCategoryName !== 'Miscellaneous') {
        suggestMerchants.push({
          merchant: merchantName,
          category: topCategoryName,
          transactions: merchant.count,
          confidence: Math.round((topCategoryCount / merchant.count) * 100)
        });
        console.log(`   ✅ Rule 1 ACTIVE: Next transaction will be SUGGESTED as ${topCategoryName}`);
      } else {
        console.log(`   ⚠️ No rule applies`);
        if (topCategoryName === 'Miscellaneous') {
          console.log(`      Reason: Top category is Miscellaneous`);
        } else if (topCategoryCount <= merchant.count / 2) {
          console.log(`      Reason: No majority (>50% needed)`);
        }
      }
      
      // Show full breakdown
      if (sortedCategories.length > 1) {
        console.log(`   📈 Full breakdown:`);
        sortedCategories.forEach(({ category, count }) => {
          const percentage = Math.round((count / merchant.count) * 100);
          console.log(`      ${category}: ${count} (${percentage}%)`);
        });
      }
    }
    
    // Summary
    console.log('\n🎯 SUMMARY:');
    console.log('===========');
    
    if (autoCategorizeMerchants.length > 0) {
      console.log(`\n🚀 AUTO-CATEGORIZE (Rule 2) - ${autoCategorizeMerchants.length} merchants:`);
      autoCategorizeMerchants.forEach((item, index) => {
        console.log(`   ${index + 1}. "${item.merchant}" → ${item.category} (${item.transactions} transactions, 100% consistency)`);
      });
    } else {
      console.log('\n🚀 AUTO-CATEGORIZE (Rule 2): No merchants qualify');
    }
    
    if (suggestMerchants.length > 0) {
      console.log(`\n💡 SUGGESTIONS (Rule 1) - ${suggestMerchants.length} merchants:`);
      suggestMerchants.forEach((item, index) => {
        console.log(`   ${index + 1}. "${item.merchant}" → ${item.category} (${item.transactions} transactions, ${item.confidence}% confidence)`);
      });
    } else {
      console.log('\n💡 SUGGESTIONS (Rule 1): No merchants qualify');
    }
    
    // Specific check for some known merchants
    console.log('\n🔍 SPECIFIC MERCHANTS:');
    console.log('=======================');
    
    const specificChecks = ['Hira Store', 'Suman Kalita', 'Zomato Limited', 'Mr Kunal Baidya', 'Google India Digital Services Pvt Ltd'];
    
    for (const merchantName of specificChecks) {
      const auto = autoCategorizeMerchants.find(m => m.merchant.toLowerCase() === merchantName.toLowerCase());
      const suggest = suggestMerchants.find(m => m.merchant.toLowerCase() === merchantName.toLowerCase());
      
      if (auto) {
        console.log(`✅ "${merchantName}" → AUTO-CATEGORIZED as ${auto.category}`);
      } else if (suggest) {
        console.log(`💡 "${merchantName}" → SUGGESTED as ${suggest.category} (${suggest.confidence}% confidence)`);
      } else {
        console.log(`❌ "${merchantName}" → No auto-categorization or suggestion`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking auto-categorize merchants:', error);
  } finally {
    process.exit(0);
  }
};

checkAutoCategorizeMerchants();
